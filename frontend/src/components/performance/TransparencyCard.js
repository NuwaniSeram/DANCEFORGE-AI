// components/TransparencyCard.js
// Shows all decision rule traces, the XAI method, and joint stats table
// This is a key research component for "Explainable AI"

import { useState } from "react";

export default function TransparencyCard({ data }) {
  const [showAll, setShowAll] = useState(false);
  const xaiCards   = data?.xai_cards ?? [];
  const globalExp  = data?.global_explanation ?? {};
  const jointStats = data?.joint_stats ?? {};

  const visibleCards = showAll ? xaiCards : xaiCards.slice(0, 4);

  return (
    <div>
      <h3 style={{ marginBottom: 8, color: "#e2e8f0" }}>🔬 Model Transparency & Rule Traces</h3>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        Every decision this system makes is derived from explicit, auditable rules —
        not a black-box neural network. Below is the complete decision trace.
      </p>

      {/* XAI method declaration */}
      <div style={{
        padding: 16, background: "rgba(6,182,212,0.07)",
        border: "1px solid rgba(6,182,212,0.15)", borderRadius: 12, marginBottom: 24,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#22d3ee", marginBottom: 8 }}>
          📐 XAI Method Declaration
        </div>
        <div className="traceBox" style={{ marginTop: 0 }}>
{`METHOD: Rule-Based Feature Importance with Confidence Weighting

STEP 1 – Pose Extraction
  Tool: MediaPipe Pose (model_complexity=1)
  Output: 33 landmarks × (x, y, z, visibility) per frame

STEP 2 – Angle Computation
  For each joint triplet (A, B, C):
    angle = arccos( dot(BA, BC) / (|BA| × |BC|) )
  Joints tracked: ${Object.keys(jointStats).length}

STEP 3 – DTW Temporal Alignment
  Algorithm: FastDTW (Euclidean distance on joint-angle vectors)
  Purpose: Handles speed differences between reference and user

STEP 4 – Error Classification
  diff = |ref_angle − user_angle|
  severity:
    diff < 10°  → good
    diff < 20°  → mild
    diff < 35°  → moderate
    diff ≥ 35°  → severe

STEP 5 – Feature Importance (XAI)
  importance_i = (mean_diff_i / 90°) × weight_i × error_rate_i × confidence_i
  Normalised across all joints to sum to 1.

STEP 6 – Counterfactual Estimation
  score_gain_i ≈ (mean_diff_i / 90°) × weight_i × 100

${globalExp.model_transparency ?? ""}`}
        </div>
      </div>

      {/* Joint stats table */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>
          📊 Joint Statistics Table
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%", borderCollapse: "collapse", fontSize: 12,
            color: "#94a3b8",
          }}>
            <thead>
              <tr>
                {["Joint", "Avg Diff (°)", "Peak Diff (°)", "Error Rate", "Confidence", "Severity", "Weight"].map(h => (
                  <th key={h} style={{
                    textAlign: "left", padding: "8px 10px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px",
                    fontSize: 11,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(jointStats)
                .sort((a, b) => b[1].mean_diff - a[1].mean_diff)
                .map(([joint, stats]) => {
                  const sevColor = {
                    good: "#4ade80", mild: "#facc15", moderate: "#fb923c", severe: "#f87171",
                  }[stats.severity] ?? "#94a3b8";
                  return (
                    <tr key={joint} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "8px 10px", color: "#e2e8f0" }}>
                        {joint.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </td>
                      <td style={{ padding: "8px 10px" }}>{stats.mean_diff}°</td>
                      <td style={{ padding: "8px 10px" }}>{stats.peak_diff}°</td>
                      <td style={{ padding: "8px 10px" }}>{Math.round(stats.error_rate * 100)}%</td>
                      <td style={{ padding: "8px 10px" }}>{Math.round(stats.mean_conf * 100)}%</td>
                      <td style={{ padding: "8px 10px", color: sevColor, fontWeight: 600, textTransform: "capitalize" }}>
                        {stats.severity}
                      </td>
                      <td style={{ padding: "8px 10px" }}>{stats.weight}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-joint rule traces */}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>
        🧾 Per-Joint Decision Traces
      </div>

      {visibleCards.map((card) => (
        <div key={card.joint} style={{ marginBottom: 14 }}>
          <div className="traceTitle">
            {card.display_name}
            <span style={{
              marginLeft: 10, fontSize: 12,
              color: { good:"#4ade80", mild:"#facc15", moderate:"#fb923c", severe:"#f87171" }[card.severity],
            }}>
              [{card.severity}]
            </span>
          </div>
          <div className="traceBox">{card.rule_trace}</div>
        </div>
      ))}

      {xaiCards.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8", borderRadius: 8, padding: "8px 16px",
            cursor: "pointer", fontSize: 13, marginTop: 8,
          }}
        >
          {showAll ? "▲ Show fewer traces" : `▼ Show all ${xaiCards.length} traces`}
        </button>
      )}
    </div>
  );
}
