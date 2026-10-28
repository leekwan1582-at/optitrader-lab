interface MetricRowProps {
  label: string;
  value: string | number;
  tone?: string;
}

export default function MetricRow({ label, value, tone }: MetricRowProps) {
  return (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <span className={tone ? `metric-value text-${tone}` : 'metric-value'}>{value}</span>
    </div>
  );
}
