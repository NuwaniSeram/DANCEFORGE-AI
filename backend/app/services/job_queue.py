import json
import shutil
import uuid
from pathlib import Path
import numpy as np

from app.services.drive_paths import PENDING_DIR


def create_render_job(
    source_video_path: str,
    audio_path: str,
    transformed_pose: np.ndarray,
    target_style: str,
    fps: float
):
    """
    Creates a job folder inside Google Drive pending/
    Structure:
        pending/{job_id}/
            input.mp4
            audio.m4a
            transformed_pose.npy
            job.json
    """
    job_id = str(uuid.uuid4())
    job_dir = PENDING_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    input_video_dest = job_dir / "input.mp4"
    audio_dest = job_dir / "audio.m4a"
    pose_dest = job_dir / "transformed_pose.npy"
    job_meta_dest = job_dir / "job.json"

    shutil.copy2(source_video_path, input_video_dest)
    shutil.copy2(audio_path, audio_dest)
    np.save(pose_dest, transformed_pose)

    metadata = {
        "job_id": job_id,
        "target_style": target_style,
        "fps": float(fps),
        "input_video": "input.mp4",
        "audio_file": "audio.m4a",
        "pose_file": "transformed_pose.npy",
        "output_video": "final_output.mp4"
    }

    with open(job_meta_dest, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return job_id, str(job_dir)