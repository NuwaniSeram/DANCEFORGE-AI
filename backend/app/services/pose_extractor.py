"""
pose_extractor.py  –  Enhanced Pose Extractor
Extracts (x, y, z) keypoints + per-landmark visibility/confidence
from a video using MediaPipe Pose.
"""

import cv2
import mediapipe as mp
import numpy as np

mp_pose = mp.solutions.pose


# MediaPipe landmark index → human-readable name
LANDMARK_NAMES = {
    0: "nose", 1: "left_eye_inner", 2: "left_eye", 3: "left_eye_outer",
    4: "right_eye_inner", 5: "right_eye", 6: "right_eye_outer",
    7: "left_ear", 8: "right_ear", 9: "mouth_left", 10: "mouth_right",
    11: "left_shoulder", 12: "right_shoulder",
    13: "left_elbow", 14: "right_elbow",
    15: "left_wrist", 16: "right_wrist",
    17: "left_pinky", 18: "right_pinky",
    19: "left_index", 20: "right_index",
    21: "left_thumb", 22: "right_thumb",
    23: "left_hip", 24: "right_hip",
    25: "left_knee", 26: "right_knee",
    27: "left_ankle", 28: "right_ankle",
    29: "left_heel", 30: "right_heel",
    31: "left_foot_index", 32: "right_foot_index",
}


def extract_keypoints(video_path: str, max_frames: int = 300):
    """
    Extract pose keypoints from a video file.

    Returns
    -------
    keypoints : list of frames.
        Each frame is a list of 33 dicts:
            { 'x', 'y', 'z', 'visibility', 'name' }
    frame_times : list of float  (timestamp in seconds for each frame)
    fps : float
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    keypoints = []
    frame_times = []
    frame_idx = 0

    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose:
        while cap.isOpened() and frame_idx < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb)

            if results.pose_landmarks:
                frame_points = []
                for idx, lm in enumerate(results.pose_landmarks.landmark):
                    frame_points.append({
                        "x": lm.x,
                        "y": lm.y,
                        "z": lm.z,          # depth (relative)
                        "visibility": lm.visibility,
                        "name": LANDMARK_NAMES.get(idx, f"lm_{idx}"),
                    })
                keypoints.append(frame_points)
                frame_times.append(frame_idx / fps)

            frame_idx += 1

    cap.release()
    return keypoints, frame_times, fps


def get_landmark_array(frame_points, idx):
    """Return [x, y, z] numpy array for landmark index."""
    lm = frame_points[idx]
    return np.array([lm["x"], lm["y"], lm["z"]])


def get_landmark_visibility(frame_points, idx):
    return frame_points[idx]["visibility"]
