from pathlib import Path
import os

DRIVE_ROOT = Path(
    os.getenv("DANCEFORGE_DRIVE_ROOT", r"G:\My Drive\DanceForgeJobs")
)

PENDING_DIR = DRIVE_ROOT / "pending"
PROCESSING_DIR = DRIVE_ROOT / "processing"
COMPLETED_DIR = DRIVE_ROOT / "completed"
FAILED_DIR = DRIVE_ROOT / "failed"
ASSETS_DIR = DRIVE_ROOT / "assets"

for d in [PENDING_DIR, PROCESSING_DIR, COMPLETED_DIR, FAILED_DIR, ASSETS_DIR]:
    d.mkdir(parents=True, exist_ok=True)