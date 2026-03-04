from fastapi import APIRouter
from pydantic import BaseModel
from app.services.emotion_service import analyze_song

router = APIRouter(prefix="/emotion", tags=["Emotion"])

class SongRequest(BaseModel):
    text: str

@router.post("/analyze")
def analyze(req: SongRequest):
    results = analyze_song(req.text)
    return {"results": results}
