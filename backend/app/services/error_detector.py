"""
error_detector.py  –  Enhanced Error Detector
Detects joint angle errors with severity classification,
confidence weighting, and temporal aggregation.
"""

import numpy as np
from collections import defaultdict

from .pose_extractor import extract_keypoints
from .angle_calculator import (
    extract_frame_angles,
    compute_angular_velocity,
    compute_symmetry_score,
    BODY_SEGMENTS,
    JOINT_DEFINITIONS,
)
from .aligner import (
    align_sequences,
    get_aligned_frame_pairs
)


# ── Severity thresholds (degrees) ──────────────────────────────────────────
SEVERITY_MILD     = 10   # 10-20°
SEVERITY_MODERATE = 20   # 20-35°
SEVERITY_SEVERE   = 35   # >35°

# Weight per joint for overall score
JOINT_WEIGHTS = {
    "right_elbow": 0.08, "left_elbow": 0.08,
    "right_shoulder": 0.09, "left_shoulder": 0.09,
    "right_wrist": 0.04, "left_wrist": 0.04,
    "spine": 0.10,
    "hip_center": 0.08,
    "right_hip": 0.08, "left_hip": 0.08,
    "right_knee": 0.10, "left_knee": 0.10,
    "right_ankle": 0.07, "left_ankle": 0.07,
}


def _classify_severity(diff: float) -> str:
    if diff < SEVERITY_MILD:
        return "good"
    elif diff < SEVERITY_MODERATE:
        return "mild"
    elif diff < SEVERITY_SEVERE:
        return "moderate"
    else:
        return "severe"


def compare_videos(ref_path: str, user_path: str) -> dict:
    """
    Full pipeline: extract → align → detect errors → compute scores.

    Returns a rich analysis dict consumed by the explainability engine
    and the API response.
    """
    # ── 1. Extract keypoints ──────────────────────────────────────────────
    ref_kps, ref_times, fps = extract_keypoints(ref_path)
    usr_kps, usr_times, _   = extract_keypoints(user_path)

    if not ref_kps or not usr_kps:
        return {"error": "Could not extract poses from one or both videos."}

    # ── 2. Compute per-frame angles ───────────────────────────────────────
    ref_angles = [extract_frame_angles(f) for f in ref_kps]
    usr_angles = [extract_frame_angles(f) for f in usr_kps]

    # ── 3. DTW Alignment ─────────────────────────────────────────────────
    path, alignment_score = align_sequences(ref_angles, usr_angles)
    aligned_pairs = get_aligned_frame_pairs(path, ref_angles, usr_angles)

    # ── 4. Per-joint error accumulation ──────────────────────────────────
    joint_errors    = defaultdict(list)   # joint → [diff, ...]
    joint_conf      = defaultdict(list)   # joint → [confidence, ...]
    frame_errors    = []                  # per aligned-frame summary
    frame_severities = []

    for ref_frame, usr_frame, r_idx, u_idx in aligned_pairs:
        frame_detail = {
            "ref_frame": r_idx,
            "user_frame": u_idx,
            "timestamp": ref_times[r_idx] if r_idx < len(ref_times) else 0,
            "joints": {}
        }
        worst_severity = "good"
        for joint in ref_frame:
            ref_angle  = ref_frame[joint]["angle"]
            usr_angle  = usr_frame[joint]["angle"]
            conf       = min(ref_frame[joint]["confidence"],
                             usr_frame[joint]["confidence"])
            diff       = abs(ref_angle - usr_angle)
            severity   = _classify_severity(diff)

            joint_errors[joint].append(diff)
            joint_conf[joint].append(conf)

            frame_detail["joints"][joint] = {
                "ref_angle":  round(ref_angle, 2),
                "user_angle": round(usr_angle, 2),
                "diff":       round(diff, 2),
                "severity":   severity,
                "confidence": round(conf, 3),
            }
            severity_order = ["good", "mild", "moderate", "severe"]
            if severity_order.index(severity) > severity_order.index(worst_severity):
                worst_severity = severity

        frame_errors.append(frame_detail)
        frame_severities.append(worst_severity)

    # ── 5. Aggregate joint statistics ────────────────────────────────────
    joint_stats = {}
    for joint in joint_errors:
        diffs = joint_errors[joint]
        confs = joint_conf[joint]
        mean_diff  = float(np.mean(diffs))
        mean_conf  = float(np.mean(confs))
        peak_diff  = float(np.max(diffs))
        error_rate = sum(1 for d in diffs if d >= SEVERITY_MILD) / max(len(diffs), 1)

        joint_stats[joint] = {
            "mean_diff":  round(mean_diff, 2),
            "peak_diff":  round(peak_diff, 2),
            "mean_conf":  round(mean_conf, 3),
            "error_rate": round(error_rate, 3),
            "severity":   _classify_severity(mean_diff),
            "weight":     JOINT_WEIGHTS.get(joint, 0.05),
        }

    # ── 6. Similarity / accuracy score ───────────────────────────────────
    score = _compute_weighted_score(joint_stats)

    # ── 7. Angular velocity ──────────────────────────────────────────────
    ref_velocity  = compute_angular_velocity(ref_angles, fps)
    usr_velocity  = compute_angular_velocity(usr_angles, fps)

    # ── 8. Symmetry ───────────────────────────────────────────────────────
    ref_sym = float(np.mean([compute_symmetry_score(f) for f in ref_angles]))
    usr_sym = float(np.mean([compute_symmetry_score(f) for f in usr_angles]))

    # ── 9. Body segment summary ───────────────────────────────────────────
    segment_scores = {}
    for seg, joints in BODY_SEGMENTS.items():
        seg_diffs = [joint_stats[j]["mean_diff"] for j in joints if j in joint_stats]
        if seg_diffs:
            seg_score = max(0, 100 - np.mean(seg_diffs) * 2)
            segment_scores[seg] = round(float(seg_score), 2)

    return {
        "similarity_score": score,
        "alignment_score":  alignment_score,
        "joint_stats":      joint_stats,
        "frame_errors":     frame_errors,
        "frame_severities": frame_severities,
        "segment_scores":   segment_scores,
        "symmetry": {
            "reference": round(ref_sym, 2),
            "user":      round(usr_sym, 2),
        },
        "total_frames_analysed": len(frame_errors),
        "fps": fps,
    }


def _compute_weighted_score(joint_stats: dict) -> float:
    total_weight = 0.0
    weighted_sum = 0.0
    for joint, stats in joint_stats.items():
        w      = stats["weight"]
        conf   = stats["mean_conf"]
        diff   = stats["mean_diff"]
        # Joint score: penalise proportionally; 90° diff → 0 score
        j_score = max(0.0, 100.0 - (diff / 90.0) * 100.0)
        weighted_sum  += j_score * w * conf
        total_weight  += w * conf
    if total_weight == 0:
        return 50.0
    return round(weighted_sum / total_weight, 2)
