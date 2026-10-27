export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(digits);
}

export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US').format(Number(value));
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} sec`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function shortRunId(runId: string | null | undefined): string {
  return String(runId || '').replaceAll('_', '').slice(0, 8);
}

export function runHash(runId: string | null | undefined): string {
  return String(runId || '').replaceAll('-', '').replaceAll('_', '').slice(0, 12);
}

export function statusLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    completed: 'Completed',
    failed: 'Failed',
    running: 'Running',
    queued: 'Queued',
  };
  return labels[status || ''] || status || 'Unknown';
}

export function strategyLabel(strategy: string | null | undefined): string {
  const labels: Record<string, string> = {
    sma_crossover: 'SMA Crossover',
    ema_momentum: 'EMA Momentum',
  };
  return labels[strategy || ''] || 'Strategy';
}

export function objectiveLabel(objective: string | null | undefined): string {
  const labels: Record<string, string> = {
    sharpe: 'Max Sharpe',
    total_return: 'Max Total Return',
    calmar: 'Max Calmar',
  };
  return labels[objective || ''] || 'Max Sharpe';
}

export function formatEquity(value: number): string {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`;
}
