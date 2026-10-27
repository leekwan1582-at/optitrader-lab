export default function MetricRow({ label, value, tone }) {
  return (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <span className={tone ? `metric-value text-${tone}` : 'metric-value'}>{value}</span>
    </div>
  );
}
