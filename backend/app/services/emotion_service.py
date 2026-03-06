import os
import re
import torch
import torch.nn.functional as F
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
_label_token_ids = None


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
    global _model, _tokenizer, _label_token_ids
    if _model is not None and _tokenizer is not None and _label_token_ids is not None:
        return _model, _tokenizer, _label_token_ids

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

    # Precompute token ids for each label
    _label_token_ids = {}
    for label in CLASSES:
        ids = _tokenizer.encode(label, add_special_tokens=False)
        if len(ids) == 0:
            raise RuntimeError(f"Could not tokenize label: {label}")
        _label_token_ids[label] = ids

    return _model, _tokenizer, _label_token_ids


@torch.inference_mode()
def predict_emotion_with_scores(text: str) -> dict:
    model, tokenizer, label_token_ids = load_emotion_model()
    prompt = alpaca_prompt.format(INSTRUCTION, text)

    inputs = tokenizer([prompt], return_tensors="pt").to("cuda")

    # Forward pass without generation
    outputs = model(**inputs)
    next_token_logits = outputs.logits[0, -1, :]  # logits for next token only
    next_token_probs = F.softmax(next_token_logits, dim=-1)

    scores = []
    for label in CLASSES:
        ids = label_token_ids[label]

        # Use the first token probability as approximate class score
        first_token_id = ids[0]
        prob = float(next_token_probs[first_token_id].item())

        scores.append({
            "emotion": label,
            "score": prob
        })

    # Normalize scores only across our 9 emotion labels
    total = sum(x["score"] for x in scores)
    if total > 0:
        for x in scores:
            x["score"] = (x["score"] / total) * 100.0
    else:
        uniform = 100.0 / len(scores)
        for x in scores:
            x["score"] = uniform

    scores.sort(key=lambda x: x["score"], reverse=True)

    top1 = scores[0]["emotion"]
    top1_percentage = round(scores[0]["score"], 2)

    top3 = [
        {"emotion": s["emotion"], "percentage": round(s["score"], 2)}
        for s in scores[:3]
    ]

    return {
        "emotion": top1,
        "percentage": top1_percentage,
        "top3": top3
    }


def split_verses(song_text: str) -> list[str]:
    s = (song_text or "").strip()
    if not s:
        return []

    s = s.replace("\r\n", "\n").replace("\r", "\n")

    # 1) Blank line-separated verses
    if "\n\n" in s:
        blocks = [b.strip() for b in s.split("\n\n") if b.strip()]
        cleaned = []
        for b in blocks:
            b2 = "\n".join([ln.strip() for ln in b.split("\n") if ln.strip()]).strip()
            if b2:
                cleaned.append(b2)
        return cleaned

    # 2) Multi-line but no blank lines -> group every 4 lines
    if "\n" in s:
        lines = [ln.strip() for ln in s.split("\n") if ln.strip()]
        verses = []
        for i in range(0, len(lines), 4):
            verses.append("\n".join(lines[i:i+4]).strip())
        return verses

    # 3) Single paragraph
    return [s]


def analyze_song(song_text: str) -> list[dict]:
    verses = split_verses(song_text)
    results = []

    for i, v in enumerate(verses, start=1):
        pred = predict_emotion_with_scores(v)
        results.append({
            "verse_no": i,
            "verse": v,
            "emotion": pred["emotion"],
            "percentage": pred["percentage"],
            "top3": pred["top3"]
        })

    return results