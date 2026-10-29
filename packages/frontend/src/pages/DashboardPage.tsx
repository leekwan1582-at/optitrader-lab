import { useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Pagination from 'react-bootstrap/Pagination';
import Row from 'react-bootstrap/Row';
import { useNavigate } from 'react-router-dom';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import KPICard from '../components/KPICard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import type { Run, RunStatus, StrategyType } from '../types/domain';
import {
  formatDate,
  formatDuration,
  formatInteger,
  shortRunId,
  strategyLabel,
} from '../utils/format';

const quickPrompts = [
  'Optimize SMA crossover on EURUSD for max Sharpe with drawdown under 15%',
  'Tune EMA momentum on NQ to maximize total return',
  'Find a stable SMA sweep on ES with drawdown below 10%',
];

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const { runs, datasets, profiles, errorLogs, settings, loading, cancelRun, retryRun } = useApp();
  const [prompt, setPrompt] = useState(quickPrompts[0]);
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const navigate = useNavigate();

  // Filters & Pagination state
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>('all');
  const [strategyFilter, setStrategyFilter] = useState<StrategyType | 'all'>('all');
  const [datasetFilter, setDatasetFilter] = useState<string | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const completed = runs.filter((run) => run.status === 'completed');
    const failed = runs.filter((run) => run.status === 'failed');
    const totalTrials = runs.reduce((sum, run) => sum + (run.trials || 0), 0);
    const latest = completed[0];

    return {
      completed: completed.length,
      failed: failed.length,
      totalTrials,
      profiles: profiles.length,
      latest,
    };
  }, [profiles.length, runs]);

  // Filtered runs
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      if (statusFilter !== 'all' && run.status !== statusFilter) return false;
      if (strategyFilter !== 'all' && run.strategy_type !== strategyFilter) return false;
      if (datasetFilter !== 'all' && run.dataset_id !== datasetFilter) return false;
      return true;
    });
  }, [runs, statusFilter, strategyFilter, datasetFilter]);

  // Paginated runs
  const totalPages = Math.max(1, Math.ceil(filteredRuns.length / PAGE_SIZE));
  const paginatedRuns = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRuns.slice(start, start + PAGE_SIZE);
  }, [filteredRuns, currentPage]);

  function toggleRun(runId: string) {
    setSelectedRunIds((current) => (
      current.includes(runId)
        ? current.filter((id) => id !== runId)
        : [...current, runId]
    ));
  }

  function handleCompare() {
    if (selectedRunIds.length < 2) return;
    navigate(`/comparison?ids=${selectedRunIds.join(',')}`);
  }

  async function handleCancel(runId: string, event: React.MouseEvent) {
    event.stopPropagation();
    setActionBusyId(runId);
    try {
      await cancelRun(runId);
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleRetry(runId: string, event: React.MouseEvent) {
    event.stopPropagation();
    setActionBusyId(runId);
    try {
      const retried = await retryRun(runId);
      navigate(`/results/${retried.run_id}`);
    } finally {
      setActionBusyId(null);
    }
  }

  const columns: DataTableColumn<Run>[] = [
    {
      key: 'run',
      label: 'Run',
      render: (run) => (
        <div>
          <div className="fw-semibold">{run.profile_name}</div>
          <div className="text-muted small mono">
            {shortRunId(run.run_id)}
            {run.retried_from && (
              <span className="ms-2 badge bg-dark text-info">
                retry of {shortRunId(run.retried_from)}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'dataset',
      label: 'Dataset',
      render: (run) => <span className="mono">{run.dataset_name}</span>,
    },
    {
      key: 'strategy',
      label: 'Strategy',
      render: (run) => strategyLabel(run.strategy_type),
    },
    {
      key: 'trials',
      label: 'Trials',
      align: 'end',
      render: (run) => formatInteger(run.trials),
    },
    {
      key: 'best',
      label: 'Best Sharpe',
      align: 'end',
      render: (run) => (
        <span className={(run.best?.sharpe ?? 0) >= 1 ? 'text-success mono' : 'mono'}>
          {run.best?.sharpe ? run.best.sharpe.toFixed(2) : '—'}
        </span>
      ),
    },
    {
      key: 'duration',
      label: 'Duration',
      align: 'end',
      render: (run) => formatDuration(run.duration_ms),
    },
    {
      key: 'status',
      label: 'Status',
      render: (run) => <StatusBadge status={run.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'end',
      render: (run) => (
        <div className="d-flex justify-content-end gap-1">
          {['queued', 'running'].includes(run.status) && (
            <Button
              variant="outline-danger"
              size="sm"
              style={{ minHeight: '44px', minWidth: '44px' }}
              disabled={actionBusyId === run.run_id}
              onClick={(e) => void handleCancel(run.run_id, e)}
              aria-label={`Cancel run ${run.profile_name}`}
            >
              Cancel
            </Button>
          )}
          {['failed', 'cancelled'].includes(run.status) && (
            <Button
              variant="outline-warning"
              size="sm"
              style={{ minHeight: '44px', minWidth: '44px' }}
              disabled={actionBusyId === run.run_id}
              onClick={(e) => void handleRetry(run.run_id, e)}
              aria-label={`Retry run ${run.profile_name}`}
            >
              Retry
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSkeleton rows={7} />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Research workspace"
        subtitle="Launch optimizations, track runs in progress, filter experiments, and inspect diagnostics."
        actions={(
          <Button
            className="btn-cyan"
            style={{ minHeight: '44px', minWidth: '44px' }}
            onClick={() => navigate('/experiments/new')}
          >
            New Experiment
          </Button>
        )}
      />

      <Row className="g-3 mb-4">
        <Col xs={12} md={6} xl={3}>
          <KPICard label="Completed runs" value={stats.completed} icon="✓" tone="green" hint="Tracked experiments" />
        </Col>
        <Col xs={12} md={6} xl={3}>
          <KPICard label="Failed runs" value={stats.failed} icon="!" tone="red" hint="Inspect error logs" />
        </Col>
        <Col xs={12} md={6} xl={3}>
          <KPICard label="Total trials" value={formatInteger(stats.totalTrials)} icon="#" tone="cyan" hint={`Cap ${settings.max_trials} per run`} />
        </Col>
        <Col xs={12} md={6} xl={3}>
          <KPICard label="Profiles" value={stats.profiles} icon="P" tone="amber" hint="Reusable configurations" />
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col xs={12} lg={8}>
          <div className="panel p-4 h-100">
            <div className="panel-eyebrow">Quick run</div>
            <div className="d-flex flex-column flex-md-row gap-2 mt-2">
              <Form.Control
                className="dark-input"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe the optimization you want…"
                aria-label="Optimization prompt"
              />
              <Button
                className="btn-cyan text-nowrap"
                style={{ minHeight: '44px', minWidth: '44px' }}
                onClick={() => navigate('/experiments/new', { state: { prompt } })}
              >
                Open studio
              </Button>
            </div>
            <div className="d-flex flex-wrap gap-2 mt-3">
              {quickPrompts.map((item) => (
                <button
                  className="suggestion-pill"
                  key={item}
                  type="button"
                  onClick={() => setPrompt(item)}
                  style={{ minHeight: '44px' }}
                >
                  {item.split(' on ')[0]}
                </button>
              ))}
            </div>
          </div>
        </Col>

        <Col xs={12} lg={4}>
          <div className="panel p-4 h-100">
            <div className="panel-eyebrow">Latest completed</div>
            {stats.latest ? (
              <>
                <div className="h5 mt-2 mb-1">{stats.latest.profile_name}</div>
                <div className="text-muted small mb-3">{formatDate(stats.latest.created_at)}</div>
                <div className="d-flex justify-content-between mono">
                  <span>Sharpe</span>
                  <span className="text-success">{stats.latest.best?.sharpe ? stats.latest.best.sharpe.toFixed(2) : '—'}</span>
                </div>
                <div className="d-flex justify-content-between mono">
                  <span>Max DD</span>
                  <span>{((stats.latest.best?.max_drawdown ?? 0) * 100).toFixed(1)}%</span>
                </div>
                <Button
                  variant="outline-secondary"
                  className="w-100 mt-3"
                  style={{ minHeight: '44px' }}
                  onClick={() => navigate(`/results/${stats.latest?.run_id ?? ''}`)}
                >
                  Review results
                </Button>
              </>
            ) : (
              <div className="text-muted mt-3">No completed runs yet.</div>
            )}
          </div>
        </Col>
      </Row>

      <Row className="g-3">
        <Col xs={12} xl={8}>
          <div className="panel overflow-hidden">
            <div className="panel-heading flex-wrap gap-2">
              <div>
                <div className="panel-eyebrow">Recent experiments</div>
                <div className="text-muted small">
                  Showing {paginatedRuns.length} of {filteredRuns.length} runs
                </div>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                  disabled={selectedRunIds.length < 2}
                  onClick={handleCompare}
                >
                  Compare selected ({selectedRunIds.length})
                </Button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="p-3 border-bottom border-dark bg-dark-subtle d-flex flex-wrap gap-3">
              <div className="d-flex align-items-center gap-2">
                <Form.Label className="small mb-0 text-muted" htmlFor="statusFilter">Status:</Form.Label>
                <Form.Select
                  id="statusFilter"
                  size="sm"
                  className="dark-input"
                  style={{ width: '130px', minHeight: '44px' }}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as RunStatus | 'all');
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All</option>
                  <option value="completed">Completed</option>
                  <option value="running">Running</option>
                  <option value="queued">Queued</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </Form.Select>
              </div>

              <div className="d-flex align-items-center gap-2">
                <Form.Label className="small mb-0 text-muted" htmlFor="strategyFilter">Strategy:</Form.Label>
                <Form.Select
                  id="strategyFilter"
                  size="sm"
                  className="dark-input"
                  style={{ width: '140px', minHeight: '44px' }}
                  value={strategyFilter}
                  onChange={(e) => {
                    setStrategyFilter(e.target.value as StrategyType | 'all');
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All strategies</option>
                  <option value="sma_crossover">SMA Crossover</option>
                  <option value="ema_momentum">EMA Momentum</option>
                </Form.Select>
              </div>

              <div className="d-flex align-items-center gap-2">
                <Form.Label className="small mb-0 text-muted" htmlFor="datasetFilter">Dataset:</Form.Label>
                <Form.Select
                  id="datasetFilter"
                  size="sm"
                  className="dark-input"
                  style={{ width: '140px', minHeight: '44px' }}
                  value={datasetFilter}
                  onChange={(e) => {
                    setDatasetFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">All datasets</option>
                  {datasets.map((d) => (
                    <option key={d.dataset_id} value={d.dataset_id}>
                      {d.name} ({d.symbol})
                    </option>
                  ))}
                </Form.Select>
              </div>
            </div>

            <DataTable
              columns={columns}
              rows={paginatedRuns}
              rowKey="run_id"
              onRowClick={(run) => navigate(`/results/${run.run_id}`)}
              selectedKeys={selectedRunIds}
              onToggleRow={(key) => toggleRun(String(key))}
              emptyMessage="No experiments match the filter criteria."
            />

            {totalPages > 1 && (
              <div className="p-3 d-flex justify-content-between align-items-center border-top border-dark">
                <span className="small text-muted">Page {currentPage} of {totalPages}</span>
                <Pagination size="sm" className="mb-0">
                  <Pagination.Prev
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  />
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Pagination.Item
                      key={p}
                      active={p === currentPage}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  />
                </Pagination>
              </div>
            )}
          </div>
        </Col>

        <Col xs={12} xl={4}>
          <div className="panel p-4 h-100">
            <div className="panel-eyebrow mb-3">Activity & diagnostic feed</div>
            {errorLogs.length ? (
              <div className="activity-list">
                {errorLogs.map((log, index) => (
                  <div className="activity-item" key={`${log.timestamp.toString()}-${index}`}>
                    <span className={`activity-dot activity-${log.severity}`} />
                    <div>
                      <div className="small fw-semibold">{log.component}</div>
                      <div className="text-muted small">{log.message}</div>
                      <div className="text-muted tiny mono">{formatDate(log.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted">No activity logged.</div>
            )}
          </div>
        </Col>
      </Row>
    </>
  );
}
