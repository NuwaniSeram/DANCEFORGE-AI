// components/BodyHeatmap.js
// SVG stick-figure with colour-coded joint circles

const SEV_COLORS = {
  good:     "#4ade80",
  mild:     "#facc15",
  moderate: "#fb923c",
  severe:   "#f87171",
  unknown:  "#475569",
};

// Approximate positions on a 200×400 canvas (x, y)
const JOINT_POSITIONS = {
  left_shoulder:  [75,  110],
  right_shoulder: [125, 110],
  left_elbow:     [60,  155],
  right_elbow:    [140, 155],
  left_wrist:     [50,  200],
  right_wrist:    [150, 200],
  spine:          [100, 130],
  hip_center:     [100, 215],
  left_hip:       [80,  225],
  right_hip:      [120, 225],
  left_knee:      [75,  290],
  right_knee:     [125, 290],
  left_ankle:     [70,  350],
  right_ankle:    [130, 350],
};

// Skeleton connections [from, to] using positions above
const CONNECTIONS = [
  ["left_shoulder",  "right_shoulder"],
  ["left_shoulder",  "left_elbow"],
  ["left_elbow",     "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow",    "right_wrist"],
  ["left_shoulder",  "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip",       "right_hip"],
  ["left_hip",       "left_knee"],
  ["left_knee",      "left_ankle"],
  ["right_hip",      "right_knee"],
  ["right_knee",     "right_ankle"],
];

export default function BodyHeatmap({ data }) {
  const jointStats = data?.joint_stats ?? {};

  const getColor = (joint) => {
    const stats = jointStats[joint];
    if (!stats) return SEV_COLORS.unknown;
    return SEV_COLORS[stats.severity] ?? SEV_COLORS.unknown;
  };

  return (
    <div className="heatmapWrap">
      <div>
        <h3 style={{ marginBottom: 16, color: "#e2e8f0" }}>🔥 Body Error Heatmap</h3>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
          Joints coloured by error severity. Larger circles = higher importance.
        </p>

        <svg
          className="heatmapSvg"
          viewBox="0 0 200 400"
          width="220"
          height="440"
          style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Head */}
          <circle cx="100" cy="55" r="28" fill="none" stroke="#475569" strokeWidth="2" />

          {/* Skeleton lines */}
          {CONNECTIONS.map(([a, b], i) => {
            const [ax, ay] = JOINT_POSITIONS[a] ?? [100, 200];
            const [bx, by] = JOINT_POSITIONS[b] ?? [100, 200];
            return (
              <line key={i} x1={ax} y1={ay} x2={bx} y2={by}
                stroke="#1e293b" strokeWidth="3" />
            );
          })}

          {/* Joint circles */}
          {Object.entries(JOINT_POSITIONS).map(([joint, [x, y]]) => {
            const stats = jointStats[joint];
            const importance = data?.feature_importance?.[joint] ?? 0;
            const r = 8 + importance * 30;  // radius scales with importance
            const color = getColor(joint);
            return (
              <g key={joint}>
                <circle cx={x} cy={y} r={r} fill={color} opacity="0.25" />
                <circle cx={x} cy={y} r={7} fill={color} />
                <title>{joint.replace(/_/g," ")} — {stats?.severity ?? "no data"} ({stats?.mean_diff ?? "?"}° avg)</title>
              </g>
            );
          })}

          {/* Neck line */}
          <line x1="100" y1="83" x2="100" y2="110" stroke="#1e293b" strokeWidth="3" />
        </svg>
      </div>

      {/* Legend */}
      <div>
        <div style={{ marginBottom: 20 }}>
          <div className="traceTitle" style={{ marginBottom: 12 }}>Legend</div>
          {Object.entries(SEV_COLORS).map(([sev, col]) => (
            sev !== "unknown" && (
              <div key={sev} className="legendItem">
                <div className="legendDot" style={{ background: col }} />
                <span style={{ textTransform: "capitalize" }}>{sev}</span>
              </div>
            )
          ))}
          <div className="legendItem" style={{ marginTop: 10, fontSize: 12 }}>
            Circle size = importance score
          </div>
        </div>

        {/* Top joints */}
        <div className="traceTitle" style={{ marginBottom: 10 }}>Most Critical Joints</div>
        {(data?.top_priority ?? []).map((j) => (
          <div key={j} style={{ fontSize: 13, color: "#fb923c", marginBottom: 4 }}>
            ⚠ {j.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          </div>
        ))}
      </div>
    </div>
  );
}
