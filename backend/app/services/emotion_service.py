import os
import re
import torch
from dotenv import load_dotenv
from unsloth import FastLanguageModel
from transformers import AutoTokenizer

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN", "")
MODEL_REPO = os.getenv("MODEL_REPO", "")
TOKENIZER_REPO = os.getenv("TOKENIZER_REPO", "")

CLASSES = [
    "Shringara", "Hasya", "Karuna", "Roudhra", "Veera",
    "Bhayanakam", "Bhibatsa", "Adbhutha", "Shantha"
]
CLASS_PATTERN = re.compile(r"\b(" + "|".join(CLASSES) + r")\b", re.IGNORECASE)

alpaca_prompt = """Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.

### Instruction:
{}

### Input:
{}

### Response:
"""

INSTRUCTION = (
    "පහත පදය තුළ පවතින ප්‍රමුඛ රසය නවරස අනුව හඳුනාගන්න: "
    "Shringara, Hasya, Karuna, Roudhra, Veera, Bhayanakam, "
    "Bhibatsa, Adbhutha, Shantha. "
    "පිළිතුරට රසයේ නාමය පමණක් දෙන්න."
)

_model = None
_tokenizer = None

def _extract_class(text: str) -> str:
    m = CLASS_PATTERN.search(text)
    if not m:
        return "Unknown"
    found = m.group(1).lower()
    for c in CLASSES:
        if c.lower() == found:
            return c
    return "Unknown"

def load_emotion_model():
    global _model, _tokenizer
    if _model is not None and _tokenizer is not None:
        return _model, _tokenizer

    if not MODEL_REPO:
        raise RuntimeError("MODEL_REPO is not set in .env")

    dtype = torch.bfloat16
    _model, _ = FastLanguageModel.from_pretrained(
        model_name=MODEL_REPO,
        max_seq_length=2048,
        dtype=dtype,
        load_in_4bit=True,
        resize_model_vocab=139336,
        token=HF_TOKEN if HF_TOKEN else None,
    )

    _tokenizer = AutoTokenizer.from_pretrained(
        TOKENIZER_REPO if TOKENIZER_REPO else MODEL_REPO,
        use_fast=False,
        token=HF_TOKEN if HF_TOKEN else None,
    )

    FastLanguageModel.for_inference(_model)
    return _model, _tokenizer

@torch.inference_mode()
def predict_emotion(text: str) -> str:
    model, tokenizer = load_emotion_model()
    prompt = alpaca_prompt.format(INSTRUCTION, text)

    inputs = tokenizer([prompt], return_tensors="pt").to("cuda")
    outputs = model.generate(
        **inputs,
        max_new_tokens=10,
        temperature=0.1,
        do_sample=False,
        use_cache=True,
    )
    decoded = tokenizer.decode(outputs[0], skip_special_tokens=True)

    if "### Response" in decoded:
        decoded = decoded.split("### Response")[-1]

    return _extract_class(decoded.strip())

def split_verses(song_text: str) -> list[str]:
    s = (song_text or "").strip()
    if not s:
        return []

    # Normalize Windows line endings
    s = s.replace("\r\n", "\n").replace("\r", "\n")

    # 1) If there are blank lines, split by verse blocks (paragraphs)
    if "\n\n" in s:
        blocks = [b.strip() for b in s.split("\n\n") if b.strip()]
        # also handle cases with more than 2 newlines
        cleaned = []
        for b in blocks:
            b2 = "\n".join([ln.strip() for ln in b.split("\n") if ln.strip()]).strip()
            if b2:
                cleaned.append(b2)
        return cleaned

    # 2) If there are multiple lines but no blank lines, group every 4 lines
    if "\n" in s:
        lines = [ln.strip() for ln in s.split("\n") if ln.strip()]
        verses = []
        for i in range(0, len(lines), 4):
            verses.append("\n".join(lines[i:i+4]).strip())
        return verses

    # 3) Single paragraph -> one verse
    return [s]

def analyze_song(song_text: str) -> list[dict]:
    verses = split_verses(song_text)
    results = []
    for i, v in enumerate(verses, start=1):
        emo = predict_emotion(v)
        results.append({"verse_no": i, "verse": v, "emotion": emo})
    return results
