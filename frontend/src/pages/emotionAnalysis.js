import React, { useState } from "react";
import { predictEmotion } from "../services/emotionService";

function EmotionAnalysis() {
  const [segment, setSegment] = useState("");
  const [emotion, setEmotion] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    setEmotion("");

    const result = await predictEmotion(segment);
    setEmotion(result.emotion);

    setLoading(false);
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Sinhala Song Emotion Analysis</h2>

      <textarea
        rows="4"
        cols="60"
        placeholder="Enter Sinhala song lyric segment..."
        value={segment}
        onChange={(e) => setSegment(e.target.value)}
      />

      <br /><br />

      <button onClick={handlePredict} disabled={loading}>
        {loading ? "Analyzing..." : "Predict Emotion"}
      </button>

      <br /><br />

      {emotion && (
        <h3>Predicted Navarasa Emotion: {emotion}</h3>
      )}
    </div>
  );
}

export default EmotionAnalysis;
