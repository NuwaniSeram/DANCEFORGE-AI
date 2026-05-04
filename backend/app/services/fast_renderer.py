import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from mpl_toolkits.mplot3d import Axes3D
import subprocess
import os

# MediaPipe pose connections for a human skeleton
POSE_CONNECTIONS = [
    (11, 12), (11, 13), (13, 15), (12, 14), (14, 16), # Arms
    (11, 23), (12, 24), (23, 24),                     # Torso
    (23, 25), (24, 26), (25, 27), (26, 28),           # Legs
    (27, 29), (28, 30), (29, 31), (30, 32),           # Feet
    (0, 1), (1, 2), (2, 3), (3, 7), (0, 4), (4, 5), (5, 6), (6, 8) # Head/Face
]

def render_fast_avatar(pose_npy_path, audio_path, output_video_path, fps=30):
    print("Starting fast local rendering...")
    poses = np.load(pose_npy_path)
    
    # Check shape, usually (frames, 99) -> 33 landmarks * 3 (x,y,z)
    if len(poses.shape) == 3 and poses.shape[0] == 1:
        poses = poses[0]
        
    num_frames = poses.shape[0]
    
    fig = plt.figure(figsize=(8, 8), facecolor='black')
    ax = fig.add_subplot(111, projection='3d')
    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
    ax.set_facecolor('black')
    
    # Hide axes
    ax.grid(False)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_zticks([])
    ax.axis('off')
    
    # Initialize scatter and lines for the avatar
    scatter = ax.scatter([], [], [], c='#00ffcc', s=50, depthshade=True)
    lines = [ax.plot([], [], [], c='#a8d8ea', linewidth=3, alpha=0.8)[0] for _ in POSE_CONNECTIONS]
    
    def update(frame_idx):
        # MediaPipe landmarks
        frame_data = poses[frame_idx].reshape(-1, 3)
        
        # Invert Y and Z for correct 3D orientation in matplotlib
        xs = frame_data[:, 0]
        ys = -frame_data[:, 1]
        zs = -frame_data[:, 2]
        
        # Update joints (scatter)
        scatter._offsets3d = (xs, zs, ys)
        
        # Update bones (lines)
        for line, connection in zip(lines, POSE_CONNECTIONS):
            p1, p2 = connection
            line.set_data([xs[p1], xs[p2]], [zs[p1], zs[p2]])
            line.set_3d_properties([ys[p1], ys[p2]])
            
        # Set dynamic limits to keep avatar centered
        ax.set_xlim([np.min(xs)-0.2, np.max(xs)+0.2])
        ax.set_ylim([np.min(zs)-0.2, np.max(zs)+0.2])
        ax.set_zlim([np.min(ys)-0.2, np.max(ys)+0.2])
        
        # Rotate camera dynamically for a cinematic look
        ax.view_init(elev=10, azim=frame_idx * 0.5)
        return [scatter] + lines

    # Create animation
    temp_video_path = output_video_path.replace(".mp4", "_temp.mp4")
    ani = animation.FuncAnimation(fig, update, frames=num_frames, blit=False)
    
    # Save the animation (requires ffmpeg)
    writer = animation.FFMpegWriter(fps=fps, bitrate=2000)
    ani.save(temp_video_path, writer=writer)
    plt.close(fig)
    
    # Merge audio using ffmpeg
    print("Merging original audio...")
    subprocess.run([
        'ffmpeg', '-y', '-i', temp_video_path, '-i', audio_path, 
        '-c:v', 'copy', '-c:a', 'aac', '-shortest', output_video_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # Clean up temp
    if os.path.exists(temp_video_path):
        os.remove(temp_video_path)
        
    print(f"Render complete! Saved to {output_video_path}")

if __name__ == "__main__":
    # Test execution
    print("Fast renderer module created.")
