import { useEffect, useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Tab from 'react-bootstrap/Tab';
import Table from 'react-bootstrap/Table';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import ChartWrapper from '../components/ChartWrapper';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import MetricRow from '../components/MetricRow';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { api } from '../api/index';
import {
  formatDate,
  formatDuration,
  formatInteger,
  formatNumber,
  formatPercent,
  runHash,
  shortRunId,
  statusLabel,
  strategyLabel,
} from '../utils/format';
import type { AiSummary, Run, RunLogEntry } from '../types/domain';

export default function ResultsPage() {
  const { runs, cloneRun, retryRun, cancelRun, loading } = useApp();
  const { runId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'analytics' | 'diagnostics'>('analytics');
  const [logs, setLogs] = useState<RunLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const run = useMemo<Run | undefined>(() => {
    if (runId) {
      return runs.find((item) => item.run_id === runId)
        || runs.find((item) => item.status === 'completed')
        || runs[0];
    }
    return runs.find((item) => item.status === 'completed') || runs[0];
  }, [runId, runs]);

  // Fetch logs when switching to diagnostics tab or changing runs
  useEffect(() => {
    if (!run) return;
    if (activeTab === 'diagnostics') {
      setLogsLoading(true);
      api.getRunLogs(run.run_id)
        .then((res) => setLogs(res.logs))
        .catch(() => setLogs([]))
        .finally(() => setLogsLoading(false));
    }
  }, [run, activeTab]);

  if (loading) {
    return <LoadingSkeleton rows={7} />;
  }

  if (!run) {
    return (
      <>
        <PageHeader eyebrow="Analytics" title="Results analytics" />
        <EmptyState
          title="No runs to display"
          description="Launch an optimization from the studio to generate an equity curve and metrics."
          action={<Button className="btn-cyan" style={{ minHeight: '44px', minWidth: '44px' }} onClick={() => navigate('/experiments/new')}>New experiment</Button>}
        />
      </>
    );
  }

  const isFailed = run.status === 'failed';
  const isCancelled = run.status === 'cancelled';
  const isRunning = ['running', 'queued'].includes(run.status);
  const categories = (run.equity_curve || []).map((_value: number, index: number) => `W${index + 1}`);
  const series = [{
    name: run.profile_name || 'Equity',
    data: run.equity_curve || [],
  }];

  const summary: AiSummary = run.ai_summary || {
    headline: run.best
      ? `Best Sharpe ${formatNumber(run.best.sharpe)} at fast ${run.best.fast_ma} / slow ${run.best.slow_ma} across ${run.trials} tested combinations.`
      : 'This run did not complete, so no summary was generated.',
    key_findings: run.best
      ? [
        'Performance is concentrated around the centre of the parameter grid.',
        'Out-of-sample behaviour should be reviewed before deployment.',
      ]
      : [],
    caveats: run.best
      ? [
        `${run.trials} combinations were tested, so the winner is partly a selection effect.`,
        'Confirm transaction costs and walk-forward behaviour before trading.',
      ]
      : ['Reduce the search grid or raise the timeout, then rerun.'],
  };

  async function handleClone() {
    if (!run) return;
    try {
      const config = await cloneRun(run.run_id);
      navigate('/experiments/new', { state: { config, prompt: `Clone of ${run.profile_name}` } });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Clone failed', text: error instanceof Error ? error.message : 'Clone failed.' });
    }
  }

  async function handleRetry() {
    if (!run) return;
    setActionBusy(true);
    try {
      const retried = await retryRun(run.run_id);
      navigate(`/results/${retried.run_id}`);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Retry failed', text: error instanceof Error ? error.message : 'Retry failed.' });
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCancel() {
    if (!run) return;
    setActionBusy(true);
    try {
      await cancelRun(run.run_id);
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Cancel failed', text: error instanceof Error ? error.message : 'Cancel failed.' });
    } finally {
      setActionBusy(false);
    }
  }

  function handleExportCsv() {
    if (!run) return;
    if (!run.equity_curve?.length) {
      Swal.fire({ icon: 'info', title: 'Nothing to export', text: 'This run has no equity curve.' });
      return;
    }

    const header = [
      `# Run ID: ${run.run_id}`,
      `# Strategy: ${run.strategy_type}`,
      `# Symbol: ${run.symbol}`,
      `# Best Fast MA: ${run.best?.fast_ma ?? 'N/A'}`,
      `# Best Slow MA: ${run.best?.slow_ma ?? 'N/A'}`,
      `# Best Sharpe: ${run.best?.sharpe ?? 'N/A'}`,
      `# Timestamp: ${new Date(run.created_at).toISOString()}`,
      'week,equity',
    ].join('\n');

    const rows = [
      header,
      ...run.equity_curve.map((value: number, index: number) => `${index + 1},${value}`),
    ].join('\n');

    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${shortRunId(run.run_id)}-equity.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <div className="d-print-none">
        <PageHeader
          eyebrow="Results analytics studio"
          title={run.profile_name || 'Run results'}
          subtitle={`Run ${shortRunId(run.run_id)} · ${formatDate(run.created_at)} · ${run.dataset_name}`}
          actions={(
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <Form.Select
                className="dark-input run-select"
                style={{ minHeight: '44px', width: 'auto' }}
                value={run.run_id}
                onChange={(event) => navigate(`/results/${event.target.value}`)}
                aria-label="Select run"
              >
                {runs.map((item: Run) => (
                  <option key={item.run_id} value={item.run_id}>
                    {shortRunId(item.run_id)} · {item.profile_name} · {statusLabel(item.status)}
                  </option>
                ))}
              </Form.Select>
              {isRunning && (
                <Button
                  variant="outline-danger"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                  disabled={actionBusy}
                  onClick={() => void handleCancel()}
                >
                  Cancel Run
                </Button>
              )}
              {(isFailed || isCancelled) && (
                <Button
                  variant="outline-warning"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                  disabled={actionBusy}
                  onClick={() => void handleRetry()}
                >
                  Retry Run
                </Button>
              )}
              <Button
                variant="outline-secondary"
                style={{ minHeight: '44px', minWidth: '44px' }}
                onClick={handleClone}
              >
                Clone config
              </Button>
            </div>
          )}
        />
      </div>

      {/* Print-only clean title */}
      <div className="d-none d-print-block mb-4">
        <h2>OptiTrader Lab — Experiment Report</h2>
        <p className="text-muted">Run ID: {run.run_id} · Date: {new Date(run.created_at).toLocaleDateString()} · Symbol: {run.symbol}</p>
      </div>

      <div className="panel p-3 mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <span className="text-muted small me-2">Run hash</span>
          <span className="mono text-info fw-semibold">{runHash(run.run_id)}</span>
          {run.retried_from && (
            <span className="ms-3 badge bg-dark text-info">Retried from: {shortRunId(run.retried_from)}</span>
          )}
        </div>
        <div className="d-flex align-items-center gap-3">
          <span className="text-muted small">{formatDuration(run.duration_ms)}</span>
          <StatusBadge status={run.status} />
        </div>
      </div>

      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab((k as 'analytics' | 'diagnostics') || 'analytics')}>
        <Nav variant="tabs" className="mb-3 d-print-none">
          <Nav.Item>
            <Nav.Link eventKey="analytics">Analytics & Audit</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="diagnostics">Diagnostics & Execution Logs</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="analytics">
            {isFailed || isCancelled ? (
              <Alert variant={isCancelled ? 'warning' : 'danger'} className="soft-alert mb-4">
                <div className="fw-semibold mb-1">
                  {isCancelled ? 'Optimization cancelled' : `Run failed · ${run.error_code || 'UNKNOWN'}`}
                </div>
                <div className="mb-2">
                  {run.error_message || 'The backtest worker terminated before completing.'}
                </div>
                <div className="small text-muted d-flex gap-2 align-items-center mt-3">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    style={{ minHeight: '44px', minWidth: '44px' }}
                    onClick={() => void handleRetry()}
                    disabled={actionBusy}
                  >
                    Retry Run
                  </Button>
                  <span>Or inspect the Diagnostics tab to see complete worker logs.</span>
                </div>
              </Alert>
            ) : (
              <Row className="g-3 mb-3">
                <Col xs={12} xl={8}>
                  <div className="panel p-4 h-100">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <div className="panel-eyebrow">Equity curve</div>
                        <div className="text-muted small">{strategyLabel(run.strategy_type)} · {run.symbol}</div>
                      </div>
                      <div className="text-muted small mono">{formatInteger(run.trials)} trials</div>
                    </div>
                    <ChartWrapper
                      series={series}
                      height={330}
                      options={{
                        xaxis: { categories },
                        tooltip: { y: { formatter: (value) => `$${Math.round(value).toLocaleString()}` } },
                      }}
                    />
                  </div>
                </Col>

                <Col xs={12} xl={4}>
                  <div className="panel p-4 h-100">
                    <div className="panel-eyebrow mb-3">In-Sample Metrics</div>
                    <MetricRow label="Sharpe ratio" value={formatNumber(run.best?.sharpe)} tone="success" />
                    <MetricRow label="Total return" value={formatPercent(run.best?.total_return)} />
                    <MetricRow label="Max drawdown" value={formatPercent(run.best?.max_drawdown)} />
                    {run.best?.calmar_ratio !== undefined && (
                      <MetricRow label="Calmar ratio" value={formatNumber(run.best?.calmar_ratio)} />
                    )}
                    <MetricRow label="Profit factor" value={formatNumber(run.best?.profit_factor)} />
                    <MetricRow label="Trades" value={formatInteger(run.best?.trades)} />
                    <MetricRow label="Trials tested" value={formatInteger(run.trials)} />
                    <MetricRow label="Holdout ratio" value={formatPercent(run.holdout_pct)} />

                    {run.best?.oos_sharpe !== undefined && (
                      <>
                        <div className="panel-eyebrow mt-4 mb-2 text-info">Out-of-Sample (OOS) Verification</div>
                        <MetricRow
                          label="OOS Sharpe"
                          value={formatNumber(run.best.oos_sharpe)}
                          tone={(run.best.oos_sharpe ?? 0) >= 1 ? 'success' : 'default'}
                        />
                        <MetricRow label="OOS Return" value={formatPercent(run.best.oos_total_return)} />
                        <MetricRow label="OOS Max DD" value={formatPercent(run.best.oos_max_drawdown)} />
                        <MetricRow
                          label="OOS Drop"
                          value={`${((run.robustness?.out_of_sample_drop ?? 0) * 100).toFixed(1)}%`}
                          tone={(run.robustness?.out_of_sample_drop ?? 0) < -0.3 ? 'danger' : 'default'}
                        />
                      </>
                    )}
                  </div>
                </Col>
              </Row>
            )}

            <Row className="g-3">
              <Col xs={12} xl={8}>
                <div className="panel p-4 h-100">
                  <div className="panel-eyebrow mb-2">AI synthesis & robustness audit</div>
                  <h5 className="mb-3">{summary.headline}</h5>

                  {summary.key_findings?.length > 0 && (
                    <>
                      <div className="fw-semibold mb-2">Key findings</div>
                      <ul className="audit-list mb-4">
                        {summary.key_findings.map((finding: string, i: number) => (
                          <li key={i}>{finding}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="d-flex flex-wrap gap-2 mt-4 d-print-none">
                    <Button
                      className="btn-cyan"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                      onClick={handleClone}
                    >
                      Clone config
                    </Button>
                    <Button
                      variant="outline-secondary"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                      onClick={handleExportCsv}
                    >
                      Export CSV
                    </Button>
                    <Button
                      variant="outline-secondary"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                      onClick={handlePrint}
                    >
                      Print Report (PDF)
                    </Button>
                  </div>
                </div>
              </Col>

              <Col xs={12} xl={4}>
                <div className="panel p-4 h-100 warning-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="panel-eyebrow mb-0">Robustness guard</div>
                    <span className="confidence-pill">
                      {formatNumber(run.robustness?.confidence_score, 1)} / 10
                    </span>
                  </div>

                  {run.robustness?.edge_of_grid && (
                    <div className="mb-2">
                      <span className="badge bg-danger text-white">Edge-of-Grid Warning</span>
                    </div>
                  )}

                  {run.robustness?.warnings?.length ? (
                    <ul className="guard-list">
                      {run.robustness.warnings.map((warning: string) => <li key={warning}>{warning}</li>)}
                    </ul>
                  ) : (
                    <div className="text-muted">No warnings recorded.</div>
                  )}

                  <div className="mt-4 small text-muted">
                    Historical simulation only. Results are not investment advice or a guarantee of future returns.
                  </div>
                </div>
              </Col>
            </Row>
          </Tab.Pane>

          <Tab.Pane eventKey="diagnostics">
            <div className="panel p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="mb-0">Execution Diagnostics</h5>
                  <span className="text-muted small">Real-time worker lifecycle, standard error, and subprocess signals.</span>
                </div>
                <Button
                  variant="outline-info"
                  size="sm"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                  onClick={() => {
                    setLogsLoading(true);
                    api.getRunLogs(run.run_id)
                      .then((res) => setLogs(res.logs))
                      .finally(() => setLogsLoading(false));
                  }}
                  disabled={logsLoading}
                >
                  Refresh Logs
                </Button>
              </div>

              {logsLoading ? (
                <div className="text-center py-4 text-muted">Loading logs…</div>
              ) : logs.length ? (
                <div className="table-responsive">
                  <Table size="sm" hover className="mono small mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: '180px' }}>Timestamp</th>
                        <th style={{ width: '90px' }}>Level</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, index) => (
                        <tr key={index} className={log.level === 'error' ? 'table-danger' : log.level === 'warning' ? 'table-warning' : ''}>
                          <td className="text-muted">{new Date(log.timestamp).toLocaleTimeString()}</td>
                          <td>
                            <span className={`badge ${log.level === 'error' ? 'bg-danger' : log.level === 'warning' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                              {log.level.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-break">{log.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-muted py-3">No log messages found for this run.</div>
              )}
            </div>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </>
  );
}
