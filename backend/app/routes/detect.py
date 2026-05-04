from fastapi import APIRouter, UploadFile, File
import tempfile
import os

from app.utils.video_preprocessing import extract_frames
from app.model.loader import predict_dance

router = APIRouter(prefix="/detect", tags=["Dance Detection"])

@router.post("/")
async def detect_dance_style(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp:
        temp.write(await file.read())
        temp_path = temp.name

    frames = extract_frames(temp_path)
    label, confidence = predict_dance(frames)

    os.remove(temp_path)

    return {
        "dance_style": label,
        "confidence": round(confidence, 4)
    }
