// frontend/src/pages/PerformanceAnalysis.js
// Your research's XAI dashboard — integrated into DanceForge group project

import axios from "axios";
import { useState } from "react";
import ScoreCard           from "../components/performance/ScoreCard";
import FeedbackPanel       from "../components/performance/FeedbackPanel";
import XAIImportance       from "../components/performance/XAIImportance";
import BodyHeatmap         from "../components/performance/BodyHeatmap";
import FrameTimeline       from "../components/performance/FrameTimeline";
import SegmentRadar        from "../components/performance/SegmentRadar";
import CounterfactualPanel from "../components/performance/CounterfactualPanel";
import TransparencyCard    from "../components/performance/TransparencyCard";

// ← Point to your route prefix, not the old standalone port
const API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:8000/performance";

export default function PerformanceAnalysis() {
  const [reference, setReference]     = useState(null);
  const [user, setUser]               = useState(null);
  const [refPreview, setRefPreview]   = useState(null);
  const [userPreview, setUserPreview] = useState(null);
  const [result, setResult]           = useState(null);
  const [progress, setProgress]       = useState(0);
  const [loading, setLoading]         = useState(false);
  const [activeTab, setActiveTab]     = useState("feedback");

  const handleFile = (file, type) => {
    if (type === "reference") { setReference(file); setRefPreview(URL.createObjectURL(file)); }
    if (type === "user")      { setUser(file);      setUserPreview(URL.createObjectURL(file)); }
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0], type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reference || !user) { alert("Please upload both videos."); return; }
    const formData = new FormData();
    formData.append("reference", reference);
    formData.append("user", user);
    try {
      setLoading(true); setProgress(0); setResult(null);
      const res = await axios.post(`${API_BASE}/analyze/`, formData, {
        onUploadProgress: (p) => setProgress(Math.round((p.loaded * 100) / p.total)),
      });
      setResult(res.data);
      setActiveTab("feedback");
    } catch (err) {
      alert("Backend error: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const TABS = [
    { id: "feedback",       label: "📋 Feedback"       },
    { id: "xai",            label: "🧠 XAI Importance"  },
    { id: "heatmap",        label: "🔥 Body Heatmap"    },
    { id: "timeline",       label: "📈 Frame Timeline"  },
    { id: "segments",       label: "🎯 Segments"        },
    { id: "counterfactual", label: "💡 What-If"         },
    { id: "transparency",   label: "🔬 Model Trace"     },
  ];

  return (
    <div className="pa-container">
      <div className="pa-hero">
        <h1 className="pa-title">Performance Analysis</h1>
        <p className="pa-subtitle">Explainable AI Feedback System for Dance Learning</p>
        <p className="pa-subtitle-small">
          Rule-based XAI · Joint-level analysis · Confidence-weighted scoring
        </p>
      </div>

      <form onSubmit={handleSubmit} className="pa-uploadSection">
        {[
          { label: "Reference Dance", type: "reference", preview: refPreview },
          { label: "Your Dance",      type: "user",      preview: userPreview },
        ].map(({ label, type, preview }) => (
          <div
            key={type}
            className="pa-dropzone pa-card"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, type)}
          >
            <h3>{label}</h3>
            <label className="pa-fileLabel">
              📁 Choose or Drop Video
              <input
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0], type)}
              />
            </label>
            {preview && <video src={preview} controls className="pa-preview" />}
          </div>
        ))}
        <div className="pa-analyzeRow">
          <button className="pa-btn" type="submit" disabled={loading}>
            {loading ? "⏳ Analysing…" : "⚡ Analyse Dance"}
          </button>
        </div>
      </form>

      {loading && (
        <div className="pa-progressBox pa-card">
          <p>Uploading & running XAI analysis… {progress}%</p>
          <div className="pa-progressBar">
            <div className="pa-progressFill" style={{ width: `${progress}%` }} />
          </div>
          <p className="pa-progressNote">
            Extracting poses → Computing angles → DTW alignment → XAI scoring
          </p>
        </div>
      )}

      {result && (
        <>
          <div className="pa-scoresRow">
            <ScoreCard label="Similarity Score" value={result.similarity_score} color="#ff4ecd" />
            <ScoreCard label="Alignment Score"  value={result.alignment_score}  color="#a855f7" />
            <ScoreCard label="Symmetry (You)"   value={result.symmetry?.user}   color="#06b6d4" />
            <ScoreCard label="Frames Analysed"  value={result.total_frames}     color="#10b981" unit="" />
          </div>

          <div className={`pa-badge pa-badge-${result.score_badge} pa-card`}>
            <span>{result.summary}</span>
          </div>

          <div className="pa-tabBar">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`pa-tabBtn ${activeTab === t.id ? "pa-tabActive" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="pa-tabContent pa-card">
            {activeTab === "feedback"       && <FeedbackPanel       data={result} />}
            {activeTab === "xai"            && <XAIImportance       data={result} />}
            {activeTab === "heatmap"        && <BodyHeatmap         data={result} />}
            {activeTab === "timeline"       && <FrameTimeline       data={result} />}
            {activeTab === "segments"       && <SegmentRadar        data={result} />}
            {activeTab === "counterfactual" && <CounterfactualPanel data={result} />}
            {activeTab === "transparency"   && <TransparencyCard    data={result} />}
          </div>
        </>
      )}
    </div>
  );
}