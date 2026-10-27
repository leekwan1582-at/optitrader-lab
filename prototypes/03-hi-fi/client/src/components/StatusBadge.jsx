import { statusLabel } from '../utils/format.js';

export default function StatusBadge({ status }) {
  const className = {
    completed: 'badge-soft badge-success',
    failed: 'badge-soft badge-danger',
    running: 'badge-soft badge-warning',
    queued: 'badge-soft badge-muted',
  }[status] || 'badge-soft badge-muted';

  return <span className={className}>{statusLabel(status)}</span>;
}
