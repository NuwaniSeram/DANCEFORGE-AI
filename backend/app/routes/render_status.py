from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.services.drive_paths import PENDING_DIR, PROCESSING_DIR, COMPLETED_DIR, FAILED_DIR

router = APIRouter(prefix="/render", tags=["3D Render Status"])


@router.get("/status/{job_id}")
async def get_render_status(job_id: str):
    if (PENDING_DIR / job_id).exists():
        return {"job_id": job_id, "status": "pending"}

    if (PROCESSING_DIR / job_id).exists():
        return {"job_id": job_id, "status": "processing"}

    completed_dir = COMPLETED_DIR / job_id
    if completed_dir.exists():
        output_file = completed_dir / "final_output.mp4"
        if output_file.exists():
            return {
                "job_id": job_id,
                "status": "completed",
                "download_url": f"/render/download/{job_id}"
            }

    if (FAILED_DIR / job_id).exists():
        return {"job_id": job_id, "status": "failed"}

    raise HTTPException(status_code=404, detail="Job not found")


@router.get("/download/{job_id}")
async def download_rendered_video(job_id: str):
    output_file = COMPLETED_DIR / job_id / "final_output.mp4"

    if not output_file.exists():
        raise HTTPException(status_code=404, detail="Rendered video not found")

    return FileResponse(
        path=str(output_file),
        media_type="video/mp4",
        filename=f"{job_id}_final_output.mp4"
    )