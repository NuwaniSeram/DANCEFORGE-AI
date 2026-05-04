import os
import re
import json
from dotenv import load_dotenv
from mistralai import Mistral

# Safe GPU imports:
# Local laptop can run English/Mistral without torch/unsloth.
# RunPod GPU can run Sinhala SinLLaMA/Unsloth.
try:
    import torch
    import torch.nn.functional as F
    from unsloth import FastLanguageModel
    from transformers import AutoTokenizer
except ImportError:
    torch = None
    F = None
    FastLanguageModel = None
    AutoTokenizer = None


load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN", "")
MODEL_REPO = os.getenv("MODEL_REPO", "")
TOKENIZER_REPO = os.getenv("TOKENIZER_REPO", "")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")

_mistral_client = Mistral(api_key=MISTRAL_API_KEY) if MISTRAL_API_KEY else None


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
    m = CLASS_PATTERN.search(text or "")
    if not m:
        return "Unknown"

    found = m.group(1).lower()

    for c in CLASSES:
        if c.lower() == found:
            return c

    return "Unknown"


def _normalize_top3(top3: list) -> list:
    cleaned = []

    for item in top3:
        emotion = item.get("emotion", "")
        percentage = item.get("percentage", 0)

        emotion = _extract_class(str(emotion))

        if emotion == "Unknown":
            continue

        try:
            percentage = float(percentage)
        except Exception:
            percentage = 0.0

        cleaned.append({
            "emotion": emotion,
            "percentage": percentage
        })

    # Remove duplicate emotions
    unique = []
    seen = set()

    for item in cleaned:
        if item["emotion"] not in seen:
            seen.add(item["emotion"])
            unique.append(item)

    unique = unique[:3]

    # If model returned labels but bad percentages, give reasonable fallback
    total = sum(x["percentage"] for x in unique)

    if len(unique) == 1 and total <= 0:
        unique[0]["percentage"] = 100.0

    elif len(unique) == 2 and total <= 0:
        unique[0]["percentage"] = 65.0
        unique[1]["percentage"] = 35.0

    elif len(unique) == 3 and total <= 0:
        unique[0]["percentage"] = 60.0
        unique[1]["percentage"] = 25.0
        unique[2]["percentage"] = 15.0

    # Normalize to 100
    total = sum(x["percentage"] for x in unique)

    if total > 0:
        for x in unique:
            x["percentage"] = round((x["percentage"] / total) * 100.0, 2)

    unique.sort(key=lambda x: x["percentage"], reverse=True)

    return unique


def load_emotion_model():
    global _model, _tokenizer, _label_token_ids

    if _model is not None and _tokenizer is not None and _label_token_ids is not None:
        return _model, _tokenizer, _label_token_ids

    if torch is None or FastLanguageModel is None or AutoTokenizer is None:
        return None, None, None

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

    _label_token_ids = {}

    for label in CLASSES:
        ids = _tokenizer.encode(label, add_special_tokens=False)

        if len(ids) == 0:
            raise RuntimeError(f"Could not tokenize label: {label}")

        _label_token_ids[label] = ids

    return _model, _tokenizer, _label_token_ids


def predict_emotion_with_scores(text: str) -> dict:
    if torch is None or F is None:
        return {
            "emotion": "ModelUnavailable",
            "percentage": 0.0,
            "top3": []
        }

    model, tokenizer, label_token_ids = load_emotion_model()

    if model is None or tokenizer is None or label_token_ids is None:
        return {
            "emotion": "ModelUnavailable",
            "percentage": 0.0,
            "top3": []
        }

    prompt = alpaca_prompt.format(INSTRUCTION, text)

    inputs = tokenizer([prompt], return_tensors="pt").to("cuda")

    with torch.inference_mode():
        outputs = model(**inputs)
        next_token_logits = outputs.logits[0, -1, :]
        next_token_probs = F.softmax(next_token_logits, dim=-1)

    scores = []

    for label in CLASSES:
        ids = label_token_ids[label]
        first_token_id = ids[0]
        prob = float(next_token_probs[first_token_id].item())

        scores.append({
            "emotion": label,
            "score": prob
        })

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
        {
            "emotion": s["emotion"],
            "percentage": round(s["score"], 2)
        }
        for s in scores[:3]
    ]

    return {
        "emotion": top1,
        "percentage": top1_percentage,
        "top3": top3
    }


def predict_emotion_mistral(text: str) -> dict:
    try:
        if _mistral_client is None:
            return {
                "emotion": "Unknown",
                "percentage": 0.0,
                "top3": []
            }

        prompt = f"""
You are a Nawarasa emotion classifier for song lyrics.

Classify the lyric into the TOP 3 most likely emotions from this exact list:
Shringara, Hasya, Karuna, Roudhra, Veera, Bhayanakam, Bhibatsa, Adbhutha, Shantha

Return ONLY valid JSON in this exact format:
{{
  "top3": [
    {{"emotion": "Karuna", "percentage": 70}},
    {{"emotion": "Shantha", "percentage": 20}},
    {{"emotion": "Bhayanakam", "percentage": 10}}
  ]
}}

Rules:
- Use only the labels from the list.
- Percentages must sum to 100.
- Do not explain.
- Do not add markdown.
- Do not translate the lyric.

Lyric:
{text}
"""

        response = _mistral_client.chat.complete(
            model="mistral-small-latest",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0
        )

        output = response.choices[0].message.content.strip()
        print("Mistral raw output:", output)

        parsed_top3 = []

        try:
            # Remove accidental markdown fences if returned
            cleaned_output = output.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned_output)
            parsed_top3 = data.get("top3", [])
        except Exception:
            # Fallback: extract labels from text if JSON parsing fails
            found = []
            for c in CLASSES:
                if re.search(r"\b" + re.escape(c) + r"\b", output, re.IGNORECASE):
                    found.append(c)

            if len(found) == 1:
                parsed_top3 = [
                    {"emotion": found[0], "percentage": 100}
                ]
            elif len(found) == 2:
                parsed_top3 = [
                    {"emotion": found[0], "percentage": 65},
                    {"emotion": found[1], "percentage": 35}
                ]
            elif len(found) >= 3:
                parsed_top3 = [
                    {"emotion": found[0], "percentage": 60},
                    {"emotion": found[1], "percentage": 25},
                    {"emotion": found[2], "percentage": 15}
                ]

        top3 = _normalize_top3(parsed_top3)

        if not top3:
            return {
                "emotion": "Unknown",
                "percentage": 0.0,
                "top3": []
            }

        return {
            "emotion": top3[0]["emotion"],
            "percentage": top3[0]["percentage"],
            "top3": top3
        }

    except Exception as e:
        print("Mistral error:", e)
        return {
            "emotion": "Unknown",
            "percentage": 0.0,
            "top3": []
        }


def split_verses(song_text: str) -> list[str]:
    s = (song_text or "").strip()

    if not s:
        return []

    s = s.replace("\r\n", "\n").replace("\r", "\n")

    # 1) Blank line-separated verses
    if re.search(r"\n\s*\n", s):
        blocks = re.split(r"\n\s*\n+", s)
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
            verses.append("\n".join(lines[i:i + 4]).strip())

        return verses

    # 3) Single paragraph
    return [s]


def detect_verse_language(text: str) -> str:
    sinhala_count = len(re.findall(r"[\u0D80-\u0DFF]", text or ""))
    english_count = len(re.findall(r"[A-Za-z]", text or ""))

    if sinhala_count > 0 and english_count == 0:
        return "Sinhala"

    if english_count > 0 and sinhala_count == 0:
        return "English"

    if sinhala_count > 0 and english_count > 0:
        total = sinhala_count + english_count
        sinhala_ratio = sinhala_count / total

        if sinhala_ratio >= 0.75:
            return "Mostly Sinhala"

        if sinhala_ratio <= 0.25:
            return "Mostly English"

        return "Mixed"

    return "Unknown"


def analyze_song(song_text: str) -> list[dict]:
    verses = split_verses(song_text)
    results = []

    for i, v in enumerate(verses, start=1):
        lang = detect_verse_language(v)

        if lang in ["English", "Mostly English"]:
            pred = predict_emotion_mistral(v)

        elif lang in ["Sinhala", "Mostly Sinhala", "Mixed"]:
            pred = predict_emotion_with_scores(v)

            # Local fallback: if Sinhala model is unavailable, use Mistral
            if pred["emotion"] == "ModelUnavailable":
                pred = predict_emotion_mistral(v)

        else:
            pred = {
                "emotion": "Unknown",
                "percentage": 0.0,
                "top3": []
            }

        results.append({
            "verse_no": i,
            "verse": v,
            "language": lang,
            "emotion": pred["emotion"],
            "percentage": pred["percentage"],
            "top3": pred["top3"]
        })

    return results