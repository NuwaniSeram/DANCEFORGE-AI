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
    emotion: r.emotion,
    percentage: r.percentage,
    top3: r.top3 || [],
  }));
};