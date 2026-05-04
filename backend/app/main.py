from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.mongodb import users_collection
from app.routes import videos, detect, transform, render_status
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
from app.routes import videos
from app.routes import emotion_routes
from app.routes import emotion_history_routes
from app.routes import performance_routes 

app = FastAPI(title="DanceForge AI API")

# CORS middleware to allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:3000"],
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get absolute paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent 
OUTPUTS_DIR = BASE_DIR / "outputs"
UPLOADS_DIR = BASE_DIR / "uploads"
MODELS_DIR = BASE_DIR / "Models"

print("\n" + "="*70)
print("INITIALIZING DANCE STYLE TRANSFER API")
print("="*70)
print(f"Project root: {BASE_DIR}")
print(f"Backend dir:  {Path(__file__).resolve().parent.parent}")
print(f"\nDirectories:")
print(f"  Outputs: {OUTPUTS_DIR} (exists: {OUTPUTS_DIR.exists()})")
print(f"  Uploads: {UPLOADS_DIR} (exists: {UPLOADS_DIR.exists()})")
print(f"  Models:  {MODELS_DIR} (exists: {MODELS_DIR.exists()})")

# Create directories if they don't exist
for directory in [OUTPUTS_DIR, UPLOADS_DIR, MODELS_DIR]:
    if not directory.exists():
        print(f"\n  Creating: {directory}")
        directory.mkdir(parents=True, exist_ok=True)
    else:
        print(f"  ✓ Found: {directory}")

print("="*70 + "\n")

# Include routers
app.include_router(videos.router)
app.include_router(detect.router)
app.include_router(render_status.router)
# app.include_router(transform.router, prefix="/api", tags=["transform"])
app.include_router(transform.router)

# Mount static files directory with ABSOLUTE path
if OUTPUTS_DIR.exists():
    app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")
    print(f"✓ Mounted outputs directory: {OUTPUTS_DIR}\n")
else:
    print(f"⚠ Warning: Outputs directory not found: {OUTPUTS_DIR}\n")

app.include_router(emotion_routes.router)
app.include_router(emotion_history_routes.router)
app.include_router(performance_routes.router)
@app.get("/")
def test_db():
    users_collection.insert_one({"test": "MongoDB Connected"})
    return {"message": "MongoDB connection successful"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "directories": {
            "outputs": str(OUTPUTS_DIR),
            "uploads": str(UPLOADS_DIR),
            "models": str(MODELS_DIR),
        },
        "directories_exist": {
            "outputs": OUTPUTS_DIR.exists(),
            "uploads": UPLOADS_DIR.exists(),
            "models": MODELS_DIR.exists(),
        }
    }

