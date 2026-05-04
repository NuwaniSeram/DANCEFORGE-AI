import numpy as np
import json
import subprocess
import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
BLENDER_PATH = r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
BLEND_FILE = str(BASE_DIR / "Models" / "avatar.blend") # Your rigged avatar file
ANIMATE_SCRIPT = str(BASE_DIR / "backend" / "app" / "scripts" / "animate.py")

def export_pose_to_json(pose_npy_path, json_path, fps=30):
    """
    Converts a MediaPipe pose NumPy array into a JSON format usable by Blender.
    """
    poses = np.load(pose_npy_path)
    
    # Handle shape (frames, 99)
    if len(poses.shape) == 3 and poses.shape[0] == 1:
        poses = poses[0]
        
    num_frames = poses.shape[0]
    frames_data = []
    
    for frame_idx in range(num_frames):
        frame_data = poses[frame_idx].reshape(-1, 3) # 33 landmarks, each (x, y, z)
        keypoints = []
        for lm in frame_data:
            # Note: MediaPipe outputs normalized coordinates.
            keypoints.append({
                "x": float(lm[0]),
                "y": float(lm[1]),
                "z": float(lm[2])
            })
            
        frames_data.append({
            "frame": frame_idx,
            "keypoints": keypoints
        })
        
    output_data = {
        "fps": fps,
        "num_frames": num_frames,
        "frames": frames_data
    }
    
    with open(json_path, 'w') as f:
        json.dump(output_data, f)
        
    return json_path

def render_blender_avatar(pose_npy_path, audio_path, output_video_path, fps=30):
    print("Starting headless Blender rendering...")
    
    # 1. Generate JSON from NPY
    json_path = pose_npy_path.replace(".npy", ".json")
    export_pose_to_json(pose_npy_path, json_path, fps)
    
    import shutil
    
    job_dir = os.path.dirname(output_video_path)
    frames_dir = os.path.join(job_dir, "temp_frames")
    os.makedirs(frames_dir, exist_ok=True)
    
    # 2. Run Blender Headless
    blender_cmd = [
        BLENDER_PATH,
        "-b", BLEND_FILE,            # Run in background with the base avatar file
        "-P", ANIMATE_SCRIPT,        # Run our python script
        "--",                        # Separator for script arguments
        json_path,                   # Arg 1: path to pose json
        frames_dir                   # Arg 2: path to output temp frames directory
    ]
    
    print(f"Executing: {' '.join(blender_cmd)}")
    
    try:
        # Run blender process
        subprocess.run(blender_cmd, check=True)
        
        # 3. Merge frames and audio using ffmpeg
        print("Merging frames and original audio...")
        frames_pattern = os.path.join(frames_dir, "frame_%04d.png")
        
        ffmpeg_cmd = [
            'ffmpeg', '-y', '-framerate', str(fps), '-start_number', '1', '-i', frames_pattern,
            '-i', audio_path, '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-shortest', output_video_path
        ]
        subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        if not os.path.exists(output_video_path) or os.path.getsize(output_video_path) == 0:
            raise RuntimeError("FFmpeg created an empty file or failed to create the output.")
            
        print(f"Render complete! Saved to {output_video_path}")
    except subprocess.CalledProcessError as e:
        print(f"Blender or FFmpeg rendering failed: {e}")
        raise
    finally:
        # Clean up temp files
        if os.path.exists(frames_dir):
            shutil.rmtree(frames_dir)
        if os.path.exists(json_path):
            os.remove(json_path)
