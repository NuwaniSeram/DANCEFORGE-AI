import bpy
import json
import sys
import mathutils

# -------------------------------------------------------------------------
# Argument Parsing (Blender arguments after '--')
# -------------------------------------------------------------------------
argv = sys.argv
if "--" not in argv:
    print("Error: Script requires arguments after '--'")
    sys.exit(1)

args = argv[argv.index("--") + 1:]
if len(args) < 2:
    print("Error: Required arguments: <pose_json_path> <output_video_path>")
    sys.exit(1)

json_path = args[0]
output_video_path = args[1]

# -------------------------------------------------------------------------
# Configuration & Mapping
# -------------------------------------------------------------------------
# MediaPipe indices:
# 11: left shoulder, 13: left elbow, 15: left wrist
# 12: right shoulder, 14: right elbow, 16: right wrist
# 23: left hip, 25: left knee, 27: left ankle
# 24: right hip, 26: right knee, 28: right ankle

# Map bones to the (start, end) MediaPipe keypoints to compute direction vectors
# Adjust bone names to match your specific rig (e.g., Mixamo rigs use 'mixamorig:LeftArm')
BONE_MAPPING = {
    "UpperArm.L": (11, 13),
    "LowerArm.L": (13, 15),
    "UpperArm.R": (12, 14),
    "LowerArm.R": (14, 16),
    "UpperLeg.L": (23, 25),
    "LowerLeg.L": (25, 27),
    "UpperLeg.R": (24, 26),
    "LowerLeg.R": (26, 28)
}

# Find the armature in the scene
armature_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        armature_obj = obj
        break

if not armature_obj:
    print("Error: No armature found in the scene.")
    sys.exit(1)

bpy.context.view_layer.objects.active = armature_obj
bpy.ops.object.mode_set(mode='POSE')

# Ensure bones use Quaternion rotation
for pb in armature_obj.pose.bones:
    pb.rotation_mode = 'QUATERNION'

# -------------------------------------------------------------------------
# Math Utilities
# -------------------------------------------------------------------------
def get_mp_vector(keypoints, idx1, idx2):
    """ Get a vector from idx1 to idx2, adjusting MediaPipe space to Blender space """
    p1 = keypoints[idx1]
    p2 = keypoints[idx2]
    # MediaPipe: X right, Y down, Z depth. Blender: X right, Y forward, Z up.
    # Convert MediaPipe coordinates to Blender coordinates:
    v1 = mathutils.Vector((p1['x'], -p1['z'], -p1['y']))
    v2 = mathutils.Vector((p2['x'], -p2['z'], -p2['y']))
    direction = (v2 - v1).normalized()
    return direction

# -------------------------------------------------------------------------
# Animation Loop
# -------------------------------------------------------------------------
with open(json_path, 'r') as f:
    pose_data = json.load(f)

fps = pose_data.get('fps', 30)
bpy.context.scene.render.fps = int(fps)
bpy.context.scene.frame_start = 0
bpy.context.scene.frame_end = pose_data['num_frames'] - 1

for frame_info in pose_data['frames']:
    frame_idx = frame_info['frame']
    keypoints = frame_info['keypoints']
    
    bpy.context.scene.frame_set(frame_idx)
    
    for bone_name, (idx1, idx2) in BONE_MAPPING.items():
        if bone_name not in armature_obj.pose.bones:
            # Skip if bone name doesn't match the armature
            continue
            
        pose_bone = armature_obj.pose.bones[bone_name]
        
        # 1. Target vector from MediaPipe
        target_vector = get_mp_vector(keypoints, idx1, idx2)
        if target_vector.length == 0:
            continue
            
        # 2. Get the bone's rest vector in armature space
        # bone.vector is the rest direction of the bone
        rest_vector = pose_bone.bone.vector.normalized()
        
        # 3. Calculate rotation from rest_vector to target_vector
        rotation_quat = rest_vector.rotation_difference(target_vector)
        
        # 4. Apply rotation and insert keyframe
        pose_bone.rotation_quaternion = rotation_quat
        pose_bone.keyframe_insert(data_path="rotation_quaternion", frame=frame_idx)

# -------------------------------------------------------------------------
# Rendering Settings
# -------------------------------------------------------------------------
bpy.context.scene.render.fps = int(round(fps))
import os
# Blender 5.x compatible PNG output settings
bpy.context.scene.render.image_settings.file_format = 'PNG'
bpy.context.scene.render.filepath = os.path.join(output_video_path, "frame_")

# Render Animation
print(f"Rendering frames to {output_video_path}...")
bpy.ops.render.render(animation=True)
print("Rendering finished!")
sys.exit(0)
