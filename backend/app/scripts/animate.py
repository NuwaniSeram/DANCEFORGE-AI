import bpy
import json
import sys
import mathutils
import os

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
# Bone Mapping Definition
# -------------------------------------------------------------------------
BONE_MAPPING = [
    # Root / Body
    ("mixamorig:Spine", "Hips", "spine_mid"),
    ("mixamorig:Spine1", "spine_mid", "chest_mid"),
    ("mixamorig:Spine2", "chest_mid", "shoulder_mid"),
    ("mixamorig:Neck", "shoulder_mid", "neck"),
    ("mixamorig:Head", "neck", "head"),
    ("mixamorig:HeadTop_End", "head", "head_top"),

    # Left Arm
    ("mixamorig:LeftShoulder", "shoulder_mid", "LEFT_SHOULDER"),
    ("mixamorig:LeftArm", "LEFT_SHOULDER", "LEFT_ELBOW"),
    ("mixamorig:LeftForeArm", "LEFT_ELBOW", "LEFT_WRIST"),
    ("mixamorig:LeftHand", "LEFT_WRIST", "left_hand_end"),

    # Right Arm
    ("mixamorig:RightShoulder", "shoulder_mid", "RIGHT_SHOULDER"),
    ("mixamorig:RightArm", "RIGHT_SHOULDER", "RIGHT_ELBOW"),
    ("mixamorig:RightForeArm", "RIGHT_ELBOW", "RIGHT_WRIST"),
    ("mixamorig:RightHand", "RIGHT_WRIST", "right_hand_end"),

    # Left Leg
    ("mixamorig:LeftUpLeg", "LEFT_HIP", "LEFT_KNEE"),
    ("mixamorig:LeftLeg", "LEFT_KNEE", "LEFT_ANKLE"),
    ("mixamorig:LeftFoot", "LEFT_ANKLE", "LEFT_FOOT_INDEX"),
    ("mixamorig:LeftToeBase", "LEFT_FOOT_INDEX", "left_toe_end"),

    # Right Leg
    ("mixamorig:RightUpLeg", "RIGHT_HIP", "RIGHT_KNEE"),
    ("mixamorig:RightLeg", "RIGHT_KNEE", "RIGHT_ANKLE"),
    ("mixamorig:RightFoot", "RIGHT_ANKLE", "RIGHT_FOOT_INDEX"),
    ("mixamorig:RightToeBase", "RIGHT_FOOT_INDEX", "right_toe_end")
]

# -------------------------------------------------------------------------
# Armature Setup
# -------------------------------------------------------------------------
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

# Ensure bones use Quaternion rotation and clear existing animations
armature_obj.animation_data_clear()
for pb in armature_obj.pose.bones:
    pb.rotation_mode = 'QUATERNION'
    pb.rotation_quaternion = (1, 0, 0, 0) # Reset to rest pose

# -------------------------------------------------------------------------
# Math Utilities
# -------------------------------------------------------------------------
def to_blender_coord(p):
    """ Convert MediaPipe (x right, y down, z depth) to Blender (X right, Y forward, Z up) """
    return mathutils.Vector((p['x'], p['z'], -p['y']))

def midpoint(p1, p2):
    return {'x': (p1['x']+p2['x'])/2.0, 'y': (p1['y']+p2['y'])/2.0, 'z': (p1['z']+p2['z'])/2.0}

def direction_vec(p1, p2):
    return {'x': p2['x']-p1['x'], 'y': p2['y']-p1['y'], 'z': p2['z']-p1['z']}

def add_dir(p, d, scale=1.0):
    return {'x': p['x']+d['x']*scale, 'y': p['y']+d['y']*scale, 'z': p['z']+d['z']*scale}

def calculate_virtual_joints(kp):
    pts = {
        'NOSE': kp[0],
        'LEFT_SHOULDER': kp[11],
        'RIGHT_SHOULDER': kp[12],
        'LEFT_ELBOW': kp[13],
        'RIGHT_ELBOW': kp[14],
        'LEFT_WRIST': kp[15],
        'RIGHT_WRIST': kp[16],
        'LEFT_HIP': kp[23],
        'RIGHT_HIP': kp[24],
        'LEFT_KNEE': kp[25],
        'RIGHT_KNEE': kp[26],
        'LEFT_ANKLE': kp[27],
        'RIGHT_ANKLE': kp[28],
        'LEFT_FOOT_INDEX': kp[31],
        'RIGHT_FOOT_INDEX': kp[32],
    }

    # Virtual joints
    pts['Hips'] = midpoint(pts['LEFT_HIP'], pts['RIGHT_HIP'])
    pts['shoulder_mid'] = midpoint(pts['LEFT_SHOULDER'], pts['RIGHT_SHOULDER'])
    
    pts['spine_mid'] = midpoint(pts['Hips'], pts['shoulder_mid'])
    pts['chest_mid'] = midpoint(pts['spine_mid'], pts['shoulder_mid'])
    
    # Neck and head
    nose_dir = direction_vec(pts['shoulder_mid'], pts['NOSE'])
    pts['neck'] = add_dir(pts['shoulder_mid'], nose_dir, 0.4)
    pts['head'] = pts['NOSE']
    pts['head_top'] = add_dir(pts['head'], nose_dir, 0.3)

    # Hands
    left_arm_dir = direction_vec(pts['LEFT_ELBOW'], pts['LEFT_WRIST'])
    pts['left_hand_end'] = add_dir(pts['LEFT_WRIST'], left_arm_dir, 0.5)
    
    right_arm_dir = direction_vec(pts['RIGHT_ELBOW'], pts['RIGHT_WRIST'])
    pts['right_hand_end'] = add_dir(pts['RIGHT_WRIST'], right_arm_dir, 0.5)

    # Feet
    left_foot_dir = direction_vec(pts['LEFT_ANKLE'], pts['LEFT_FOOT_INDEX'])
    pts['left_toe_end'] = add_dir(pts['LEFT_FOOT_INDEX'], left_foot_dir, 0.5)
    
    right_foot_dir = direction_vec(pts['RIGHT_ANKLE'], pts['RIGHT_FOOT_INDEX'])
    pts['right_toe_end'] = add_dir(pts['RIGHT_FOOT_INDEX'], right_foot_dir, 0.5)

    return pts

# -------------------------------------------------------------------------
# Smoothing Utility
# -------------------------------------------------------------------------
def smooth_frames(frames, window_size=5):
    """ Simple Moving Average to reduce jitter """
    if len(frames) < window_size:
        return frames
        
    smoothed = []
    half_w = window_size // 2
    
    for i in range(len(frames)):
        start = max(0, i - half_w)
        end = min(len(frames), i + half_w + 1)
        window = frames[start:end]
        
        # Average each keypoint
        avg_kp = []
        for kp_idx in range(len(frames[0]['keypoints'])):
            avg_x = sum(f['keypoints'][kp_idx]['x'] for f in window) / len(window)
            avg_y = sum(f['keypoints'][kp_idx]['y'] for f in window) / len(window)
            avg_z = sum(f['keypoints'][kp_idx]['z'] for f in window) / len(window)
            avg_kp.append({'x': avg_x, 'y': avg_y, 'z': avg_z})
            
        smoothed.append({'frame': frames[i]['frame'], 'keypoints': avg_kp})
        
    return smoothed

# -------------------------------------------------------------------------
# Animation Loop
# -------------------------------------------------------------------------
with open(json_path, 'r') as f:
    pose_data = json.load(f)

# Optional temporal smoothing
raw_frames = pose_data['frames']
smoothed_frames = smooth_frames(raw_frames, window_size=5)

fps = pose_data.get('fps', 24)
bpy.context.scene.render.fps = int(round(fps))
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = len(smoothed_frames)

scale = 2.5
hips_base = None

print("="*40)
print("DEBUG INFORMATION:")
print(f"Input Frame Count: {len(raw_frames)}")
print(f"Final Frame Count: {len(smoothed_frames)}")
print(f"FPS: {fps}")
print(f"Final Duration: {len(smoothed_frames)/fps:.2f} seconds")
print(f"Number of Mapped Bones: {len(BONE_MAPPING)}")
print("="*40)

for i, frame_info in enumerate(smoothed_frames, start=1):
    frame_idx = i
    keypoints = frame_info['keypoints']
    
    # Calculate virtual joints
    pts = calculate_virtual_joints(keypoints)
    
    bpy.context.scene.frame_set(frame_idx)
    
    # 1. Root / Hip Movement
    current_hips = to_blender_coord(pts['Hips'])
    
    if hips_base is None:
        hips_base = current_hips.copy()
        
    loc_offset = (current_hips - hips_base) * scale
    armature_obj.location = (
        loc_offset.x,
        loc_offset.y,
        (current_hips.z - hips_base.z) * scale
    )
    armature_obj.keyframe_insert(data_path="location", frame=frame_idx)
    
    # 2. Bone Retargeting (Forward Kinematics)
    for bone_name, p1_name, p2_name in BONE_MAPPING:
        if bone_name not in armature_obj.pose.bones:
            continue
            
        pose_bone = armature_obj.pose.bones[bone_name]
        
        # Calculate target vector
        p1 = to_blender_coord(pts[p1_name])
        p2 = to_blender_coord(pts[p2_name])
        
        import math
        if math.isnan(p1.x) or math.isnan(p2.x):
            continue
            
        target_vector = (p2 - p1)
        
        if target_vector.length < 1e-4:
            continue
            
        target_vector = target_vector.normalized()
            
        target_vec_arm = (armature_obj.matrix_world.inverted().to_3x3() @ target_vector).normalized()
        current_vec_arm = pose_bone.vector.normalized()
        
        rot_arm = current_vec_arm.rotation_difference(target_vec_arm)
        
        pose_bone.matrix = mathutils.Matrix.LocRotScale(
            pose_bone.matrix.translation,
            rot_arm @ pose_bone.matrix.to_quaternion(),
            pose_bone.matrix.to_scale()
        )
        
        bpy.context.view_layer.update()
        pose_bone.keyframe_insert(data_path="rotation_quaternion", frame=frame_idx)

# -------------------------------------------------------------------------
# Rendering Settings
# -------------------------------------------------------------------------
bpy.context.scene.render.image_settings.file_format = 'PNG'
bpy.context.scene.render.filepath = os.path.join(output_video_path, "frame_")

# Render Animation
print(f"Rendering frames to {output_video_path}...")
bpy.ops.render.render(animation=True)
print("Rendering finished!")
sys.exit(0)
