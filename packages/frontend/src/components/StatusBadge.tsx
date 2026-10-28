import { statusLabel } from '../utils/format';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const classNames: Record<string, string> = {
    completed: 'badge-soft badge-success',
    failed: 'badge-soft badge-danger',
    running: 'badge-soft badge-warning',
    queued: 'badge-soft badge-muted',
  };
  const className = classNames[status] || 'badge-soft badge-muted';

  return <span className={className}>{statusLabel(status)}</span>;
}
