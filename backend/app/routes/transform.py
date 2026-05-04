from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import uuid
import shutil
import cv2
import numpy as np
import mediapipe as mp

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from app.model.transformer import predict_style_transfer, STYLE_NAMES, TARGET_FRAMES
from app.services.audio_utils import extract_audio
from app.services.job_queue import create_render_job

router = APIRouter(prefix="/render", tags=["3D Render"])

# --------------------------------------------------
# Directories
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# --------------------------------------------------
# Pose model
# --------------------------------------------------
POSE_MODEL_PATH = BASE_DIR / "Models" / "pose_landmarker_full.task"

# --------------------------------------------------
# Style aliases
# --------------------------------------------------
STYLE_ALIASES = {
    "hiphop": "HipHop",
    "hip hop": "HipHop",
    "hip-hop": "HipHop",
    "kandyan": "Kandyan",
    "contemporary": "Contemporary",
}

def normalize_style(style: str):
    return STYLE_ALIASES.get(style.lower().strip(), style.strip())


# --------------------------------------------------
# Pose extractor
# --------------------------------------------------
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
        fps = cap.get(cv2.CAP_PROP_FPS) or 30

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb
            )

            result = self.detector.detect(mp_image)

            if result.pose_landmarks:
                vec = []
                for lm in result.pose_landmarks[0]:
                    vec.extend([lm.x, lm.y, lm.z])
                poses.append(vec)
            else:
                poses.append(poses[-1] if poses else [0.0] * 99)

        cap.release()
        return np.array(poses), fps


pose_extractor = PoseExtractor(POSE_MODEL_PATH)


# --------------------------------------------------
# Utilities
# --------------------------------------------------
def normalize_sequence_length(poses, target_frames):
    if len(poses) > target_frames:
        idx = np.linspace(0, len(poses) - 1, target_frames, dtype=int)
        return poses[idx]
    elif len(poses) < target_frames:
        pad = np.repeat([poses[-1]], target_frames - len(poses), axis=0)
        return np.vstack([poses, pad])
    return poses


# --------------------------------------------------
# API
# --------------------------------------------------
@router.post("/transform")
async def transform_video(
    file: UploadFile = File(...),
    target_style: str = "HipHop"
):
    """
    Upload video -> extract audio -> extract poses -> run style transfer
    -> save job into Google Drive pending/ folder for Colab Blender rendering
    """
    try:
        target_style = normalize_style(target_style)

        if target_style not in STYLE_NAMES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid style. Choose from {STYLE_NAMES}"
            )

        video_id = str(uuid.uuid4())
        upload_path = UPLOAD_DIR / f"{video_id}_{file.filename}"

        with open(upload_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # 1. Extract original audio
        audio_path = UPLOAD_DIR / f"{video_id}.m4a"
        extract_audio(str(upload_path), str(audio_path))

        # 2. Extract poses from video
        poses, fps = pose_extractor.extract_poses_from_video(upload_path)

        if len(poses) == 0:
            raise HTTPException(status_code=400, detail="No pose detected in video.")

        # 3. Normalize length
        poses = normalize_sequence_length(poses, TARGET_FRAMES)

        # 4. Run style transfer model
        transformed = predict_style_transfer(poses, target_style)

        # 5. Create render job in Google Drive
        job_id, job_dir = create_render_job(
            source_video_path=str(upload_path),
            audio_path=str(audio_path),
            transformed_pose=transformed,
            target_style=target_style,
            fps=fps
        )

        return {
            "message": "Render job created successfully",
            "job_id": job_id,
            "job_dir": job_dir,
            "status": "pending",
            "target_style": target_style
        }

    except HTTPException:
        raise
    except Exception as e:
        print("Transform error:", e)
        raise HTTPException(status_code=500, detail=str(e))