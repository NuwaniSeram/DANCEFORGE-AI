# import tensorflow as tf
# import numpy as np
# import os
# from app.utils.video_processing_transformer import video_to_skeleton_sequence, skeleton_sequence_to_video

# # MODEL_PATH = "../../../Models/dance_style_transformer.keras"
# # Get absolute path to this file
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# # Go to project root → Models
# MODEL_PATH = os.path.abspath(
#     os.path.join(BASE_DIR, "../../../Models/dance_style_transformer.keras")
# )
# model = tf.keras.models.load_model(MODEL_PATH)
# print("Loaded dance style transformer model!")

# def predict_style_transfer(video_path, target_style="Contemporary"):
#     # Convert video to skeleton sequence
#     skeleton_seq = video_to_skeleton_sequence(video_path)
#     skeleton_seq_input = np.expand_dims(skeleton_seq, axis=0)

#     # TODO: If your model is style-conditioned, you can add one-hot target_style here
#     transformed_seq = model.predict(skeleton_seq_input)[0]
    
#     # Convert back to skeleton video
#     output_path = skeleton_sequence_to_video(transformed_seq)
#     return output_path


# backend/app/model/transformer.py
import tensorflow as tf
import numpy as np
import json
import os
from pathlib import Path

# Import the model architecture
from app.model.model_architecture import SimpleDanceStyleTransformer

# Setup paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
MODELS_DIR = BASE_DIR / "Models"
WEIGHTS_PATH = str(MODELS_DIR / "dance_style_model.weights.h5")  # Fixed filename
CONFIG_PATH = str(MODELS_DIR / "model_config.json")

print(f"Loading model configuration from: {CONFIG_PATH}")

# Load configuration
with open(CONFIG_PATH, 'r') as f:
    config = json.load(f)

STYLE_NAMES = config['style_names']
NUM_STYLES = config['num_styles']
LATENT_DIM = config['latent_dim']
TARGET_FRAMES = config['target_frames']

print(f"Configuration loaded:")
print(f"  - Styles: {STYLE_NAMES}")
print(f"  - Num styles: {NUM_STYLES}")
print(f"  - Latent dim: {LATENT_DIM}")
print(f"  - Target frames: {TARGET_FRAMES}")

# Create model
print("Creating model architecture...")
model = SimpleDanceStyleTransformer(num_styles=NUM_STYLES, latent_dim=LATENT_DIM)

# Initialize model with dummy input
print("Initializing model...")
dummy_input = tf.random.normal((1, TARGET_FRAMES, 99))
dummy_style = tf.constant([0])
_ = model(dummy_input, dummy_style)

# Load weights
print(f"Loading weights from: {WEIGHTS_PATH}")
model.load_weights(WEIGHTS_PATH)
print("✓ Model loaded successfully!")

def predict_style_transfer(input_sequence, target_style_name):
    """
    Transform dance style
    
    Args:
        input_sequence: numpy array of shape (num_frames, 99) or (1, num_frames, 99)
        target_style_name: str, one of ['Contemporary', 'Hiphop', 'Kandyan']
    
    Returns:
        transformed_sequence: numpy array of shape (num_frames, 99)
    """
    # Get target style index
    if target_style_name not in STYLE_NAMES:
        raise ValueError(f"Invalid style name. Must be one of {STYLE_NAMES}")
    
    target_style_idx = STYLE_NAMES.index(target_style_name)
    
    # Add batch dimension if needed
    if len(input_sequence.shape) == 2:
        input_sequence = input_sequence[None, ...]
    
    # Ensure correct shape
    if input_sequence.shape[1] != TARGET_FRAMES:
        # Resample to target frames
        from scipy import interpolate
        original_frames = input_sequence.shape[1]
        x_old = np.linspace(0, 1, original_frames)
        x_new = np.linspace(0, 1, TARGET_FRAMES)
        
        resampled = np.zeros((1, TARGET_FRAMES, 99))
        for i in range(99):
            f = interpolate.interp1d(x_old, input_sequence[0, :, i])
            resampled[0, :, i] = f(x_new)
        input_sequence = resampled
    
    # Create target style tensor
    target_style = np.array([target_style_idx])
    
    # Transform
    transformed = model(input_sequence, target_style, training=False)
    
    return transformed.numpy()[0]

def get_available_styles():
    """Return list of available style names"""
    return STYLE_NAMES

print("\n✓ Transformer module ready!")