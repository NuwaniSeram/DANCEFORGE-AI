// components/XAIImportance.js
// Horizontal bar chart of SHAP-inspired feature importance per joint

const SEV_COLORS = {
  good:     "#4ade80",
  mild:     "#facc15",
  moderate: "#fb923c",
  severe:   "#f87171",
};

export default function XAIImportance({ data }) {
  const importance = data?.feature_importance ?? {};
  const jointStats = data?.joint_stats ?? {};

  // Sort descending
  const sorted = Object.entries(importance)
    .sort((a, b) => b[1] - a[1]);

  const maxVal = sorted.length ? sorted[0][1] : 1;

  return (
    <div className="importanceChart">
      <h3>🧠 XAI Feature Importance</h3>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
        Shows how much each joint contributed to overall error.
        Calculated as: (angle diff / 90°) × joint weight × error rate × confidence.
      </p>

      {sorted.map(([joint, score]) => {
        const stats = jointStats[joint] ?? {};
        const severity = stats.severity ?? "good";
        const pct = maxVal > 0 ? (score / maxVal) * 100 : 0;
        const color = SEV_COLORS[severity] ?? "#94a3b8";
        const displayName = joint.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

        return (
          <div key={joint} className="importanceRow">
            <div className="importanceLabel">
              <span>{displayName}</span>
              <span style={{ color }}>
                {(score * 100).toFixed(1)}%
                {stats.mean_diff != null && (
                  <span style={{ color: "#64748b", fontWeight: 400 }}>
                    {" "}· avg {stats.mean_diff}° off
                  </span>
                )}
              </span>
            </div>
            <div className="importanceBarBg">
              <div
                className="importanceBarFill"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}88, ${color})`,
                }}
              />
            </div>
          </div>
        );
      })}

      {sorted.length === 0 && (
        <p style={{ color: "#4ade80", textAlign: "center", padding: 32 }}>
          No joint errors detected — all joints within acceptable range!
        </p>
      )}

      <div style={{ marginTop: 24, padding: 14, background: "rgba(168,85,247,0.07)",
        borderRadius: 10, fontSize: 13, color: "#94a3b8" }}>
        <strong style={{ color: "#c084fc" }}>XAI Method:</strong>{" "}
        {data?.model_transparency}
      </div>
    </div>
  );
}
