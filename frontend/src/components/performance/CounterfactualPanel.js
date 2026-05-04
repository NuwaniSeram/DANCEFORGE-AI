// components/CounterfactualPanel.js
// "What-If" counterfactual explanations: shows potential score gains per joint fix

export default function CounterfactualPanel({ data }) {
  const hints     = data?.counterfactual ?? [];
  const baseScore = data?.similarity_score ?? 0;

  if (hints.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <p style={{ color: "#4ade80", fontSize: 16 }}>
          No significant errors to model counterfactuals for — great performance!
        </p>
      </div>
    );
  }

  const projectedBest = Math.min(100, baseScore + hints.reduce((s, h) => s + h.estimated_score_gain, 0));

  return (
    <div>
      <h3 style={{ marginBottom: 8, color: "#e2e8f0" }}>💡 What-If Analysis</h3>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
        Counterfactual explanations estimate how much your score would improve
        if each flagged joint were corrected to match the reference.
      </p>

      {/* Current vs potential */}
      <div style={{
        display: "flex", gap: 20, marginBottom: 28,
        padding: 20, background: "rgba(168,85,247,0.07)",
        border: "1px solid rgba(168,85,247,0.15)", borderRadius: 14,
        flexWrap: "wrap",
      }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Current Score</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#fb923c" }}>
            {Math.round(baseScore)}%
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 28, color: "#475569" }}>→</div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>If All Fixed</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#4ade80" }}>
            {Math.round(projectedBest)}%
          </div>
        </div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Potential Gain</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#a855f7" }}>
            +{Math.round(projectedBest - baseScore)}pts
          </div>
        </div>
      </div>

      {/* Individual counterfactuals */}
      {hints.map((hint, i) => (
        <div key={hint.joint} className="cfCard">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="cfTitle">
                #{i + 1} Fix: {hint.display_name}
              </div>
              <div className="cfMsg">{hint.message}</div>
            </div>
            <div style={{ textAlign: "center", minWidth: 70 }}>
              <div className="cfGain">+{hint.estimated_score_gain}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>pts gained</div>
            </div>
          </div>

          {/* Mini progress bar */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", marginBottom: 4 }}>
              <span>Score contribution</span>
              <span>{hint.estimated_score_gain} / {Math.round(projectedBest - baseScore)} total pts</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, height: 10, overflow: "hidden" }}>
              <div style={{
                width: `${(hint.estimated_score_gain / Math.max(projectedBest - baseScore, 1)) * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #a855f7, #c084fc)",
                borderRadius: 6,
              }} />
            </div>
          </div>
        </div>
      ))}

      <div style={{ fontSize: 12, color: "#334155", marginTop: 16 }}>
        ⚠ Estimates are approximations based on joint weight and average angular error.
        Actual improvement depends on choreographic context and practice.
      </div>
    </div>
  );
}
