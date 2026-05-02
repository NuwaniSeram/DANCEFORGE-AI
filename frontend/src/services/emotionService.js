const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

// Calls POST /emotion/analyze
// Returns verse-wise results with REAL percentages + top3 from backend
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

  const data = await res.json();

  return (data.results || []).map((r) => ({
    verse_no: r.verse_no,
    verse: r.verse,
    language: r.language || "",
    emotion: r.emotion,
    percentage: r.percentage,
    top3: r.top3 || [],
  }));
};

export const saveEmotionHistory = async ({ userId,title, lyrics, results }) => {
  const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

  const res = await fetch(`${BACKEND_URL}/history/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      title,
      lyrics,
      results,
    }),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Save history failed ${res.status}: ${msg}`);
  }

  return await res.json();
};

export const getEmotionHistory = async (userId = "demo_user") => {
  const BACKEND_URL =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

  const res = await fetch(`${BACKEND_URL}/history/user/${userId}`);

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Get history failed ${res.status}: ${msg}`);
  }

  return await res.json();
};