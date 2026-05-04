import cv2
import os
import numpy as np
import tempfile
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import urllib.request

TEMP_DIR = tempfile.gettempdir()
MAX_FRAMES = 100
NUM_LANDMARKS = 33 * 3

# -------------------- MediaPipe PoseLandmarker -------------------- #
MP_MODEL_PATH = 'pose_landmarker_full.task'
if not os.path.exists(MP_MODEL_PATH):
    url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task"
    print("Downloading MediaPipe model...")
    urllib.request.urlretrieve(url, MP_MODEL_PATH)
    print("Downloaded MediaPipe model!")

base_options = python.BaseOptions(model_asset_path=MP_MODEL_PATH)
pose_options = vision.PoseLandmarkerOptions(base_options=base_options,
                                            output_segmentation_masks=False)
pose_detector = vision.PoseLandmarker.create_from_options(pose_options)

# -------------------- Video Processing -------------------- #
def video_to_skeleton_sequence(video_path):
    cap = cv2.VideoCapture(video_path)
    seq = []
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose_detector.detect(frame_rgb)
        if results.pose_landmarks:
            landmarks = []
            for lm in results.pose_landmarks.landmark:
                landmarks.extend([lm.x, lm.y, lm.z])
            seq.append(landmarks)
    cap.release()
    # Pad/truncate
    if len(seq) < MAX_FRAMES:
        seq = np.pad(seq, ((0, MAX_FRAMES - len(seq)), (0,0)), mode='constant')
    else:
        seq = seq[:MAX_FRAMES]
    return np.array(seq)

def skeleton_sequence_to_video(seq, save_path=None, frame_size=(640,480), fps=25):
    if save_path is None:
        save_path = os.path.join(TEMP_DIR, "transformed_output.avi")
    out = cv2.VideoWriter(save_path, cv2.VideoWriter_fourcc(*'XVID'), fps, frame_size)
    for frame_landmarks in seq:
        frame = np.zeros((frame_size[1], frame_size[0], 3), dtype=np.uint8)
        for i in range(0, len(frame_landmarks), 3):
            x = int(frame_landmarks[i] * frame_size[0])
            y = int(frame_landmarks[i+1] * frame_size[1])
            cv2.circle(frame, (x,y), 5, (0,255,0), -1)
        out.write(frame)
    out.release()
    return save_path
