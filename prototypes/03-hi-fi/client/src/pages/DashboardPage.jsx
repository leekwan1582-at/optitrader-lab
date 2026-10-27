import { useMemo, useState } from 'react';
import { Button, Col, Form, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import KPICard from '../components/KPICard.jsx';
import LoadingSkeleton from '../components/LoadingSkeleton.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useApp } from '../context/AppContext.jsx';
import {
  formatDate,
  formatDuration,
  formatInteger,
  formatNumber,
  shortRunId,
  strategyLabel,
} from '../utils/format.js';

const quickPrompts = [
  'Optimize SMA crossover on EURUSD for max Sharpe with drawdown under 15%',
  'Tune EMA momentum on NQ to maximize total return',
  'Find a stable SMA sweep on ES with drawdown below 10%',
];

export default function DashboardPage() {
  const { runs, profiles, errorLogs, settings, loading } = useApp();
  const [prompt, setPrompt] = useState(quickPrompts[0]);
  const [selectedRunIds, setSelectedRunIds] = useState([]);
  const navigate = useNavigate();

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

  function toggleRun(runId) {
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

  const columns = [
    {
      key: 'run',
      label: 'Run',
      render: (run) => (
        <div>
          <div className="fw-semibold">{run.profile_name}</div>
          <div className="text-muted small mono">{shortRunId(run.run_id)}</div>
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
        <span className={run.best?.sharpe >= 1 ? 'text-success mono' : 'mono'}>
          {run.best?.sharpe ?? '—'}
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
  ];

  if (loading) {
    return <LoadingSkeleton rows={7} />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Research workspace"
        subtitle="Launch an optimization, review recent experiments, and compare results."
        actions={(
          <Button className="btn-cyan" onClick={() => navigate('/experiments/new')}>
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
              />
              <Button
                className="btn-cyan text-nowrap"
                onClick={() => navigate('/experiments/new', { state: { prompt } })}
              >
                Open studio
              </Button>
            </div>
            <div className="d-flex flex-wrap gap-2 mt-3">
              {quickPrompts.map((item) => (
                <button className="suggestion-pill" key={item} type="button" onClick={() => setPrompt(item)}>
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
                  <span className="text-success">{formatNumber(stats.latest.best?.sharpe)}</span>
                </div>
                <div className="d-flex justify-content-between mono">
                  <span>Max DD</span>
                  <span>{formatNumber(stats.latest.best?.max_drawdown * 100, 1)}%</span>
                </div>
                <Button
                  variant="outline-secondary"
                  className="w-100 mt-3"
                  onClick={() => navigate(`/results/${stats.latest.run_id}`)}
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
            <div className="panel-heading">
              <div>
                <div className="panel-eyebrow">Recent experiments</div>
                <div className="text-muted small">Every optimization is stored as a reproducible run.</div>
              </div>
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={selectedRunIds.length < 2}
                onClick={handleCompare}
              >
                Compare selected ({selectedRunIds.length})
              </Button>
            </div>
            <DataTable
              columns={columns}
              rows={runs}
              rowKey="run_id"
              onRowClick={(run) => navigate(`/results/${run.run_id}`)}
              selectedKeys={selectedRunIds}
              onToggleRow={toggleRun}
              emptyMessage="No experiments yet. Launch your first run from the studio."
            />
          </div>
        </Col>

        <Col xs={12} xl={4}>
          <div className="panel p-4 h-100">
            <div className="panel-eyebrow mb-3">Activity feed</div>
            {errorLogs.length ? (
              <div className="activity-list">
                {errorLogs.map((log, index) => (
                  <div className="activity-item" key={`${log.timestamp}-${index}`}>
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
              <div className="text-muted">No activity yet.</div>
            )}
          </div>
        </Col>
      </Row>
    </>
  );
}
