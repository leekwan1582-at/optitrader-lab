export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(digits);
}

export function formatInteger(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US').format(Number(value));
}

export function formatDuration(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} sec`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function shortRunId(runId) {
  return String(runId || '').replaceAll('_', '').slice(0, 8);
}

export function runHash(runId) {
  return String(runId || '').replaceAll('-', '').replaceAll('_', '').slice(0, 12);
}

export function statusLabel(status) {
  const labels = {
    completed: 'Completed',
    failed: 'Failed',
    running: 'Running',
    queued: 'Queued',
  };
  return labels[status] || status || 'Unknown';
}

export function strategyLabel(strategy) {
  const labels = {
    sma_crossover: 'SMA Crossover',
    ema_momentum: 'EMA Momentum',
  };
  return labels[strategy] || 'Strategy';
}

export function objectiveLabel(objective) {
  const labels = {
    sharpe: 'Max Sharpe',
    total_return: 'Max Total Return',
    calmar: 'Max Calmar',
  };
  return labels[objective] || 'Max Sharpe';
}

export function formatEquity(value) {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`;
}
