from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from pathlib import Path
import uuid

from app.model.transformer import predict_style_transfer, STYLE_NAMES, TARGET_FRAMES

router = APIRouter()

# ------------------------------------------------------------------
# Directories
# ------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# ------------------------------------------------------------------
# MediaPipe Pose Setup
# ------------------------------------------------------------------
POSE_MODEL_PATH = BASE_DIR / "Models" / "pose_landmarker_full.task"

class PoseExtractor:
    def __init__(self, model_path):
        base_options = python.BaseOptions(model_asset_path=str(model_path))
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            output_segmentation_masks=False,
            num_poses=1
        )
        self.detector = vision.PoseLandmarker.create_from_options(options)

    def extract_poses_from_video(self, video_path):
        cap = cv2.VideoCapture(str(video_path))
        poses = []
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps is None or fps <= 0:
            fps = 30

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb_frame
            )

            result = self.detector.detect(mp_image)

            if result.pose_landmarks:
                landmarks = result.pose_landmarks[0]
                pose_vector = []
                for lm in landmarks:
                    pose_vector.extend([lm.x, lm.y, lm.z])
                poses.append(pose_vector)
            else:
                poses.append(poses[-1] if poses else [0.0] * 99)

        cap.release()
        return np.array(poses), fps


pose_extractor = PoseExtractor(POSE_MODEL_PATH)

# ------------------------------------------------------------------
# Utilities
# ------------------------------------------------------------------
def normalize_sequence_length(poses, target_frames):
    if len(poses) > target_frames:
        idx = np.linspace(0, len(poses) - 1, target_frames, dtype=int)
        return poses[idx]
    elif len(poses) < target_frames:
        pad = np.repeat([poses[-1]], target_frames - len(poses), axis=0)
        return np.vstack([poses, pad])
    return poses


def draw_skeleton(frame, landmarks, connections, color=(0, 255, 0)):
    h, w = frame.shape[:2]

    for lm in landmarks:
        x, y = int(lm[0] * w), int(lm[1] * h)
        if 0 <= x < w and 0 <= y < h:
            cv2.circle(frame, (x, y), 5, color, -1)

    for s, e in connections:
        sx, sy = int(landmarks[s][0] * w), int(landmarks[s][1] * h)
        ex, ey = int(landmarks[e][0] * w), int(landmarks[e][1] * h)

        if 0 <= sx < w and 0 <= sy < h and 0 <= ex < w and 0 <= ey < h:
            cv2.line(frame, (sx, sy), (ex, ey), color, 3)

    return frame


def generate_skeleton_video(
    pose_sequence,
    output_path,
    fps,
    frame_size=(640, 480)
):
    if len(pose_sequence) == 0:
        raise ValueError("Pose sequence is empty. Cannot generate video.")

    connections = [
        (11, 12),
        (11, 13), (13, 15),
        (12, 14), (14, 16),
        (11, 23), (12, 24), (23, 24),
        (23, 25), (25, 27),
        (24, 26), (26, 28)
    ]

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(
        str(output_path),
        fourcc,
        fps,
        frame_size
    )

    if not out.isOpened():
        raise RuntimeError("❌ VideoWriter failed to open")

    for pose in pose_sequence:
        frame = np.zeros((frame_size[1], frame_size[0], 3), dtype=np.uint8)
        frame[:] = (20, 20, 20)

        landmarks = pose.reshape(-1, 3)[:, :2]
        frame = draw_skeleton(frame, landmarks, connections)

        out.write(frame)

    out.release()

# ------------------------------------------------------------------
# Style Normalization (🔥 FIX)
# ------------------------------------------------------------------
STYLE_ALIASES = {
    "hiphop": "HipHop",
    "hip hop": "HipHop",
    "hip-hop": "HipHop",
    "kandyan": "Kandyan",
    "contemporary": "Contemporary"
}

def normalize_style(style: str) -> str:
    if not style:
        return ""
    key = style.strip().lower()
    return STYLE_ALIASES.get(key, style.strip())

# ------------------------------------------------------------------
# API
# ------------------------------------------------------------------
@router.post("/transform")
async def transform_video(
    file: UploadFile = File(...),
    target_style: str = "HipHop"
):
    try:
        # 🔥 Normalize style
        target_style = normalize_style(target_style)
        print(f"Received target_style → {target_style}")

        if target_style not in STYLE_NAMES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid target style. Must be one of {STYLE_NAMES}"
            )

        video_id = str(uuid.uuid4())
        upload_path = UPLOAD_DIR / f"{video_id}_{file.filename}"

        with open(upload_path, "wb") as f:
            f.write(await file.read())

        poses, fps = pose_extractor.extract_poses_from_video(upload_path)

        if len(poses) == 0:
            raise HTTPException(
                status_code=400,
                detail="No poses detected in video."
            )

        poses = normalize_sequence_length(poses, TARGET_FRAMES)

        transformed = predict_style_transfer(poses, target_style)

        output_file = OUTPUT_DIR / f"{video_id}_{target_style}.mp4"
        generate_skeleton_video(transformed, output_file, fps)

        return FileResponse(
            path=str(output_file),
            media_type="video/mp4",
            filename=output_file.name,
            headers={
                "X-Video-ID": video_id,
                "X-Target-Style": target_style
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        print("Transform error:", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/styles")
async def get_available_styles():
    return {"styles": STYLE_NAMES}
