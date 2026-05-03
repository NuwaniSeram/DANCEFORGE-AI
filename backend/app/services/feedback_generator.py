"""
feedback_generator.py  –  Enhanced NLP Feedback Generator
Converts XAI cards and global explanation into structured,
priority-ordered feedback messages for the UI.
"""

from typing import List, Dict


SEVERITY_EMOJI = {
    "good":     "✅",
    "mild":     "🟡",
    "moderate": "🟠",
    "severe":   "🔴",
}

SEVERITY_LABEL = {
    "good":     "Correct",
    "mild":     "Minor Issue",
    "moderate": "Needs Attention",
    "severe":   "Critical Issue",
}

PRACTICE_DRILLS = {
    "arms":      "Arm isolation drill: practise arm movements separately while standing still.",
    "shoulders": "Mirror check: stand in front of a mirror and hold each shoulder position for 5 seconds.",
    "torso":     "Core engagement: practise the routine with hands on your hips to feel spine alignment.",
    "hips":      "Hip isolation: practise hip movements to a slow beat without arm movement.",
    "legs":      "Footwork slow-down: run the leg movements at 50% speed to build muscle memory.",
}


def generate_feedback(xai_output: dict) -> dict:
    """
    Convert XAI engine output into structured feedback for the frontend.

    Returns
    -------
    {
      "summary":       str   — overall performance summary
      "priority_tips": list  — ordered list of actionable tips
      "segment_tips":  dict  — segment → drill suggestion
      "score_badge":   str   — performance tier
      "messages":      list  — legacy flat list (backward compat)
    }
    """
    cards         = xai_output.get("xai_cards", [])
    global_exp    = xai_output.get("global_explanation", {})
    segment_scores = xai_output.get("segment_scores", {})

    # ── Summary sentence ─────────────────────────────────────────────────
    score   = global_exp.get("similarity_score", 0)
    tier    = global_exp.get("performance_tier", "developing")
    summary = global_exp.get("tier_message", "Analysis complete.")

    if score >= 85:
        summary = f"🌟 Excellent work! {summary}"
    elif score >= 70:
        summary = f"👍 Good progress! {summary}"
    elif score >= 50:
        summary = f"💪 Keep practising! {summary}"
    else:
        summary = f"🎯 Room to grow! {summary}"

    # ── Priority tips from XAI cards ─────────────────────────────────────
    priority_tips = []
    for card in cards:
        sev   = card["severity"]
        emoji = SEVERITY_EMOJI.get(sev, "")
        label = SEVERITY_LABEL.get(sev, sev.title())
        tip = {
            "id":           card["joint"],
            "display_name": card["display_name"],
            "severity":     sev,
            "emoji":        emoji,
            "label":        label,
            "message":      card["explanation"],
            "diff":         card["mean_diff"],
            "error_rate":   card["error_rate"],
            "importance":   card["importance"],
            "rule_trace":   card["rule_trace"],
            "confidence":   card["confidence"],
        }
        priority_tips.append(tip)

    # ── Segment-level drill suggestions ──────────────────────────────────
    segment_tips = {}
    for seg, score_val in segment_scores.items():
        if score_val < 75:
            segment_tips[seg] = {
                "score": score_val,
                "drill": PRACTICE_DRILLS.get(seg, f"Practise {seg} movements slowly."),
            }

    # ── Counterfactual hints ──────────────────────────────────────────────
    hints = global_exp.get("counterfactual_hints", [])

    # ── Legacy flat list (keeps old frontend working) ─────────────────────
    messages = [summary]
    for tip in priority_tips:
        messages.append(f"{tip['emoji']} [{tip['label']}] {tip['display_name']}: {tip['message']}")

    return {
        "summary":           summary,
        "priority_tips":     priority_tips,
        "segment_tips":      segment_tips,
        "counterfactual":    hints,
        "score_badge":       tier,
        "messages":          messages,
        "top_priority":      global_exp.get("top_priority_joints", []),
        "worst_segment":     global_exp.get("worst_segment"),
        "model_transparency": global_exp.get("model_transparency", ""),
    }
