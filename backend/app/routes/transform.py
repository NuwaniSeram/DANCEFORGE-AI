from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pathlib import Path
import uuid
import shutil
import cv2
import numpy as np
import mediapipe as mp
import os

# Disable some CPU/GPU delegate issues before MediaPipe initializes
os.environ["MEDIAPIPE_DISABLE_GPU"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from app.model.transformer import predict_style_transfer, STYLE_NAMES, TARGET_FRAMES
from app.services.audio_utils import extract_audio
from app.services.drive_paths import COMPLETED_DIR
from app.services.blender_renderer import render_blender_avatar

router = APIRouter(prefix="/render", tags=["3D Render"])

# --------------------------------------------------
# Directories
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
COMPLETED_DIR.mkdir(parents=True, exist_ok=True)

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
        if not Path(model_path).exists():
            raise FileNotFoundError(f"Pose model not found: {model_path}")

        base_options = python.BaseOptions(model_asset_path=str(model_path))

        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            output_segmentation_masks=False,
            num_poses=1,
            running_mode=vision.RunningMode.IMAGE
        )

        self.detector = vision.PoseLandmarker.create_from_options(options)

    def extract_poses_from_video(self, video_path):
        cap = cv2.VideoCapture(str(video_path))

        if not cap.isOpened():
            raise RuntimeError("Could not open uploaded video.")

        poses = []
        fps = cap.get(cv2.CAP_PROP_FPS)

        if not fps or fps <= 0:
            fps = 30

        while True:
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
                if poses:
                    poses.append(poses[-1])
                else:
                    poses.append([0.0] * 99)

        cap.release()

        if len(poses) == 0:
            return np.empty((0, 99)), fps

        return np.array(poses, dtype=np.float32), fps


# --------------------------------------------------
# Lazy PoseExtractor initialization
# --------------------------------------------------
pose_extractor_instance = None


def get_pose_extractor():
    global pose_extractor_instance

    if pose_extractor_instance is None:
        print("Initializing PoseExtractor...")
        pose_extractor_instance = PoseExtractor(POSE_MODEL_PATH)
        print("PoseExtractor initialized successfully.")

    return pose_extractor_instance


# --------------------------------------------------
# Utilities
# --------------------------------------------------
def normalize_sequence_length(poses, target_frames):
    if poses is None or len(poses) == 0:
        raise ValueError("No pose sequence available for normalization.")

    if len(poses) > target_frames:
        idx = np.linspace(0, len(poses) - 1, target_frames, dtype=int)
        return poses[idx]

    elif len(poses) < target_frames:
        pad = np.repeat([poses[-1]], target_frames - len(poses), axis=0)
        return np.vstack([poses, pad])

    return poses


def process_render_job(job_id: str, pose_npy_path: str, audio_path: str, fps: float):
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

        print(f"Render completed successfully: {output_video_path}")

    except Exception as e:
        print(f"Background render failed for job {job_id}: {e}")
        from app.services.drive_paths import FAILED_DIR
        failed_dir = FAILED_DIR / job_id
        failed_dir.mkdir(parents=True, exist_ok=True)
        with open(failed_dir / "error.log", "w") as f:
            f.write(str(e))


# --------------------------------------------------
# API
# --------------------------------------------------
@router.post("/transform")
async def transform_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    target_style: str = "HipHop"
):
    try:
        target_style = normalize_style(target_style)

        if target_style not in STYLE_NAMES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid style. Choose from {STYLE_NAMES}"
            )

        job_id = str(uuid.uuid4())
        upload_path = UPLOAD_DIR / f"{job_id}_{file.filename}"

        with open(upload_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        audio_path = UPLOAD_DIR / f"{job_id}.m4a"
        extract_audio(str(upload_path), str(audio_path))

        extractor = get_pose_extractor()
        poses, fps = extractor.extract_poses_from_video(str(upload_path))

        if len(poses) == 0:
            raise HTTPException(
                status_code=400,
                detail="No pose detected in video."
            )

        poses = normalize_sequence_length(poses, TARGET_FRAMES)

        transformed = predict_style_transfer(poses, target_style)

        pose_npy_path = str(UPLOAD_DIR / f"{job_id}_pose.npy")
        np.save(pose_npy_path, transformed)

        background_tasks.add_task(
            process_render_job,
            job_id,
            pose_npy_path,
            str(audio_path),
            fps
        )

        return {
            "message": "Local render job queued successfully",
            "job_id": job_id,
            "status": "processing",
            "target_style": target_style
        }

    except HTTPException:
        raise

    except Exception as e:
        print("Transform error:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Transform failed: {str(e)}"
        )