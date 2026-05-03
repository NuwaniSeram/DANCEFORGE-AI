// components/FeedbackPanel.js
import { useState } from "react";

const SEV_EMOJI = { good: "✅", mild: "🟡", moderate: "🟠", severe: "🔴" };
const SEV_ORDER = ["severe", "moderate", "mild", "good"];

export default function FeedbackPanel({ data }) {
  const [expanded, setExpanded] = useState({});
  const tips = data?.priority_tips ?? [];

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // Sort by severity then importance
  const sorted = [...tips].sort((a, b) => {
    const so = SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity);
    if (so !== 0) return so;
    return b.importance - a.importance;
  });

  return (
    <div>
      <h3 style={{ marginBottom: 18, color: "#e2e8f0" }}>
        Priority Feedback  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 400 }}>
          ({sorted.length} joint{sorted.length !== 1 ? "s" : ""} flagged)
        </span>
      </h3>

      {sorted.length === 0 && (
        <p style={{ color: "#4ade80", textAlign: "center", padding: 32 }}>
          ✅ All joints are within the correct range — excellent performance!
        </p>
      )}

      {sorted.map((tip) => (
        <div key={tip.id} className="feedbackItem" style={{ cursor: "pointer" }}
          onClick={() => toggle(tip.id)}>

          <div className="feedbackIcon">{SEV_EMOJI[tip.severity]}</div>

          <div className="feedbackBody">
            <div className="feedbackTitle">
              {tip.display_name}
              <span className={`sevBadge sevBadge-${tip.severity}`}>{tip.label}</span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#475569" }}>
                Importance: {Math.round(tip.importance * 100)}%
              </span>
            </div>
            <div className="feedbackMsg">{tip.message}</div>
            <div className="feedbackMeta">
              Avg error: {tip.diff}° · Occurs in {Math.round(tip.error_rate * 100)}% of frames ·
              Detection confidence: {Math.round(tip.confidence * 100)}%
            </div>

            {/* Expandable rule trace */}
            {expanded[tip.id] && (
              <div>
                <div className="traceTitle" style={{ marginTop: 12 }}>🔬 Decision Rule Trace</div>
                <div className="traceBox">{tip.rule_trace}</div>
              </div>
            )}
            <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>
              {expanded[tip.id] ? "▲ Hide rule trace" : "▼ Show rule trace"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
