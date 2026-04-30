from fastapi import APIRouter
from datetime import datetime
from app.database.mongodb import emotion_history_collection

router = APIRouter(prefix="/history", tags=["Emotion History"])

@router.post("/save")
def save_emotion_history(data: dict):
    try:
        record = {
            "userId": data.get("userId", "demo_user"),
            "lyrics": data.get("lyrics"),
            "results": data.get("results"),
            "createdAt": datetime.utcnow()
        }

        emotion_history_collection.insert_one(record)

        return {"status": "success", "message": "Saved successfully"}

    except Exception as e:
        return {"status": "error", "message": str(e)}