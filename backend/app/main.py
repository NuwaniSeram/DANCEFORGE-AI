from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.mongodb import users_collection
from app.routes import videos
from app.routes import emotion_routes
from app.routes import audio_routes

app = FastAPI(title="DanceForge AI API")

# CORS middleware to allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(videos.router)
app.include_router(emotion_routes.router)
app.include_router(audio_routes.router)
@app.get("/")
def test_db():
    users_collection.insert_one({"test": "MongoDB Connected"})
    return {"message": "MongoDB connection successful"}
