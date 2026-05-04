# Blender Rendering Pipeline Upgrade

I have updated your backend to replace the `matplotlib` skeleton renderer with a robust headless Blender rendering pipeline. Here is a comprehensive overview of how it works and what you need to configure.

## 1. How it works (FastAPI Pipeline)
1. **Pose Extraction**: Your API receives a video and extracts MediaPipe keypoints (still done via your `PoseExtractor`).
2. **Pose Conversion**: The `export_pose_to_json` function in `blender_renderer.py` converts the `.npy` NumPy array into a structured `pose_data.json` file.
3. **Headless Render**: The backend runs `blender -b avatar.blend -P animate.py -- pose.json temp_video.mp4`.
4. **Audio Sync**: Finally, `ffmpeg` merges the original audio back into the rendered `MP4`.

## 2. Sample `pose_data.json` Structure
This is the structure exported by the backend and ingested by the Blender script:
```json
{
  "fps": 30.0,
  "num_frames": 150,
  "frames": [
    {
      "frame": 0,
      "keypoints": [
        {"x": 0.52, "y": 0.21, "z": -0.15},
        // ... (33 MediaPipe keypoints total)
      ]
    },
    {
      "frame": 1,
      "keypoints": [
        // ...
      ]
    }
  ]
}
```
*Note: MediaPipe outputs coordinates where `x` and `y` are normalized `[0.0, 1.0]`. Our Blender script converts this MediaPipe space into Blender's 3D space.*

## 3. MediaPipe to Blender Rig Mapping
MediaPipe provides 33 landmarks. We use these landmarks to construct direction vectors that align the bones of your avatar.

**MediaPipe Keypoints used**:
* **Arms**: Left Shoulder (11), Right Shoulder (12), Left Elbow (13), Right Elbow (14), Left Wrist (15), Right Wrist (16)
* **Legs**: Left Hip (23), Right Hip (24), Left Knee (25), Right Knee (26), Left Ankle (27), Right Ankle (28)

**Bone Mapping (Mixamo Rig Naming)**:
In `backend/app/scripts/animate.py`, you will find the `BONE_MAPPING` dictionary. Update the keys if your rig uses different naming conventions (e.g., Mixamo rigs often use `mixamorig:LeftArm` instead of `UpperArm.L`).
```python
BONE_MAPPING = {
    # Arms
    "mixamorig:LeftArm": (11, 13),
    "mixamorig:LeftForeArm": (13, 15),
    "mixamorig:RightArm": (12, 14),
    "mixamorig:RightForeArm": (14, 16),

    # Legs
    "mixamorig:LeftUpLeg": (23, 25),
    "mixamorig:LeftLeg": (25, 27),
    "mixamorig:RightUpLeg": (24, 26),
    "mixamorig:RightLeg": (26, 28),
}
```

## 4. Required Blender Setup
For this to work smoothly without issues on your server or local machine:

1. **Avatar Setup (`avatar.blend`)**:
   * Create a folder named `Models` in the project root if it doesn't exist.
   * Place your rigged character in `Models/avatar.blend`.
   * **Important**: Ensure the character is rigged with an Armature. The bones should match the naming in `BONE_MAPPING`.
2. **Path Variables**:
   * Ensure `blender` is in your system's `PATH` environment variable. If not, update `BLENDER_EXECUTABLE` in `backend/app/services/blender_renderer.py` to point to the exact `blender.exe` path.
3. **Blender Render Settings (handled via script)**:
   * The script automatically configures output rendering as `FFMPEG` / `MPEG4` / `H264`.
   * The script automatically syncs the Blender timeline `fps` and `frame_end` to match the video JSON metadata.

## 5. Overview of the Code Provided
I created/modified the following files for you:
* **`backend/app/services/blender_renderer.py`**: Handles generating the JSON and spawning the Headless Blender process.
* **`backend/app/scripts/animate.py`**: The Blender Python API script that calculates vectors, computes Quaternions (`rotation_difference`), keyframes the bones, and executes the render.
* **`backend/app/routes/transform.py`**: Updated the endpoint to queue `render_blender_avatar` instead of the old `matplotlib` renderer.

### Example logic from `animate.py` (Vector to Rotation)
```python
# Extract rest vector of the bone
rest_vector = pose_bone.bone.vector.normalized()

# Calculate vector between MediaPipe joints
target_vector = get_mp_vector(keypoints, idx1, idx2)

# Compute Quaternion difference
rotation_quat = rest_vector.rotation_difference(target_vector)

# Apply and Keyframe
pose_bone.rotation_quaternion = rotation_quat
pose_bone.keyframe_insert(data_path="rotation_quaternion", frame=frame_idx)
```
