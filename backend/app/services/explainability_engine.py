"""
explainability_engine.py  –  Explainable AI Engine  (CORE XAI MODULE)
====================================================================
This is the primary research contribution.

It provides:
  1. Feature-importance scores  (SHAP-inspired, without black-box model)
  2. Natural-language explanations per joint
  3. Confidence-weighted "XAI cards" for each error
  4. Global explanation: which body parts matter most
  5. Counterfactual hints: "if you fix X, score improves by Y"
  6. Rule-based XAI trace: shows exactly how each decision was made

Design: rule-based XAI is chosen over post-hoc model explanations
(LIME/SHAP) because dance feedback requires precise, interpretable
thresholds that dancers and coaches can verify and trust.
"""

import numpy as np
from .angle_calculator import BODY_SEGMENTS, JOINT_WEIGHTS


# ── Natural-language templates per joint ──────────────────────────────────
_JOINT_TIPS = {
    "right_elbow": {
        "good":     "Right elbow position is correct.",
        "mild":     "Your right elbow is slightly off. Try extending it a bit more to match the reference.",
        "moderate": "Right elbow needs adjustment. Focus on the angle — it should be more {direction}.",
        "severe":   "Right elbow angle is significantly different. Practise the arm extension drill separately.",
    },
    "left_elbow": {
        "good":     "Left elbow position is correct.",
        "mild":     "Left elbow is slightly off — check your arm position in the mirror.",
        "moderate": "Left elbow angle is noticeably wrong. Compare frame-by-frame with the reference.",
        "severe":   "Left elbow needs major correction. Isolate this arm movement and drill it slowly.",
    },
    "right_shoulder": {
        "good":     "Right shoulder alignment is on point.",
        "mild":     "Right shoulder is slightly raised or forward. Relax and realign.",
        "moderate": "Right shoulder alignment is off. Keep it level with the left shoulder.",
        "severe":   "Right shoulder position is very different from reference. Check posture and shoulder roll.",
    },
    "left_shoulder": {
        "good":     "Left shoulder alignment is good.",
        "mild":     "Left shoulder is slightly misaligned. Consciously hold it in the reference position.",
        "moderate": "Left shoulder needs correction — avoid hunching or over-rotating.",
        "severe":   "Left shoulder is significantly off. Shoulder mobility exercises may help.",
    },
    "right_wrist": {
        "good":     "Right wrist movement is correct.",
        "mild":     "Right wrist is slightly off. Check hand placement.",
        "moderate": "Right wrist angle needs attention. Match the reference hand gesture.",
        "severe":   "Right wrist position is very different. Practise wrist isolations.",
    },
    "left_wrist": {
        "good":     "Left wrist movement is correct.",
        "mild":     "Left wrist is slightly off. Check your hand placement.",
        "moderate": "Left wrist angle needs attention.",
        "severe":   "Left wrist position is very different. Practise wrist isolations.",
    },
    "spine": {
        "good":     "Spine alignment is correct.",
        "mild":     "Slight spinal tilt detected. Engage your core to stay upright.",
        "moderate": "Spine is noticeably tilting. Keep your core tight and back straight.",
        "severe":   "Major spinal misalignment. Focus on posture — engage abs and keep shoulders back.",
    },
    "hip_center": {
        "good":     "Hip alignment is correct.",
        "mild":     "Hips are slightly unlevelled. Think about keeping both hips even.",
        "moderate": "Hip alignment is off. Watch your weight shift and centre of gravity.",
        "severe":   "Hips are significantly misaligned. This affects balance — practise hip isolations.",
    },
    "right_hip": {
        "good":     "Right hip movement is correct.",
        "mild":     "Right hip is slightly out of position. Check weight distribution.",
        "moderate": "Right hip angle is noticeably off. Focus on the initiation of the hip movement.",
        "severe":   "Right hip position is very different. Drill this movement in slow motion.",
    },
    "left_hip": {
        "good":     "Left hip movement is correct.",
        "mild":     "Left hip is slightly out of position.",
        "moderate": "Left hip angle is noticeably off.",
        "severe":   "Left hip needs significant correction.",
    },
    "right_knee": {
        "good":     "Right knee bend is correct.",
        "mild":     "Right knee bend is slightly off. Check if you are bending enough.",
        "moderate": "Right knee angle needs correction. Match the reference knee bend depth.",
        "severe":   "Right knee position is significantly wrong. Practise the pliés / knee-bend drill.",
    },
    "left_knee": {
        "good":     "Left knee bend is correct.",
        "mild":     "Left knee bend is slightly off.",
        "moderate": "Left knee angle needs correction.",
        "severe":   "Left knee position is significantly wrong.",
    },
    "right_ankle": {
        "good":     "Right ankle/foot position is correct.",
        "mild":     "Right ankle is slightly off. Check foot placement.",
        "moderate": "Right ankle angle needs correction. Mind your foot turnout.",
        "severe":   "Right ankle is significantly off. Footwork drill recommended.",
    },
    "left_ankle": {
        "good":     "Left ankle/foot position is correct.",
        "mild":     "Left ankle is slightly off.",
        "moderate": "Left ankle angle needs correction.",
        "severe":   "Left ankle is significantly off.",
    },
}

_SEGMENT_SUMMARIES = {
    "arms":      "arm movements and elbow/wrist control",
    "shoulders": "shoulder alignment and upper-body posture",
    "torso":     "core stability and spinal alignment",
    "hips":      "hip movement and weight distribution",
    "legs":      "leg positioning, knee bend, and footwork",
}


def compute_feature_importance(joint_stats: dict) -> dict:
    """
    Compute XAI feature importance scores for each joint.

    Method (rule-based SHAP analogy):
      importance_i = (mean_diff_i / 90) * weight_i * error_rate_i * confidence_i

    This measures how much each joint *contributes* to overall error,
    weighted by its choreographic importance and detection confidence.

    Returns dict: joint_name → importance_score (0-1, normalised)
    """
    raw = {}
    for joint, stats in joint_stats.items():
        w    = stats["weight"]
        diff = stats["mean_diff"]
        er   = stats["error_rate"]
        conf = stats["mean_conf"]
        raw[joint] = (diff / 90.0) * w * er * conf

    total = sum(raw.values()) or 1.0
    importance = {j: round(v / total, 4) for j, v in raw.items()}
    return importance


def generate_xai_cards(joint_stats: dict, feature_importance: dict) -> list:
    """
    Generate one XAI explanation card per joint with error.

    Each card contains:
      - joint name
      - severity
      - angle difference
      - confidence
      - importance score
      - natural-language explanation
      - rule trace (shows the decision logic)
    """
    cards = []
    for joint, stats in joint_stats.items():
        severity = stats["severity"]
        if severity == "good":
            continue   # no card for correct joints

        tip_templates = _JOINT_TIPS.get(joint, {})
        tip = tip_templates.get(severity, f"Adjust your {joint.replace('_', ' ')}.")

        # Fill direction placeholder if present
        direction = "more open" if stats["mean_diff"] > 0 else "more closed"
        tip = tip.replace("{direction}", direction)

        rule_trace = (
            f"RULE: |ref_angle − user_angle| = {stats['mean_diff']}° "
            f"(threshold mild={10}°, moderate={20}°, severe={35}°) → severity={severity}. "
            f"Error occurred in {round(stats['error_rate'] * 100)}% of analysed frames. "
            f"Detection confidence: {round(stats['mean_conf'] * 100)}%. "
            f"Joint choreographic weight: {stats['weight']}."
        )

        cards.append({
            "joint":       joint,
            "display_name": joint.replace("_", " ").title(),
            "severity":    severity,
            "mean_diff":   stats["mean_diff"],
            "peak_diff":   stats["peak_diff"],
            "error_rate":  stats["error_rate"],
            "confidence":  stats["mean_conf"],
            "importance":  feature_importance.get(joint, 0),
            "explanation": tip,
            "rule_trace":  rule_trace,
        })

    # Sort by importance descending
    cards.sort(key=lambda c: c["importance"], reverse=True)
    return cards


def generate_global_explanation(
    segment_scores: dict,
    joint_stats: dict,
    feature_importance: dict,
    similarity_score: float,
) -> dict:
    """
    Generate a top-level XAI summary explaining the overall performance.
    """
    # Top 3 most important joints to fix
    sorted_joints = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    top_joints = [j for j, _ in sorted_joints[:3]]

    # Weakest segment
    worst_seg  = min(segment_scores, key=segment_scores.get) if segment_scores else None
    best_seg   = max(segment_scores, key=segment_scores.get) if segment_scores else None

    # Overall performance tier
    if similarity_score >= 85:
        tier, tier_msg = "excellent", "You are closely matching the reference choreography."
    elif similarity_score >= 70:
        tier, tier_msg = "good", "You have a good grasp of the routine with some areas to refine."
    elif similarity_score >= 50:
        tier, tier_msg = "developing", "The basic structure is there — focus on the flagged joints."
    else:
        tier, tier_msg = "needs_work", "Significant differences detected. Slow-motion practice recommended."

    # Counterfactual: score improvement estimate if top joint is fixed
    counterfactual_gains = []
    for joint in top_joints:
        if joint in joint_stats:
            w     = joint_stats[joint]["weight"]
            diff  = joint_stats[joint]["mean_diff"]
            gain  = round((diff / 90.0) * w * 100, 1)
            counterfactual_gains.append({
                "joint": joint,
                "display_name": joint.replace("_", " ").title(),
                "estimated_score_gain": gain,
                "message": (
                    f"Correcting your {joint.replace('_', ' ')} could improve "
                    f"your score by approximately {gain} points."
                )
            })

    return {
        "performance_tier":   tier,
        "tier_message":       tier_msg,
        "similarity_score":   similarity_score,
        "top_priority_joints": top_joints,
        "worst_segment":      worst_seg,
        "worst_segment_label": _SEGMENT_SUMMARIES.get(worst_seg, worst_seg) if worst_seg else None,
        "best_segment":       best_seg,
        "counterfactual_hints": counterfactual_gains,
        "xai_method":         "Rule-based feature importance with confidence weighting",
        "model_transparency": (
            "All decisions are derived from explicit angle-difference thresholds "
            "(mild ≥10°, moderate ≥20°, severe ≥35°) applied to MediaPipe pose landmarks. "
            "No black-box neural network decisions are used for feedback generation."
        ),
    }


def build_full_explanation(analysis: dict) -> dict:
    """
    Master function: takes the error_detector output and returns
    the complete XAI explanation package.
    """
    joint_stats      = analysis["joint_stats"]
    segment_scores   = analysis["segment_scores"]
    similarity_score = analysis["similarity_score"]

    feature_importance = compute_feature_importance(joint_stats)
    xai_cards          = generate_xai_cards(joint_stats, feature_importance)
    global_explanation = generate_global_explanation(
        segment_scores, joint_stats, feature_importance, similarity_score
    )

    # Frame-level timeline: when were errors worst?
    frame_timeline = _build_frame_timeline(analysis)

    return {
        "feature_importance": feature_importance,
        "xai_cards":          xai_cards,
        "global_explanation": global_explanation,
        "frame_timeline":     frame_timeline,
        "joint_stats":        joint_stats,
        "segment_scores":     segment_scores,
    }


def _build_frame_timeline(analysis: dict) -> list:
    """
    Build a compact timeline showing error density across the video.
    Groups frames into 10 time buckets.
    """
    severities = analysis.get("frame_severities", [])
    if not severities:
        return []

    n      = len(severities)
    bucket = max(1, n // 10)
    order  = {"good": 0, "mild": 1, "moderate": 2, "severe": 3}
    rev    = {0: "good", 1: "mild", 2: "moderate", 3: "severe"}

    timeline = []
    for i in range(0, n, bucket):
        chunk = severities[i:i + bucket]
        max_sev = rev[max(order[s] for s in chunk)]
        error_pct = round(sum(1 for s in chunk if s != "good") / len(chunk) * 100)
        timeline.append({
            "segment":      len(timeline) + 1,
            "frame_start":  i,
            "frame_end":    min(i + bucket - 1, n - 1),
            "max_severity": max_sev,
            "error_pct":    error_pct,
        })
    return timeline
