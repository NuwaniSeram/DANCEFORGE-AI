import cv2
import numpy as np

IMG_SIZE = 224
MAX_FRAMES = 30

def extract_frames(video_path):
    cap = cv2.VideoCapture(video_path)
    frames = []

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    step = max(total // MAX_FRAMES, 1)

    i = 0
    while len(frames) < MAX_FRAMES:
        ret, frame = cap.read()
        if not ret:
            break

        if i % step == 0:
            frame = cv2.resize(frame, (IMG_SIZE, IMG_SIZE))
            frame = frame / 255.0
            frames.append(frame)
        i += 1

    cap.release()

    # pad frames
    while len(frames) < MAX_FRAMES:
        frames.append(frames[-1])

    return np.expand_dims(np.array(frames), axis=0)
