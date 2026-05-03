"""
angle_calculator.py  –  Enhanced Angle & Motion Calculator
Computes joint angles (2D & 3D), angular velocity, and symmetry metrics.
"""

import numpy as np
from .pose_extractor import get_landmark_array, get_landmark_visibility

JOINT_WEIGHTS = {
    "shoulder": 1.0,
    "elbow": 0.8,
    "wrist": 0.6,
    "hip": 1.0,
    "knee": 0.9,
    "ankle": 0.7
}

# ── Joint triplets to analyse ──────────────────────────────────────────────
# Each entry: (joint_name, point_A_idx, vertex_idx, point_C_idx)
JOINT_DEFINITIONS = [
    # Arms
    ("right_elbow",    12, 14, 16),
    ("left_elbow",     11, 13, 15),
    ("right_shoulder", 14, 12, 24),
    ("left_shoulder",  13, 11, 23),
    ("right_wrist",    14, 16, 18),
    ("left_wrist",     13, 15, 17),
    # Torso
    ("spine",          12, 11, 23),   # right-shoulder → left-shoulder → left-hip
    ("hip_center",     11, 23, 24),   # left-shoulder → left-hip → right-hip
    # Legs
    ("right_knee",     24, 26, 28),
    ("left_knee",      23, 25, 27),
    ("right_hip",      12, 24, 26),
    ("left_hip",       11, 23, 25),
    ("right_ankle",    26, 28, 32),
    ("left_ankle",     25, 27, 31),
]

# Body segments for grouping in the report
BODY_SEGMENTS = {
    "arms":   ["right_elbow", "left_elbow", "right_wrist", "left_wrist"],
    "shoulders": ["right_shoulder", "left_shoulder"],
    "torso":  ["spine", "hip_center"],
    "hips":   ["right_hip", "left_hip"],
    "legs":   ["right_knee", "left_knee", "right_ankle", "left_ankle"],
}


def calculate_angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """
    Angle at vertex B in the triangle A-B-C.
    Works with 2D or 3D arrays.
    """
    ba = a - b
    bc = c - b
    norm_ba = np.linalg.norm(ba)
    norm_bc = np.linalg.norm(bc)
    if norm_ba < 1e-9 or norm_bc < 1e-9:
        return 0.0
    cosine = np.dot(ba, bc) / (norm_ba * norm_bc)
    cosine = np.clip(cosine, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosine)))


def extract_frame_angles(frame_points: list) -> dict:
    """
    Compute all defined joint angles for a single frame.

    Returns dict: joint_name → {'angle': float, 'confidence': float}
    """
    result = {}
    for joint_name, a_idx, v_idx, c_idx in JOINT_DEFINITIONS:
        conf = min(
            get_landmark_visibility(frame_points, a_idx),
            get_landmark_visibility(frame_points, v_idx),
            get_landmark_visibility(frame_points, c_idx),
        )
        a = get_landmark_array(frame_points, a_idx)
        b = get_landmark_array(frame_points, v_idx)
        c = get_landmark_array(frame_points, c_idx)
        angle = calculate_angle(a, b, c)
        result[joint_name] = {"angle": angle, "confidence": float(conf)}
    return result


def compute_angular_velocity(angles_seq: list, fps: float) -> dict:
    """
    Given a sequence of per-frame angle dicts, compute angular velocity
    (degrees/second) for each joint.

    Returns dict: joint_name → list of velocities (length = len-1)
    """
    if len(angles_seq) < 2:
        return {}
    dt = 1.0 / fps
    velocities = {j: [] for j in angles_seq[0]}
    for i in range(1, len(angles_seq)):
        for joint in velocities:
            prev = angles_seq[i - 1][joint]["angle"]
            curr = angles_seq[i][joint]["angle"]
            velocities[joint].append(abs(curr - prev) / dt)
    return velocities


def compute_symmetry_score(frame_angles: dict) -> float:
    """
    Compute left-right symmetry score [0-100].
    Compares matching left/right joint pairs.
    """
    pairs = [
        ("right_elbow", "left_elbow"),
        ("right_shoulder", "left_shoulder"),
        ("right_hip", "left_hip"),
        ("right_knee", "left_knee"),
        ("right_ankle", "left_ankle"),
        ("right_wrist", "left_wrist"),
    ]
    diffs = []
    for r, l in pairs:
        if r in frame_angles and l in frame_angles:
            diff = abs(frame_angles[r]["angle"] - frame_angles[l]["angle"])
            diffs.append(diff)
    if not diffs:
        return 100.0
    mean_diff = np.mean(diffs)
    score = max(0.0, 100.0 - mean_diff)
    return round(float(score), 2)
