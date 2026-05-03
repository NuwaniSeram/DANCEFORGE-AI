// components/SegmentRadar.js
// Body segment scores displayed as a clean bar chart
// Also shows symmetry comparison

const SEGMENT_ICONS = {
  arms:      "💪",
  shoulders: "🏋️",
  torso:     "🧍",
  hips:      "🕺",
  legs:      "🦵",
};

const SEGMENT_DESCRIPTIONS = {
  arms:      "Elbow & wrist control — arm extensions and gestures",
  shoulders: "Shoulder alignment — upper-body posture and rolls",
  torso:     "Core stability — spine straightness and body lean",
  hips:      "Hip movement — weight shift and hip isolation",
  legs:      "Leg positioning — knee bend depth and footwork",
};

function scoreColor(score) {
  if (score >= 85) return "#4ade80";
  if (score >= 70) return "#a3e635";
  if (score >= 55) return "#facc15";
  if (score >= 40) return "#fb923c";
  return "#f87171";
}

export default function SegmentRadar({ data }) {
  const segmentScores = data?.segment_scores ?? {};
  const symmetry      = data?.symmetry ?? {};
  const segmentTips   = data?.segment_tips ?? {};

  const sorted = Object.entries(segmentScores).sort((a, b) => a[1] - b[1]);

  return (
    <div>
      <h3 style={{ marginBottom: 8, color: "#e2e8f0" }}>🎯 Body Segment Scores</h3>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
        Each segment score aggregates the joints within that region.
        Lower scores = more practice needed.
      </p>

      {/* Segment bars */}
      {sorted.map(([seg, score]) => {
        const color = scoreColor(score);
        const icon  = SEGMENT_ICONS[seg] ?? "⬜";
        const drill = segmentTips[seg]?.drill;

        return (
          <div key={seg} className="segmentRow">
            <div className="segmentLabel">
              <span className="segmentName">
                {icon} {seg}
              </span>
              <span className="segmentScore" style={{ color }}>
                {Math.round(score)}%
              </span>
            </div>
            <div className="segmentBarBg">
              <div
                className="segmentBarFill"
                style={{
                  width: `${score}%`,
                  background: `linear-gradient(90deg, ${color}66, ${color})`,
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
              {SEGMENT_DESCRIPTIONS[seg]}
            </div>
            {drill && (
              <div style={{
                fontSize: 12, color: "#c084fc", marginTop: 6,
                padding: "6px 10px", background: "rgba(168,85,247,0.08)",
                borderRadius: 8, borderLeft: "3px solid #a855f7",
              }}>
                🎯 Drill: {drill}
              </div>
            )}
          </div>
        );
      })}

      {/* Symmetry section */}
      <div style={{
        marginTop: 28,
        padding: 18,
        background: "rgba(6,182,212,0.07)",
        border: "1px solid rgba(6,182,212,0.15)",
        borderRadius: 14,
      }}>
        <h4 style={{ color: "#22d3ee", marginBottom: 14 }}>⚖️ Left–Right Symmetry</h4>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {[
            { label: "Reference",  val: symmetry.reference },
            { label: "Your Dance", val: symmetry.user      },
          ].map(({ label, val }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor(val ?? 0) }}>
                {val != null ? Math.round(val) : "–"}%
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>{label}</div>
            </div>
          ))}
          <div style={{ flex: 1, fontSize: 13, color: "#64748b", alignSelf: "center" }}>
            Symmetry measures how balanced your left and right sides are.
            Lower symmetry may indicate favouring one side.
          </div>
        </div>
      </div>
    </div>
  );
}
