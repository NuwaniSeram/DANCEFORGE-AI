const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

// Your backend returns ONLY emotion. We'll create a simple intensity mapping
// so the UI can still show intensity (optional).
const intensityFromEmotion = (emotion) => {
  const map = {
    Roudhra: "high",
    Veera: "high",
    Bhayanakam: "high",
    Bhibatsa: "high",
    Hasya: "medium",
    Shringara: "medium",
    Adbhutha: "medium",
    Karuna: "low",
    Shantha: "low",
    Unknown: "low",
  };
  return map[emotion] || "low";
};

// This function now calls: POST /emotion/analyze
// It returns an array of verse-wise results:
// [{ verse_no, verse, emotion, intensity }]
export const analyzeSongVerses = async (songText) => {
  const res = await fetch(`${BACKEND_URL}/emotion/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: songText }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Backend error ${res.status}: ${msg}`);
  }

  const data = await res.json(); // { results: [...] }

  const results = (data.results || []).map((r) => ({
    verse_no: r.verse_no,
    verse: r.verse,
    emotion: r.emotion,
    intensity: intensityFromEmotion(r.emotion),
  }));

  return results;
};

// Keep old name for compatibility if your page calls predictEmotion(segment)
// We'll send just that segment as a "song" and return first result.
export const predictEmotion = async (segment) => {
  const results = await analyzeSongVerses(segment);
  const first = results[0] || { emotion: "Unknown", intensity: "low" };
  return { emotion: first.emotion, intensity: first.intensity };
};
