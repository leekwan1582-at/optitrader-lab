import { useMemo } from 'react';
import { Alert, Button, Col, Form, Row } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import ChartWrapper from '../components/ChartWrapper.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSkeleton from '../components/LoadingSkeleton.jsx';
import MetricRow from '../components/MetricRow.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useApp } from '../context/AppContext.jsx';
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
} from '../utils/format.js';

export default function ResultsPage() {
  const { runs, cloneRun, loading } = useApp();
  const { runId } = useParams();
  const navigate = useNavigate();

  const run = useMemo(() => {
    if (runId) {
      return runs.find((item) => item.run_id === runId)
        || runs.find((item) => item.status === 'completed')
        || runs[0];
    }
    return runs.find((item) => item.status === 'completed') || runs[0];
  }, [runId, runs]);

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
          action={<Button className="btn-cyan" onClick={() => navigate('/experiments/new')}>New experiment</Button>}
        />
      </>
    );
  }

  const isFailed = run.status === 'failed';
  const categories = (run.equity_curve || []).map((_, index) => `W${index + 1}`);
  const series = [{
    name: run.profile_name || 'Equity',
    data: run.equity_curve || [],
  }];

  const summary = run.ai_summary || {
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
    try {
      const config = await cloneRun(run.run_id);
      navigate('/experiments/new', { state: { config, prompt: `Clone of ${run.profile_name}` } });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Clone failed', text: error.message });
    }
  }

  function handleExportCsv() {
    if (!run.equity_curve?.length) {
      Swal.fire({ icon: 'info', title: 'Nothing to export', text: 'This run has no equity curve.' });
      return;
    }
    const rows = [
      'week,equity',
      ...run.equity_curve.map((value, index) => `${index + 1},${value}`),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${shortRunId(run.run_id)}-equity.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    Swal.fire({
      icon: 'info',
      title: 'PDF export',
      text: 'PDF export is planned for the production build. Use the CSV export for now.',
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Results analytics studio"
        title={run.profile_name || 'Run results'}
        subtitle={`Run ${shortRunId(run.run_id)} · ${formatDate(run.created_at)} · ${run.dataset_name}`}
        actions={(
          <div className="d-flex gap-2 align-items-center">
            <Form.Select
              className="dark-input run-select"
              value={run.run_id}
              onChange={(event) => navigate(`/results/${event.target.value}`)}
              aria-label="Select run"
            >
              {runs.map((item) => (
                <option key={item.run_id} value={item.run_id}>
                  {shortRunId(item.run_id)} · {item.profile_name} · {statusLabel(item.status)}
                </option>
              ))}
            </Form.Select>
            <Button variant="outline-secondary" onClick={handleClone}>Clone config</Button>
          </div>
        )}
      />

      <div className="panel p-3 mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <span className="text-muted small me-2">Run hash</span>
          <span className="mono text-info fw-semibold">{runHash(run.run_id)}</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span className="text-muted small">{formatDuration(run.duration_ms)}</span>
          <StatusBadge status={run.status} />
        </div>
      </div>

      {isFailed ? (
        <Alert variant="danger" className="soft-alert">
          <div className="fw-semibold mb-1">Run failed · {run.error_code || 'UNKNOWN'}</div>
          <div className="mb-2">The worker stopped before producing an equity curve.</div>
          <div className="small text-muted">
            Suggested action: reduce the search space or lower the combination count, then relaunch.
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
              <div className="panel-eyebrow mb-3">Key metrics</div>
              <MetricRow label="Sharpe ratio" value={formatNumber(run.best?.sharpe)} tone="success" />
              <MetricRow label="Total return" value={formatPercent(run.best?.total_return)} />
              <MetricRow label="Max drawdown" value={formatPercent(run.best?.max_drawdown)} />
              <MetricRow label="Profit factor" value={formatNumber(run.best?.profit_factor)} />
              <MetricRow label="Trades" value={formatInteger(run.best?.trades)} />
              <MetricRow label="Trials tested" value={formatInteger(run.trials)} />
              <MetricRow label="Holdout" value={formatPercent(run.holdout_pct)} />
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
                <div className="fw-semibold mb-2">Observations</div>
                <ul className="audit-list mb-4">
                  {summary.key_findings.map((finding) => <li key={finding}>{finding}</li>)}
                </ul>
              </>
            )}

            {summary.caveats?.length > 0 && (
              <>
                <div className="fw-semibold mb-2">Caveats</div>
                <ul className="audit-list caveat-list">
                  {summary.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
                </ul>
              </>
            )}

            <div className="d-flex flex-wrap gap-2 mt-4">
              <Button className="btn-cyan" onClick={handleClone}>Clone config</Button>
              <Button variant="outline-secondary" onClick={handleExportCsv}>Export CSV</Button>
              <Button variant="outline-secondary" onClick={handleExportPdf}>Export PDF</Button>
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

            {run.robustness?.warnings?.length ? (
              <ul className="guard-list">
                {run.robustness.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            ) : (
              <div className="text-muted">No warnings recorded.</div>
            )}

            <div className="mt-4 small text-muted">
              Historical simulation only. Results are not investment advice or a prediction of future returns.
            </div>
          </div>
        </Col>
      </Row>
    </>
  );
}
