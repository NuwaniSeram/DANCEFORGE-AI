from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from pathlib import Path
import uuid

from app.model.transformer import predict_style_transfer, STYLE_NAMES, TARGET_FRAMES

router = APIRouter()

# --------------------------------------------------
# Directories
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# --------------------------------------------------
# Visualization settings (🔥 IMPORTANT)
# --------------------------------------------------
FRAME_SIZE = (720, 720)
BG_COLOR = (15, 15, 15)

JOINT_RADIUS = 7
LIMB_THICKNESS = 6

SLOW_DOWN_FACTOR = 1.6      # higher = slower
INTERPOLATION_STEPS = 2     # smoother motion

# --------------------------------------------------
# MediaPipe Pose
# --------------------------------------------------
POSE_MODEL_PATH = BASE_DIR / "Models" / "pose_landmarker_full.task"

class PoseExtractor:
    def __init__(self, model_path):
        base_options = python.BaseOptions(model_asset_path=str(model_path))
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            output_segmentation_masks=False,
            num_poses=1
        )
        self.detector = vision.PoseLandmarker.create_from_options(options)

    def extract_poses_from_video(self, video_path):
        cap = cv2.VideoCapture(str(video_path))
        poses = []
        fps = cap.get(cv2.CAP_PROP_FPS) or 30

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb
            )

            result = self.detector.detect(mp_image)

            if result.pose_landmarks:
                vec = []
                for lm in result.pose_landmarks[0]:
                    vec.extend([lm.x, lm.y, lm.z])
                poses.append(vec)
            else:
                poses.append(poses[-1] if poses else [0.0] * 99)

        cap.release()
        return np.array(poses), fps


pose_extractor = PoseExtractor(POSE_MODEL_PATH)

# --------------------------------------------------
# Utilities
# --------------------------------------------------
def normalize_sequence_length(poses, target_frames):
    if len(poses) > target_frames:
        idx = np.linspace(0, len(poses) - 1, target_frames, dtype=int)
        return poses[idx]
    elif len(poses) < target_frames:
        pad = np.repeat([poses[-1]], target_frames - len(poses), axis=0)
        return np.vstack([poses, pad])
    return poses

def smooth_pose_sequence(poses, window=5):
    """
    Moving average smoothing
    """
    if len(poses) < window:
        return poses

    smoothed = np.copy(poses)
    for i in range(len(poses)):
        start = max(0, i - window // 2)
        end = min(len(poses), i + window // 2)
        smoothed[i] = np.mean(poses[start:end], axis=0)

    return smoothed


# OpenPose-style skeleton connections
POSE_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 7),
    (0, 4), (4, 5), (5, 6), (6, 8),

    (9, 10),
    (11, 12),

    (9, 11), (11, 13), (13, 15),
    (10, 12), (12, 14), (14, 16),
]


def interpolate_poses(a, b, steps):
    frames = []
    for i in range(1, steps + 1):
        alpha = i / (steps + 1)
        frames.append((1 - alpha) * a + alpha * b)
    return frames


def draw_openpose_style(frame, landmarks):
    h, w = frame.shape[:2]

    # limbs
    for s, e in POSE_CONNECTIONS:
        x1, y1 = int(landmarks[s][0] * w), int(landmarks[s][1] * h)
        x2, y2 = int(landmarks[e][0] * w), int(landmarks[e][1] * h)
        if 0 <= x1 < w and 0 <= y1 < h and 0 <= x2 < w and 0 <= y2 < h:
            cv2.line(frame, (x1, y1), (x2, y2),
                     (0, 255, 255), LIMB_THICKNESS)

    # joints
    for lm in landmarks:
        x, y = int(lm[0] * w), int(lm[1] * h)
        if 0 <= x < w and 0 <= y < h:
            cv2.circle(frame, (x, y),
                       JOINT_RADIUS, (255, 255, 255), -1)

    return frame


def generate_stick_figure_video(poses, output_path, fps):
    fps = max(10, int(fps / SLOW_DOWN_FACTOR))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(
        str(output_path),
        fourcc,
        fps,
        FRAME_SIZE
    )

    if not out.isOpened():
        raise RuntimeError("VideoWriter failed")

    for i in range(len(poses) - 1):
        base = poses[i]
        next_pose = poses[i + 1]

        frames = [base] + interpolate_poses(
            base, next_pose, INTERPOLATION_STEPS
        )

        for pose in frames:
            frame = np.zeros(
                (FRAME_SIZE[1], FRAME_SIZE[0], 3),
                dtype=np.uint8
            )
            frame[:] = BG_COLOR

            landmarks = pose.reshape(-1, 3)[:, :2]
            frame = draw_openpose_style(frame, landmarks)

            out.write(frame)

    out.release()

# --------------------------------------------------
# Style Normalization
# --------------------------------------------------
STYLE_ALIASES = {
    "hiphop": "HipHop",
    "hip hop": "HipHop",
    "hip-hop": "HipHop",
    "kandyan": "Kandyan",
    "contemporary": "Contemporary"
}

def normalize_style(style: str):
    return STYLE_ALIASES.get(style.lower().strip(), style.strip())

# --------------------------------------------------
# API
# --------------------------------------------------
@router.post("/transform")
async def transform_video(
    file: UploadFile = File(...),
    target_style: str = "HipHop"
):
    try:
        target_style = normalize_style(target_style)

        if target_style not in STYLE_NAMES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid style. Choose from {STYLE_NAMES}"
            )

        video_id = str(uuid.uuid4())
        upload_path = UPLOAD_DIR / f"{video_id}_{file.filename}"

        with open(upload_path, "wb") as f:
            f.write(await file.read())

        poses, fps = pose_extractor.extract_poses_from_video(upload_path)
        poses = normalize_sequence_length(poses, TARGET_FRAMES)

        transformed = predict_style_transfer(poses, target_style)
        transformed = smooth_pose_sequence(transformed, window=7)


        output_path = OUTPUT_DIR / f"{video_id}_{target_style}.mp4"
        generate_stick_figure_video(transformed, output_path, fps)

        return FileResponse(
            path=str(output_path),
            media_type="video/mp4",
            filename=output_path.name
        )

    except Exception as e:
        print("Transform error:", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/styles")
async def get_available_styles():
    return {"styles": STYLE_NAMES}

# from fastapi import APIRouter, UploadFile, File, HTTPException
# from fastapi.responses import FileResponse
# from pathlib import Path
# import uuid
# import cv2
# import numpy as np
# import mediapipe as mp
# from mediapipe.tasks import python
# from mediapipe.tasks.python import vision

# from app.model.transformer import predict_style_transfer, STYLE_NAMES, TARGET_FRAMES

# router = APIRouter()

# # ------------------------------------------------------------------
# # Directories
# # ------------------------------------------------------------------
# BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
# UPLOAD_DIR = BASE_DIR / "uploads"
# OUTPUT_DIR = BASE_DIR / "outputs"
# UPLOAD_DIR.mkdir(exist_ok=True)
# OUTPUT_DIR.mkdir(exist_ok=True)

# # ------------------------------------------------------------------
# # MediaPipe Pose Setup
# # ------------------------------------------------------------------
# POSE_MODEL_PATH = BASE_DIR / "Models" / "pose_landmarker_full.task"

# class PoseExtractor:
#     def __init__(self, model_path):
#         base_options = python.BaseOptions(model_asset_path=str(model_path))
#         options = vision.PoseLandmarkerOptions(
#             base_options=base_options,
#             output_segmentation_masks=False,
#             num_poses=1
#         )
#         self.detector = vision.PoseLandmarker.create_from_options(options)

#     def extract_poses_from_video(self, video_path):
#         cap = cv2.VideoCapture(str(video_path))
#         poses = []
#         fps = cap.get(cv2.CAP_PROP_FPS)
#         if fps is None or fps <= 0:
#             fps = 30

#         while cap.isOpened():
#             ret, frame = cap.read()
#             if not ret:
#                 break

#             rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#             mp_image = mp.Image(
#                 image_format=mp.ImageFormat.SRGB,
#                 data=rgb_frame
#             )

#             result = self.detector.detect(mp_image)

#             if result.pose_landmarks:
#                 landmarks = result.pose_landmarks[0]
#                 pose_vector = []
#                 for lm in landmarks:
#                     pose_vector.extend([lm.x, lm.y, lm.z])
#                 poses.append(pose_vector)
#             else:
#                 poses.append(poses[-1] if poses else [0.0]*99)

#         cap.release()
#         return np.array(poses), fps

# pose_extractor = PoseExtractor(POSE_MODEL_PATH)

# # ------------------------------------------------------------------
# # Utilities
# # ------------------------------------------------------------------
# def normalize_sequence_length(poses, target_frames):
#     if len(poses) > target_frames:
#         idx = np.linspace(0, len(poses)-1, target_frames, dtype=int)
#         return poses[idx]
#     elif len(poses) < target_frames:
#         pad = np.repeat([poses[-1]], target_frames - len(poses), axis=0)
#         return np.vstack([poses, pad])
#     return poses

# # ------------------------------------------------------------------
# # Draw 2D Filled Body Parts (Silhouette)
# # ------------------------------------------------------------------
# BODY_CONNECTIONS = [
#     (11, 13), (13, 15),  # Left arm
#     (12, 14), (14, 16),  # Right arm
#     (11, 12),             # Shoulders
#     (11, 23), (12, 24), (23, 24),  # Torso
#     (23, 25), (25, 27),  # Left leg
#     (24, 26), (26, 28)   # Right leg
# ]

# def draw_silhouette(frame, landmarks, connections, color=(0, 255, 0)):
#     h, w = frame.shape[:2]
    
#     # Convert landmarks to pixel coordinates
#     points = [(int(lm[0]*w), int(lm[1]*h)) for lm in landmarks]

#     # Draw filled limbs as thick polygons / lines
#     for start, end in connections:
#         if 0 <= start < len(points) and 0 <= end < len(points):
#             cv2.line(frame, points[start], points[end], color, thickness=12)

#     # Draw torso and head as filled ellipse
#     if len(points) > 23:
#         torso_pts = np.array([points[11], points[12], points[24], points[23]], np.int32)
#         cv2.fillPoly(frame, [torso_pts], color)
#     if len(points) > 0:
#         cv2.circle(frame, points[0], 15, color, -1)  # Head

#     return frame

# def generate_silhouette_video(pose_sequence, output_path, fps, frame_size=(640,480), slow_factor=0.5):
#     if len(pose_sequence) == 0:
#         raise ValueError("Pose sequence is empty")

#     fourcc = cv2.VideoWriter_fourcc(*'mp4v')
#     out = cv2.VideoWriter(str(output_path), fourcc, fps*slow_factor, frame_size)

#     if not out.isOpened():
#         raise RuntimeError("VideoWriter failed to open")

#     for pose in pose_sequence:
#         frame = np.zeros((frame_size[1], frame_size[0],3), dtype=np.uint8)
#         frame[:] = (30,30,30)
#         landmarks = pose.reshape(-1,3)[:,:2]
#         frame = draw_silhouette(frame, landmarks, BODY_CONNECTIONS)
#         out.write(frame)

#     out.release()

# # ------------------------------------------------------------------
# # Style Normalization
# # ------------------------------------------------------------------
# STYLE_ALIASES = {
#     "hiphop": "HipHop",
#     "hip hop": "HipHop",
#     "hip-hop": "HipHop",
#     "kandyan": "Kandyan",
#     "contemporary": "Contemporary"
# }

# def normalize_style(style: str) -> str:
#     if not style:
#         return ""
#     key = style.strip().lower()
#     return STYLE_ALIASES.get(key, style.strip())

# # ------------------------------------------------------------------
# # API
# # ------------------------------------------------------------------
# @router.post("/transform")
# async def transform_video(file: UploadFile = File(...), target_style: str = "HipHop"):
#     try:
#         target_style = normalize_style(target_style)
#         if target_style not in STYLE_NAMES:
#             raise HTTPException(status_code=400, detail=f"Invalid style: {STYLE_NAMES}")

#         video_id = str(uuid.uuid4())
#         upload_path = UPLOAD_DIR / f"{video_id}_{file.filename}"
#         with open(upload_path, "wb") as f:
#             f.write(await file.read())

#         poses, fps = pose_extractor.extract_poses_from_video(upload_path)
#         if len(poses)==0:
#             raise HTTPException(status_code=400, detail="No poses detected.")

#         poses = normalize_sequence_length(poses, TARGET_FRAMES)
#         transformed = predict_style_transfer(poses, target_style)

#         output_file = OUTPUT_DIR / f"{video_id}_{target_style}.mp4"
#         # Generate silhouette video with slower playback (slow_factor=0.5 => half speed)
#         generate_silhouette_video(transformed, output_file, fps, slow_factor=0.5)

#         return FileResponse(
#             path=str(output_file),
#             media_type="video/mp4",
#             filename=output_file.name,
#             headers={"X-Video-ID": video_id, "X-Target-Style": target_style}
#         )

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


# @router.get("/styles")
# async def get_available_styles():
#     return {"styles": STYLE_NAMES}

# from fastapi import APIRouter, UploadFile, File, HTTPException
# from fastapi.responses import FileResponse
# from pathlib import Path
# import uuid
# import cv2
# import numpy as np
# import torch
# import imageio

# # VIBE + SMPL imports
# import sys
# VIBE_DIR = str(Path(__file__).resolve().parent.parent.parent / "VIBE")
# sys.path.append(VIBE_DIR)
# from lib.models.vibe import VIBE
# from lib.utils.demo_utils import image_list_to_batch, convert_crop_cam_to_orig_img

# from smplx import SMPL
# from pytorch3d.renderer import (
#     PerspectiveCameras, MeshRenderer, MeshRasterizer, SoftPhongShader,
#     PointLights, TexturesVertex
# )
# from pytorch3d.structures import Meshes

# router = APIRouter()

# BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
# UPLOAD_DIR = BASE_DIR / "uploads"
# OUTPUT_DIR = BASE_DIR / "outputs"
# UPLOAD_DIR.mkdir(exist_ok=True)
# OUTPUT_DIR.mkdir(exist_ok=True)

# # -------------------------------
# # Load VIBE model (pretrained)
# # -------------------------------
# DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
# VIBE_MODEL_PATH = VIBE_DIR + "/checkpoints/vibe_model.pth"
# vibe_model = VIBE(config=None).to(DEVICE).eval()
# vibe_model.load_state_dict(torch.load(VIBE_MODEL_PATH, map_location=DEVICE))

# # -------------------------------
# # SMPL Model
# # -------------------------------
# SMPL_MODEL_PATH = str(BASE_DIR / "Models" / "smpl")
# smpl_model = SMPL(model_path=SMPL_MODEL_PATH, gender='NEUTRAL', batch_size=1).to(DEVICE)

# # -------------------------------
# # API
# # -------------------------------
# @router.post("/transform3d")
# async def transform_video_3d(file: UploadFile = File(...)):
#     try:
#         video_id = str(uuid.uuid4())
#         upload_path = UPLOAD_DIR / f"{video_id}_{file.filename}"
#         with open(upload_path, "wb") as f:
#             f.write(await file.read())

#         # -------------------------------
#         # Step 1: Read video frames
#         # -------------------------------
#         cap = cv2.VideoCapture(str(upload_path))
#         frames = []
#         while True:
#             ret, frame = cap.read()
#             if not ret:
#                 break
#             frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#             frames.append(frame)
#         cap.release()

#         if len(frames) == 0:
#             raise HTTPException(status_code=400, detail="No frames found in video")

#         # -------------------------------
#         # Step 2: Run VIBE (3D pose + SMPL parameters)
#         # -------------------------------
#         imgs_tensor, _ = image_list_to_batch(frames)
#         imgs_tensor = imgs_tensor.to(DEVICE)
#         with torch.no_grad():
#             pred_rotmat, pred_betas, pred_camera = vibe_model(imgs_tensor, None)

#         # -------------------------------
#         # Step 3: Render each mesh frame using PyTorch3D
#         # -------------------------------
#         H, W = frames[0].shape[:2]
#         output_file = OUTPUT_DIR / f"{video_id}_3d.mp4"
#         writer = imageio.get_writer(str(output_file), fps=25)

#         # Setup PyTorch3D renderer
#         cameras = PerspectiveCameras(device=DEVICE)
#         lights = PointLights(device=DEVICE, location=[[0.0, 0.0, -3.0]])
#         renderer = MeshRenderer(
#             rasterizer=MeshRasterizer(cameras=cameras),
#             shader=SoftPhongShader(device=DEVICE, lights=lights, cameras=cameras)
#         )

#         for i in range(len(frames)):
#             # Get SMPL vertices
#             smpl_out = smpl_model(
#                 body_pose=pred_rotmat[i, 1:],
#                 global_orient=pred_rotmat[i, 0].unsqueeze(0),
#                 betas=pred_betas[i].unsqueeze(0)
#             )
#             verts = smpl_out.vertices
#             faces = torch.tensor(smpl_model.faces.astype(np.int64), device=DEVICE)
#             textures = TexturesVertex(verts_features=torch.ones_like(verts))
#             mesh = Meshes(verts=verts, faces=faces.unsqueeze(0), textures=textures)

#             # Render
#             images = renderer(mesh)
#             img_np = images[0, ..., :3].cpu().numpy()
#             img_np = (img_np * 255).astype(np.uint8)
#             writer.append_data(img_np)

#         writer.close()

#         return FileResponse(
#             path=str(output_file),
#             media_type="video/mp4",
#             filename=output_file.name
#         )

#     except Exception as e:
#         print("3D Transform error:", e)
#         raise HTTPException(status_code=500, detail=str(e))

