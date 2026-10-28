import type { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  tone?: 'cyan' | 'green' | 'red' | 'amber';
}

export default function KPICard({ label, value, hint, icon, tone = 'cyan' }: KPICardProps) {
  return (
    <div className={`panel kpi-card kpi-${tone}`}>
      <div className="kpi-icon" aria-hidden="true">{icon}</div>
      <div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
        {hint && <div className="kpi-hint">{hint}</div>}
      </div>
    </div>
  );
}
