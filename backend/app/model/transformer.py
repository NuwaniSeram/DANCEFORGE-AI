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
WEIGHTS_PATH = str(MODELS_DIR / "dance_style_model.weights.h5")
CONFIG_PATH = str(MODELS_DIR / "model_config.json")

print(f"Loading model configuration from: {CONFIG_PATH}")

# Load configuration
with open(CONFIG_PATH, 'r') as f:
    config = json.load(f)

# Original style names from training
STYLE_NAMES_ORIGINAL = config['style_names']  # ['Contemporary', 'HipHop', 'Kandyan']

# Map common variations to original names
STYLE_MAPPING = {
    # Contemporary variations
    'contemporary': 'Contemporary',
    'Contemporary': 'Contemporary',
    'CONTEMPORARY': 'Contemporary',
    
    # HipHop variations
    'hiphop': 'HipHop',
    'Hiphop': 'HipHop',
    'HipHop': 'HipHop',
    'HIPHOP': 'HipHop',
    'hip hop': 'HipHop',
    'Hip Hop': 'HipHop',
    'Hip hop': 'HipHop',
    
    # Kandyan variations
    'kandyan': 'Kandyan',
    'Kandyan': 'Kandyan',
    'KANDYAN': 'Kandyan',
}

# Exposed style names (what frontend can use)
STYLE_NAMES = list(set(STYLE_MAPPING.values()))

NUM_STYLES = config['num_styles']
LATENT_DIM = config['latent_dim']
TARGET_FRAMES = config['target_frames']

print(f"Configuration loaded:")
print(f"  - Styles: {STYLE_NAMES}")
print(f"  - Original names: {STYLE_NAMES_ORIGINAL}")
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

def normalize_style_name(style_name):
    """Normalize style name to match training data"""
    if style_name in STYLE_MAPPING:
        return STYLE_MAPPING[style_name]
    
    # Try case-insensitive match
    for key, value in STYLE_MAPPING.items():
        if key.lower() == style_name.lower():
            return value
    
    # If no match found, return None
    return None

def predict_style_transfer(input_sequence, target_style_name):
    """
    Transform dance style
    
    Args:
        input_sequence: numpy array of shape (num_frames, 99) or (1, num_frames, 99)
        target_style_name: str, one of the accepted style names
    
    Returns:
        transformed_sequence: numpy array of shape (num_frames, 99)
    """
    # Normalize the style name
    normalized_style = normalize_style_name(target_style_name)
    
    if normalized_style is None:
        raise ValueError(
            f"Invalid target style '{target_style_name}'. "
            f"Must be one of {STYLE_NAMES} (case-insensitive)"
        )
    
    # Get the index from original training names
    try:
        target_style_idx = STYLE_NAMES_ORIGINAL.index(normalized_style)
    except ValueError:
        raise ValueError(
            f"Style '{normalized_style}' not found in training data. "
            f"Available styles: {STYLE_NAMES_ORIGINAL}"
        )
    
    print(f"Transforming to style: {target_style_name} -> {normalized_style} (index: {target_style_idx})")
    
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