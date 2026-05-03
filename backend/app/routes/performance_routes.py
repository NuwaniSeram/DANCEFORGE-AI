# backend/app/routes/performance_routes.py

import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException

# Adjust these imports to match where you placed the files
from app.services.error_detector        import compare_videos
from app.services.explainability_engine import build_full_explanation
from app.services.feedback_generator    import generate_feedback

router = APIRouter(prefix="/performance", tags=["Performance Analysis"])

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@router.get("/health/")
def health():
    return {"status": "ok", "version": "2.0.0"}


@router.get("/joints/")
def list_joints():
    from app.services.angle_calculator import JOINT_DEFINITIONS, BODY_SEGMENTS
    return {
        "joints":   [j[0] for j in JOINT_DEFINITIONS],
        "segments": BODY_SEGMENTS,
    }


@router.get("/segment-info/")
def segment_info():
    from app.services.angle_calculator import BODY_SEGMENTS
    return {"segments": BODY_SEGMENTS}


@router.post("/analyze/")
async def analyze(
    reference: UploadFile = File(...),
    user:      UploadFile = File(...),
):
    session_id = str(uuid.uuid4())[:8]
    ref_path  = f"{UPLOAD_FOLDER}/{session_id}_ref_{reference.filename}"
    usr_path  = f"{UPLOAD_FOLDER}/{session_id}_usr_{user.filename}"

    try:
        with open(ref_path, "wb") as f:
            shutil.copyfileobj(reference.file, f)
        with open(usr_path, "wb") as f:
            shutil.copyfileobj(user.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save error: {e}")

    try:
        analysis   = compare_videos(ref_path, usr_path)

        if "error" in analysis:
            raise HTTPException(status_code=422, detail=analysis["error"])

        xai_output = build_full_explanation(analysis)
        feedback   = generate_feedback(xai_output)

        response = {
            "session_id":         session_id,
            "similarity_score":   analysis["similarity_score"],
            "alignment_score":    analysis["alignment_score"],
            "total_frames":       analysis["total_frames_analysed"],
            "feedback":           feedback["messages"],
            "summary":            feedback["summary"],
            "score_badge":        feedback["score_badge"],
            "priority_tips":      feedback["priority_tips"],
            "segment_tips":       feedback["segment_tips"],
            "counterfactual":     feedback["counterfactual"],
            "top_priority":       feedback["top_priority"],
            "model_transparency": feedback["model_transparency"],
            "feature_importance": xai_output["feature_importance"],
            "xai_cards":          xai_output["xai_cards"],
            "global_explanation": xai_output["global_explanation"],
            "frame_timeline":     xai_output["frame_timeline"],
            "segment_scores":     analysis["segment_scores"],
            "joint_stats":        analysis["joint_stats"],
            "symmetry":           analysis["symmetry"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")
    finally:
        for p in [ref_path, usr_path]:
            if os.path.exists(p):
                os.remove(p)

    return response
