import { useEffect, useMemo, useRef, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { countCombinations } from '../api/index';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { objectiveLabel, strategyLabel } from '../utils/format';
import type { Objective, ParameterRange, RunConfig, StrategyType } from '../types/domain';

const suggestionPrompts = [
  'Tune fast/slow MA on EURUSD to maximize Sharpe with drawdown under 15%',
  'Optimize EMA momentum on ES for total return with a 20% drawdown cap',
  'Find a stable SMA crossover on NQ with drawdown below 10%',
];

interface StudioForm extends RunConfig {
  prompt: string;
  transaction_costs: number;
  walk_forward: boolean;
}

interface StudioNavState {
  prompt?: string;
  config?: RunConfig;
}

const defaultForm: StudioForm = {
  prompt: suggestionPrompts[0] ?? '',
  strategy_type: 'sma_crossover',
  dataset_id: '',
  objective: 'sharpe',
  max_drawdown_limit: 0.15,
  fast_ma: { min: 5, max: 30, step: 5 },
  slow_ma: { min: 40, max: 120, step: 10 },
  transaction_costs: 0.0002,
  walk_forward: false,
};

function rangeToForm(range: Partial<ParameterRange> | undefined, fallback: ParameterRange): ParameterRange {
  return {
    min: Number(range?.min ?? fallback.min),
    max: Number(range?.max ?? fallback.max),
    step: Number(range?.step ?? fallback.step),
  };
}

export default function ExperimentStudioPage() {
  const { datasets, profiles, settings, parsePrompt, launchRun } = useApp();
  const location = useLocation();
  const navState = location.state as StudioNavState | null;
  const navigate = useNavigate();
  const initialized = useRef(false);
  const [form, setForm] = useState<StudioForm>(() => ({
    ...defaultForm,
    prompt: navState?.prompt || defaultForm.prompt,
  }));
  const [parsing, setParsing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialized.current || !datasets.length) return;
    initialized.current = true;

    const incoming = navState?.config;
    if (incoming) {
      setForm((current) => ({
        ...current,
        ...incoming,
        prompt: navState?.prompt || current.prompt,
        fast_ma: rangeToForm(incoming.fast_ma, defaultForm.fast_ma),
        slow_ma: rangeToForm(incoming.slow_ma, defaultForm.slow_ma),
      }));
      return;
    }

    const profile = profiles[0];
    setForm((current) => ({
      ...current,
      dataset_id: datasets[0]?.dataset_id || '',
      strategy_type: profile?.strategy_type || current.strategy_type,
      objective: profile?.objective || current.objective,
      max_drawdown_limit: profile?.max_drawdown_limit ?? current.max_drawdown_limit,
      fast_ma: rangeToForm(profile?.params?.fast_ma, defaultForm.fast_ma),
      slow_ma: rangeToForm(profile?.params?.slow_ma, defaultForm.slow_ma),
    }));
  }, [datasets, navState, profiles]);

  const combinations = useMemo(() => countCombinations(form), [form]);
  const overCap = combinations > (settings.max_trials || 500);
  const activeDataset = datasets.find((dataset) => dataset.dataset_id === form.dataset_id);

  function updateField<K extends keyof StudioForm>(field: K, value: StudioForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function updateRange(rangeName: 'fast_ma' | 'slow_ma', field: keyof ParameterRange, value: string | number) {
    setForm((current) => ({
      ...current,
      [rangeName]: {
        ...current[rangeName],
        [field]: Number(value),
      },
    }));
    setError(null);
  }

  async function handleParse() {
    if (!form.prompt.trim()) {
      setError('Describe the optimization you want before parsing.');
      return;
    }

    setParsing(true);
    setError(null);
    setMessage(null);
    try {
      const parsed = await parsePrompt(form.prompt);
      setForm((current) => ({
        ...current,
        ...parsed,
        fast_ma: rangeToForm(parsed.fast_ma, current.fast_ma),
        slow_ma: rangeToForm(parsed.slow_ma, current.slow_ma),
      }));
      setMessage(parsed.clarification || `Parsed ${parsed.estimated_combinations} combinations from your prompt.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to parse the prompt.');
    } finally {
      setParsing(false);
    }
  }

  async function handleLaunch() {
    if (!form.dataset_id) {
      setError('Select a dataset before launching the run.');
      return;
    }
    if (combinations === 0) {
      setError('No valid combinations. Fast MA must stay below slow MA.');
      return;
    }
    if (overCap) {
      setError(`This grid has ${combinations} combinations; the cap is ${settings.max_trials}. Increase the step size.`);
      return;
    }

    setLaunching(true);
    setError(null);
    try {
      const run = await launchRun(form);
      await Swal.fire({
        icon: 'success',
        title: 'Run completed',
        text: `${run.trials} trials finished. Opening analytics…`,
        timer: 1500,
        showConfirmButton: false,
      });
      navigate(`/results/${run.run_id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to launch the run.');
    } finally {
      setLaunching(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Configuration studio"
        title="New experiment"
        subtitle="Describe the goal in plain English, then review the parsed parameter grid before launching."
        actions={(
          <Button variant="outline-secondary" onClick={() => navigate('/')}>
            Back to dashboard
          </Button>
        )}
      />

      {error && <Alert variant="danger" className="soft-alert">{error}</Alert>}
      {message && <Alert variant="info" className="soft-alert">{message}</Alert>}

      <Row className="g-3">
        <Col xs={12} xl={7}>
          <div className="panel p-4 mb-3">
            <div className="panel-eyebrow mb-2">AI optimization assistant</div>
            <Form.Control
              as="textarea"
              rows={4}
              className="dark-input"
              value={form.prompt}
              onChange={(event) => updateField('prompt', event.target.value)}
              placeholder="e.g. Tune fast/slow MA on EURUSD to maximize Sharpe with drawdown under 15%"
            />

            <div className="d-flex flex-wrap gap-2 mt-3">
              {suggestionPrompts.map((suggestion) => (
                <button
                  className="suggestion-pill"
                  key={suggestion}
                  type="button"
                  onClick={() => updateField('prompt', suggestion)}
                >
                  {suggestion.includes('EMA') ? 'EMA' : suggestion.includes('NQ') ? 'NQ' : 'SMA'}
                </button>
              ))}
            </div>

            <div className="d-flex align-items-center gap-3 mt-4">
              <Button className="btn-cyan" onClick={handleParse} disabled={parsing}>
                {parsing ? <><Spinner size="sm" className="me-2" />Parsing…</> : 'Parse parameters'}
              </Button>
              <span className="text-muted small">
                The assistant only creates a validated configuration; it never runs code directly.
              </span>
            </div>
          </div>

          <div className="panel p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="panel-eyebrow">Parameter grid</div>
              <span className={`badge-soft ${overCap ? 'badge-danger' : 'badge-success'}`}>
                {combinations} / {settings.max_trials || 500} combinations
              </span>
            </div>

            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="strategyType">
                  <Form.Label>Strategy</Form.Label>
                  <Form.Select
                    className="dark-input"
                    value={form.strategy_type}
                    onChange={(event) => updateField('strategy_type', event.target.value as StrategyType)}
                  >
                    <option value="sma_crossover">{strategyLabel('sma_crossover')}</option>
                    <option value="ema_momentum">{strategyLabel('ema_momentum')}</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="datasetSelect">
                  <Form.Label>Dataset</Form.Label>
                  <Form.Select
                    className="dark-input"
                    value={form.dataset_id}
                    onChange={(event) => updateField('dataset_id', event.target.value)}
                  >
                    <option value="">Select a dataset…</option>
                    {datasets.map((dataset) => (
                      <option key={dataset.dataset_id} value={dataset.dataset_id}>
                        {dataset.name} ({dataset.symbol} · {dataset.timeframe})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="objective">
                  <Form.Label>Objective</Form.Label>
                  <Form.Select
                    className="dark-input"
                    value={form.objective}
                    onChange={(event) => updateField('objective', event.target.value as Objective)}
                  >
                    <option value="sharpe">{objectiveLabel('sharpe')}</option>
                    <option value="total_return">{objectiveLabel('total_return')}</option>
                    <option value="calmar">{objectiveLabel('calmar')}</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="drawdownLimit">
                  <Form.Label>Max drawdown limit</Form.Label>
                  <Form.Control
                    className="dark-input"
                    type="number"
                    min="0.01"
                    max="1"
                    step="0.01"
                    value={form.max_drawdown_limit}
                    onChange={(event) => updateField('max_drawdown_limit', Number(event.target.value))}
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr className="panel-divider" />

            <Row className="g-3">
              <Col md={6}>
                <div className="range-group">
                  <div className="fw-semibold mb-2">Fast MA</div>
                  <div className="d-flex gap-2">
                    <Form.Control
                      className="dark-input"
                      type="number"
                      min="1"
                      value={form.fast_ma.min}
                      onChange={(event) => updateRange('fast_ma', 'min', event.target.value)}
                      aria-label="Fast MA minimum"
                    />
                    <Form.Control
                      className="dark-input"
                      type="number"
                      min="1"
                      value={form.fast_ma.max}
                      onChange={(event) => updateRange('fast_ma', 'max', event.target.value)}
                      aria-label="Fast MA maximum"
                    />
                    <Form.Control
                      className="dark-input"
                      type="number"
                      min="1"
                      value={form.fast_ma.step}
                      onChange={(event) => updateRange('fast_ma', 'step', event.target.value)}
                      aria-label="Fast MA step"
                    />
                  </div>
                  <div className="text-muted tiny mt-1">Min · Max · Step</div>
                </div>
              </Col>

              <Col md={6}>
                <div className="range-group">
                  <div className="fw-semibold mb-2">Slow MA</div>
                  <div className="d-flex gap-2">
                    <Form.Control
                      className="dark-input"
                      type="number"
                      min="1"
                      value={form.slow_ma.min}
                      onChange={(event) => updateRange('slow_ma', 'min', event.target.value)}
                      aria-label="Slow MA minimum"
                    />
                    <Form.Control
                      className="dark-input"
                      type="number"
                      min="1"
                      value={form.slow_ma.max}
                      onChange={(event) => updateRange('slow_ma', 'max', event.target.value)}
                      aria-label="Slow MA maximum"
                    />
                    <Form.Control
                      className="dark-input"
                      type="number"
                      min="1"
                      value={form.slow_ma.step}
                      onChange={(event) => updateRange('slow_ma', 'step', event.target.value)}
                      aria-label="Slow MA step"
                    />
                  </div>
                  <div className="text-muted tiny mt-1">Min · Max · Step</div>
                </div>
              </Col>
            </Row>

            <hr className="panel-divider" />

            <div className="d-flex flex-wrap gap-4">
              <Form.Check
                type="switch"
                id="transactionCosts"
                label="Include transaction costs"
                checked={Boolean(form.transaction_costs)}
                onChange={(event) => updateField('transaction_costs', event.target.checked ? 0.0002 : 0)}
              />
              <Form.Check
                type="switch"
                id="walkForward"
                label="Walk-forward validation"
                checked={Boolean(form.walk_forward)}
                onChange={(event) => updateField('walk_forward', event.target.checked)}
              />
            </div>
          </div>
        </Col>

        <Col xs={12} xl={5}>
          <div className="panel p-4 sticky-panel">
            <div className="panel-eyebrow mb-3">Parsed preview</div>

            <div className="preview-grid">
              <div>
                <div className="text-muted tiny">Strategy</div>
                <div className="fw-semibold">{strategyLabel(form.strategy_type)}</div>
              </div>
              <div>
                <div className="text-muted tiny">Dataset</div>
                <div className="fw-semibold">{activeDataset?.name || 'Not selected'}</div>
              </div>
              <div>
                <div className="text-muted tiny">Objective</div>
                <div className="fw-semibold">{objectiveLabel(form.objective)}</div>
              </div>
              <div>
                <div className="text-muted tiny">Max drawdown</div>
                <div className="fw-semibold mono">{(form.max_drawdown_limit * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-muted tiny">Fast MA</div>
                <div className="mono">{form.fast_ma.min} / {form.fast_ma.max} / {form.fast_ma.step}</div>
              </div>
              <div>
                <div className="text-muted tiny">Slow MA</div>
                <div className="mono">{form.slow_ma.min} / {form.slow_ma.max} / {form.slow_ma.step}</div>
              </div>
            </div>

            <div className={`combination-card ${overCap ? 'is-over' : ''}`}>
              <div className="text-muted small">Estimated combinations</div>
              <div className="combination-value">{combinations}</div>
              <div className="text-muted small">of {settings.max_trials || 500} cap</div>
            </div>

            {activeDataset ? (
              <div className="text-muted small mb-3">
                {activeDataset.symbol} · {activeDataset.timeframe} · {activeDataset.date_range} · {activeDataset.rows.toLocaleString()} rows
              </div>
            ) : (
              <Alert variant="warning" className="soft-alert">
                Upload or select a dataset before launching.
              </Alert>
            )}

            <div className="d-flex gap-2 mt-4">
              <Button variant="outline-secondary" className="flex-grow-1" onClick={() => navigate('/')}>
                Cancel
              </Button>
              <Button
                className="btn-cyan flex-grow-1"
                onClick={handleLaunch}
                disabled={launching || parsing || Boolean(overCap) || combinations === 0}
              >
                {launching ? <><Spinner size="sm" className="me-2" />Running…</> : 'Launch run'}
              </Button>
            </div>
          </div>
        </Col>
      </Row>
    </>
  );
}
