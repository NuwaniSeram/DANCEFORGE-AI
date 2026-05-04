from fastapi import APIRouter
from datetime import datetime
from app.database.mongodb import emotion_history_collection
from bson import ObjectId

router = APIRouter(prefix="/history", tags=["Emotion History"])

@router.post("/save")
def save_emotion_history(data: dict):
    try:
        record = {
        "userId": data.get("userId", "demo_user"),
        "title": data.get("title", "Untitled Song"),
        "lyrics": data.get("lyrics"),
        "results": data.get("results"),
        "createdAt": datetime.utcnow()
    }

        emotion_history_collection.insert_one(record)

        return {"status": "success", "message": "Saved successfully"}

    except Exception as e:
        return {"status": "error", "message": str(e)}
    
@router.get("/user/{user_id}")
def get_emotion_history(user_id: str):
    try:
        records = list(
            emotion_history_collection
            .find({"userId": user_id})
            .sort("createdAt", -1)
        )

        for record in records:
            record["_id"] = str(record["_id"])
            if "createdAt" in record:
                record["createdAt"] = record["createdAt"].isoformat()

        return {
            "status": "success",
            "history": records
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "history": []
        }   