import tensorflow as tf
import os

# Absolute path to project root (DANCEFORGE-AI)
BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../")
)

MODEL_PATH = os.path.join(
    BASE_DIR,
    "Models",  
    "dance_style_model.keras"
)

print("Loading model from:", MODEL_PATH)

# Load Keras v3 model
model = tf.keras.models.load_model(MODEL_PATH)

CLASS_NAMES = [
    "Contemporary",
    "HipHop",
    "Kandyan"
]

def predict_dance(frames):
    preds = model.predict(frames)
    idx = preds.argmax(axis=1)[0]
    confidence = float(preds[0][idx])
    return CLASS_NAMES[idx], confidence
