// components/FrameTimeline.js
// Shows error severity across 10 time segments of the video

const SEV_CLASS = {
  good:     "tlGood",
  mild:     "tlMild",
  moderate: "tlModerate",
  severe:   "tlSevere",
};

const SEV_LABEL = {
  good:     "✅ Good",
  mild:     "🟡 Mild",
  moderate: "🟠 Moderate",
  severe:   "🔴 Severe",
};

const SEV_COLOR = {
  good:     "#4ade80",
  mild:     "#facc15",
  moderate: "#fb923c",
  severe:   "#f87171",
};

export default function FrameTimeline({ data }) {
  const timeline = data?.frame_timeline ?? [];
  const fps      = data?.fps ?? 30;

  if (timeline.length === 0) {
    return <p style={{ color: "#64748b", textAlign: "center", padding: 32 }}>No timeline data.</p>;
  }

  return (
    <div>
      <h3 style={{ marginBottom: 8, color: "#e2e8f0" }}>📈 Frame-Level Error Timeline</h3>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
        Each block = a segment of your video. Colour = worst error severity in that segment.
        Percentage = proportion of frames with errors.
      </p>

      {/* Timeline blocks */}
      <div className="timeline">
        {timeline.map((seg) => (
          <div
            key={seg.segment}
            className={`timelineCell ${SEV_CLASS[seg.max_severity] ?? "tlGood"}`}
            title={`Frames ${seg.frame_start}–${seg.frame_end}\n${SEV_LABEL[seg.max_severity]}\nError in ${seg.error_pct}% of frames`}
          >
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
              Seg {seg.segment}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: SEV_COLOR[seg.max_severity] }}>
              {seg.error_pct}%
            </div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
              {seg.max_severity}
            </div>
            <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>
              f{seg.frame_start}–{seg.frame_end}
            </div>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div style={{ display: "flex", gap: 24, marginTop: 24, flexWrap: "wrap" }}>
        {["good", "mild", "moderate", "severe"].map((sev) => {
          const count = timeline.filter((s) => s.max_severity === sev).length;
          return (
            <div key={sev} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: SEV_COLOR[sev] }}>{count}</div>
              <div style={{ fontSize: 12, color: "#64748b", textTransform: "capitalize" }}>
                {sev} segments
              </div>
            </div>
          );
        })}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#a855f7" }}>
            {Math.round(timeline.reduce((s, t) => s + t.error_pct, 0) / timeline.length)}%
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>avg error rate</div>
        </div>
      </div>

      {/* Time axis hint */}
      <div style={{ fontSize: 12, color: "#334155", marginTop: 16 }}>
        ← Start of video · Segments ordered chronologically · End of video →
      </div>
    </div>
  );
}
