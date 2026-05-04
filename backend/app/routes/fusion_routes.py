from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from typing import List
import json
import uuid
import shutil
import numpy as np
import cv2
import os
from pathlib import Path

from app.model.transformer import predict_style_transfer, STYLE_NAMES, TARGET_FRAMES, normalize_style_name
from app.model.loader import predict_dance
from app.services.audio_utils import extract_audio
from app.services.drive_paths import COMPLETED_DIR
from app.services.blender_renderer import render_blender_avatar
from app.routes.transform import get_pose_extractor, normalize_sequence_length, UPLOAD_DIR

router = APIRouter(prefix="/api", tags=["Fusion"])

# --------------------------------------------------
# Helper Functions
# --------------------------------------------------

def validate_fusion_request(target_styles: List[str], ratios: List[float]):
    if not target_styles or not ratios:
        raise HTTPException(status_code=400, detail="Must provide at least one target style and ratio.")
    
    if len(target_styles) != len(ratios):
        raise HTTPException(status_code=400, detail="Number of target styles must equal number of ratios.")
    
    if not np.isclose(sum(ratios), 1.0):
        raise HTTPException(status_code=400, detail="Fusion ratios must sum to 1.0")
        
    normalized_styles = []
    for s in target_styles:
        norm_s = normalize_style_name(s)
        if norm_s is None or norm_s not in STYLE_NAMES:
            raise HTTPException(status_code=400, detail=f"Invalid style: {s}. Choose from {STYLE_NAMES}")
        normalized_styles.append(norm_s)
        
    return normalized_styles

def detect_original_style(pose_sequence):
    seq_expanded = np.expand_dims(pose_sequence, axis=0)
    try:
        style_name, confidence = predict_dance(seq_expanded)
        return style_name, confidence
    except Exception as e:
        print(f"Warning: Style detection failed: {e}")
        return "Unknown", 0.0

def transform_to_style(pose_sequence, target_style):
    return predict_style_transfer(pose_sequence, target_style)

def weighted_delta_fusion(base_motion, transformed_motions, ratios):
    """
    fused_motion = base_motion + Σ(ratio_i * (style_motion_i - base_motion))
    """
    fused_motion = np.copy(base_motion)
    for motion, ratio in zip(transformed_motions, ratios):
        delta = motion - base_motion
        fused_motion += ratio * delta
    return fused_motion

def weighted_absolute_fusion(transformed_motions, ratios):
    """
    fused_motion = Σ(ratio_i * style_motion_i)
    """
    fused_motion = np.zeros_like(transformed_motions[0])
    for motion, ratio in zip(transformed_motions, ratios):
        fused_motion += ratio * motion
    return fused_motion

def correct_fused_motion(fused_motion):
    """ Apply post-fusion corrections (NaN checks, simple smoothing) """
    if np.isnan(fused_motion).any():
        print("Warning: NaN detected in fused motion. Replacing with 0.")
        fused_motion = np.nan_to_num(fused_motion)
        
    # Temporal smoothing (Moving Average)
    window_size = 5
    smoothed = np.copy(fused_motion)
    
    # Pad the sequence for smoothing
    pad_width = window_size // 2
    padded = np.pad(fused_motion, ((pad_width, pad_width), (0, 0)), mode='edge')
    
    for i in range(len(fused_motion)):
        smoothed[i] = np.mean(padded[i:i+window_size], axis=0)
        
    return smoothed

def process_fusion_render_job(job_id: str, pose_npy_path: str, audio_path: str, fps: float):
    try:
        job_dir = COMPLETED_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        output_video_path = str(job_dir / "final_output.mp4")

        render_blender_avatar(
            pose_npy_path,
            audio_path,
            output_video_path,
            fps=fps
        )

        print(f"Fusion render completed successfully: {output_video_path}")

    except Exception as e:
        print(f"Background fusion render failed for job {job_id}: {e}")
        from app.services.drive_paths import FAILED_DIR
        failed_dir = FAILED_DIR / job_id
        failed_dir.mkdir(parents=True, exist_ok=True)
        with open(failed_dir / "error.log", "w") as f:
            f.write(str(e))

# --------------------------------------------------
# Main Endpoint
# --------------------------------------------------
@router.post("/fusion-transform")
async def fusion_transform_pipeline(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    target_styles: str = Form(...),
    ratios: str = Form(...)
):
    try:
        # 1. Parse JSON inputs
        try:
            target_styles_list = json.loads(target_styles)
            ratios_list = json.loads(ratios)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="target_styles and ratios must be valid JSON lists.")
            
        # Validate inputs
        validated_styles = validate_fusion_request(target_styles_list, ratios_list)
        
        print("="*40)
        print("FUSION PIPELINE STARTED")
        print(f"Target Styles: {validated_styles}")
        print(f"Ratios: {ratios_list}")

        # Setup job paths
        job_id = str(uuid.uuid4())
        upload_path = UPLOAD_DIR / f"{job_id}_{file.filename}"

        with open(upload_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        audio_path = UPLOAD_DIR / f"{job_id}.m4a"
        extract_audio(str(upload_path), str(audio_path))

        # 2. Extract pose sequence
        extractor = get_pose_extractor()
        raw_poses, fps = extractor.extract_poses_from_video(str(upload_path))

        if len(raw_poses) == 0:
            raise HTTPException(status_code=400, detail="No pose detected in video.")
            
        print(f"Input frame count: {len(raw_poses)}")
        print(f"Input pose shape: {raw_poses.shape}")

        # Normalize and resample
        base_motion = normalize_sequence_length(raw_poses, TARGET_FRAMES)
        
        # 3. Detect original dance style
        orig_style, confidence = detect_original_style(base_motion)
        print(f"Detected original style: {orig_style} ({confidence:.2f})")

        # 4. Generate one transformed motion per target style
        transformed_motions = []
        for style in validated_styles:
            motion = transform_to_style(base_motion, style)
            transformed_motions.append(motion)
            print(f"Transformed motion shape ({style}): {motion.shape}")

        # 5. & 6. Implement weighted delta fusion
        try:
            fused_motion = weighted_delta_fusion(base_motion, transformed_motions, ratios_list)
            print("Delta fusion successful.")
        except Exception as e:
            print(f"Delta fusion failed: {e}. Falling back to absolute fusion.")
            fused_motion = weighted_absolute_fusion(transformed_motions, ratios_list)

        print(f"Fused motion shape: {fused_motion.shape}")

        # 7. Apply post-fusion correction
        corrected_motion = correct_fused_motion(fused_motion)
        print(f"Final corrected motion shape: {corrected_motion.shape}")
        print(f"FPS: {fps}")
        print(f"Final duration: {len(corrected_motion) / fps:.2f} seconds")

        # 9. Connect fusion output to Blender
        pose_npy_path = str(UPLOAD_DIR / f"{job_id}_fusion_pose.npy")
        np.save(pose_npy_path, corrected_motion)

        background_tasks.add_task(
            process_fusion_render_job,
            job_id,
            pose_npy_path,
            str(audio_path),
            fps
        )
        
        print("FUSION PIPELINE QUEUED")
        print("="*40)

        # 10. Return Response
        return {
            "success": True,
            "original_style": orig_style,
            "confidence": confidence,
            "fusion_styles": validated_styles,
            "ratios": ratios_list,
            "job_id": job_id,
            "status": "processing",
            "output_video": f"outputs/{job_id}/final_output.mp4"
        }

    except HTTPException:
        raise
    except Exception as e:
        print("Fusion Transform error:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Fusion Transform failed: {str(e)}"
        )
