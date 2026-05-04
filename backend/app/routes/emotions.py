from fastapi import APIRouter

router = APIRouter(
    prefix="/emotions",
    tags=["Emotion Analysis"]
)

@router.get("/test")
def test_emotion_route():
    return {"message": "Emotion route working"}
