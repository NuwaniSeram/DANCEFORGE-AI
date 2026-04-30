from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile
import os
from faster_whisper import WhisperModel

router = APIRouter(prefix="/audio", tags=["Audio"])

_model = None


def load_whisper_model():
    global _model
    if _model is None:
        # Local CPU-friendly model for coding/testing.
        # On RunPod later, we can change device="cuda".
        _model = WhisperModel("small", device="cpu", compute_type="int8")
    return _model


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    allowed_extensions = [".mp3", ".wav", ".m4a", ".mp4", ".webm"]

    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload mp3, wav, m4a, mp4, or webm."
        )

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        model = load_whisper_model()

        segments, info = model.transcribe(
            tmp_path,
            beam_size=5,
            vad_filter=True
        )

        lyrics = "\n".join([seg.text.strip() for seg in segments if seg.text.strip()])
        detected_language = info.language or "unknown"

        os.remove(tmp_path)

        if detected_language not in ["si", "en"]:
            raise HTTPException(
                status_code=400,
                detail="Unsupported language detected. Please upload Sinhala or English audio."
            )

        language_name = "Sinhala" if detected_language == "si" else "English"

        return {
            "language": language_name,
            "lyrics": lyrics
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Audio transcription failed: {str(e)}"
        )