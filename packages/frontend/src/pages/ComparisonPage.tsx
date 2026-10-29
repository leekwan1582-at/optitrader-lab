import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChartWrapper from '../components/ChartWrapper';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import type { Run } from '../types/domain';
import {
  formatInteger,
  formatNumber,
  formatPercent,
  shortRunId,
  strategyLabel,
} from '../utils/format';

interface MetricRowData {
  label: string;
  values: ReactNode[];
}

function metricRows(runs: Run[]): MetricRowData[] {
  return [
    { label: 'Sharpe ratio (IS)', values: runs.map((run) => formatNumber(run.best?.sharpe)) },
    { label: 'Total return (IS)', values: runs.map((run) => formatPercent(run.best?.total_return)) },
    { label: 'Max drawdown (IS)', values: runs.map((run) => formatPercent(run.best?.max_drawdown)) },
    { label: 'Calmar ratio', values: runs.map((run) => formatNumber(run.best?.calmar_ratio)) },
    { label: 'OOS Sharpe', values: runs.map((run) => formatNumber(run.best?.oos_sharpe)) },
    { label: 'OOS Return', values: runs.map((run) => formatPercent(run.best?.oos_total_return)) },
    { label: 'OOS Max DD', values: runs.map((run) => formatPercent(run.best?.oos_max_drawdown)) },
    { label: 'Out-of-sample drop', values: runs.map((run) => formatPercent(run.robustness?.out_of_sample_drop)) },
    {
      label: 'Edge of grid',
      values: runs.map((run) => (
        run.robustness?.edge_of_grid
          ? <span key={run.run_id} className="badge bg-danger">Hit boundary</span>
          : <span key={run.run_id} className="text-muted">No</span>
      )),
    },
    { label: 'Confidence score', values: runs.map((run) => `${formatNumber(run.robustness?.confidence_score, 1)} / 10`) },
    { label: 'Profit factor', values: runs.map((run) => formatNumber(run.best?.profit_factor)) },
    { label: 'Trials', values: runs.map((run) => formatInteger(run.trials)) },
    { label: 'Status', values: runs.map((run) => <StatusBadge key={run.run_id} status={run.status} />) },
  ];
}

export default function ComparisonPage() {
  const { runs, compareRuns, loading: workspaceLoading } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>(() => (
    (searchParams.get('ids') || '').split(',').filter(Boolean)
  ));
  const [comparedRuns, setComparedRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const autoSelected = useRef(false);

  useEffect(() => {
    if (!autoSelected.current && !selectedIds.length && runs.length) {
      autoSelected.current = true;
      setSelectedIds(
        runs.filter((run) => run.status === 'completed').slice(0, 2).map((run) => run.run_id)
      );
    }
  }, [runs, selectedIds.length]);

  useEffect(() => {
    let active = true;
    if (!selectedIds.length) {
      setComparedRuns([]);
      return undefined;
    }

    setLoading(true);
    compareRuns(selectedIds)
      .then((data) => {
        if (active) setComparedRuns(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [compareRuns, selectedIds]);

  const categories = useMemo(() => {
    const maxLength = Math.max(0, ...comparedRuns.map((run) => run.equity_curve?.length || 0));
    return Array.from({ length: maxLength }, (_, index) => `W${index + 1}`);
  }, [comparedRuns]);

  const series = comparedRuns
    .filter((run) => run.equity_curve?.length)
    .map((run) => ({
      name: `${shortRunId(run.run_id)} · ${run.profile_name}`,
      data: run.equity_curve ?? [],
    }));

  function toggleRun(runId: string) {
    setSelectedIds((current) => (
      current.includes(runId)
        ? current.filter((id) => id !== runId)
        : [...current, runId]
    ));
  }

  const columns: DataTableColumn<Run>[] = [
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
    { key: 'dataset', label: 'Dataset', render: (run) => <span className="mono">{run.dataset_name}</span> },
    { key: 'strategy', label: 'Strategy', render: (run) => strategyLabel(run.strategy_type) },
    { key: 'trials', label: 'Trials', align: 'end', render: (run) => formatInteger(run.trials) },
    {
      key: 'sharpe',
      label: 'Sharpe',
      align: 'end',
      render: (run) => <span className="mono">{formatNumber(run.best?.sharpe)}</span>,
    },
    { key: 'status', label: 'Status', render: (run) => <StatusBadge status={run.status} /> },
    {
      key: 'actions',
      label: '',
      align: 'end',
      render: (run) => (
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/results/${run.run_id}`);
          }}
        >
          Open
        </Button>
      ),
    },
  ];

  if (workspaceLoading) {
    return <LoadingSkeleton rows={7} />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Comparison"
        title="Experiment comparison matrix"
        subtitle="Overlay equity curves and compare metrics across completed or failed runs."
        actions={(
          <Button variant="outline-secondary" onClick={() => navigate('/')}>
            Back to dashboard
          </Button>
        )}
      />

      <Row className="g-3 mb-3">
        <Col xs={12} xl={8}>
          <div className="panel p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div className="panel-eyebrow">Overlaid equity curves</div>
                <div className="text-muted small">{selectedIds.length} selected</div>
              </div>
            </div>
            <ChartWrapper
              series={series}
              type="line"
              height={340}
              emptyMessage={loading ? 'Loading comparison…' : 'Select at least one completed run.'}
              options={{
                xaxis: { categories },
                tooltip: { y: { formatter: (value) => `$${Math.round(value).toLocaleString()}` } },
              }}
            />
          </div>
        </Col>

        <Col xs={12} xl={4}>
          <div className="panel p-4 h-100">
            <div className="panel-eyebrow mb-3">Metrics matrix</div>
            {comparedRuns.length ? (
              <div className="table-responsive">
                <Table className="custom-table table-compact comparison-matrix">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      {comparedRuns.map((run) => (
                        <th key={run.run_id} className="text-end">{shortRunId(run.run_id)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metricRows(comparedRuns).map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        {row.values.map((value, index) => (
                          <td key={`${row.label}-${index}`} className="text-end mono">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="text-muted">Select runs to compare.</div>
            )}
          </div>
        </Col>
      </Row>

      <div className="panel overflow-hidden">
        <div className="panel-heading">
          <div>
            <div className="panel-eyebrow">Experiment log</div>
            <div className="text-muted small">Select two or more runs to build the comparison.</div>
          </div>
          <Button
            variant="outline-secondary"
            size="sm"
            disabled={!selectedIds.length}
            onClick={() => setSelectedIds([])}
          >
            Clear selection
          </Button>
        </div>

        {runs.length ? (
          <DataTable
            columns={columns}
            rows={runs}
            rowKey="run_id"
            selectedKeys={selectedIds}
            onToggleRow={(key) => toggleRun(String(key))}
            onRowClick={(run) => navigate(`/results/${run.run_id}`)}
            emptyMessage="No runs yet."
          />
        ) : (
          <EmptyState title="No experiments to compare" />
        )}
      </div>
    </>
  );
}
