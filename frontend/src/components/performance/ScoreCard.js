// components/ScoreCard.js
export default function ScoreCard({ label, value, color, unit = "%" }) {
  return (
    <div className="scoreCardWrap">
      <div className="scoreCardLabel">{label}</div>
      <div
        className="scoreCardValue"
        style={{ backgroundImage: `linear-gradient(135deg, ${color}, ${color}88)` }}
      >
        {value != null ? Math.round(value) : "–"}
      </div>
      <div className="scoreCardUnit">{unit}</div>
    </div>
  );
}
