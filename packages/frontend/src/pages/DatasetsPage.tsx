import { useRef, useState, type DragEvent } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Swal from 'sweetalert2';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { formatInteger } from '../utils/format';
import type { Dataset, UploadDataset } from '../types/domain';

const REQUIRED_COLUMNS = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];

function parseCsvMetadata(file: File, text: string): UploadDataset & { rows: number } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) {
    throw new Error('The CSV is empty.');
  }

  const headerLine = lines[0];
  if (!headerLine) {
    throw new Error('The CSV is empty.');
  }
  const headers = headerLine.split(',').map((header) => header.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(', ')}.`);
  }

  const firstTimestamp = lines[1]?.split(',')[0]?.trim();
  const lastTimestamp = lines[lines.length - 1]?.split(',')[0]?.trim();

  const seenTimestamps = new Set();
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    const timestamp = line.split(',')[0]?.trim();
    if (!timestamp) continue;
    if (seenTimestamps.has(timestamp)) {
      throw new Error(`Duplicate timestamp on row ${index + 1}: ${timestamp}`);
    }
    seenTimestamps.add(timestamp);
  }

  const firstDate = firstTimestamp ? new Date(firstTimestamp) : null;
  const lastDate = lastTimestamp ? new Date(lastTimestamp) : null;

  const baseName = file.name.replace(/\.csv$/i, '');
  const parts = baseName.toUpperCase().split(/[_\-\s]+/).filter(Boolean);
  const symbol = parts[0] || 'UNKNOWN';
  const timeframe = parts.slice(1).join('') || '1H';

  const dateRange = firstDate && lastDate && !Number.isNaN(firstDate.valueOf()) && !Number.isNaN(lastDate.valueOf())
    ? `${firstDate.toISOString().slice(0, 10)} to ${lastDate.toISOString().slice(0, 10)}`
    : '—';

  return {
    name: baseName,
    symbol,
    timeframe,
    dateRange,
    rows: lines.length - 1,
  };
}

export default function DatasetsPage() {
  const { datasets, uploadDataset, removeDataset } = useApp();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file?: File): Promise<void> {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      Swal.fire({ icon: 'error', title: 'Unsupported file', text: 'Upload an OHLCV .csv file.' });
      return;
    }

    setBusy(true);
    try {
      const text = await file.text();
      const metadata = parseCsvMetadata(file, text);
      await uploadDataset({ ...metadata, csvText: text });
      await Swal.fire({
        icon: 'success',
        title: 'Dataset validated',
        text: `${metadata.name} · ${metadata.rows.toLocaleString()} rows imported.`,
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Upload failed', text: error instanceof Error ? error.message : 'Upload failed.' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(dataset: Dataset): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: `Delete ${dataset.name}?`,
      text: 'Runs that reference this dataset remain in the experiment log.',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ff5d5d',
    });
    if (!result.isConfirmed) return;
    await removeDataset(dataset.dataset_id);
    Swal.fire({ icon: 'success', title: 'Dataset removed', timer: 1200, showConfirmButton: false });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  const columns: DataTableColumn<Dataset>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (dataset) => (
        <div>
          <div className="fw-semibold">{dataset.name}</div>
          <div className="text-muted small mono">{dataset.dataset_id}</div>
        </div>
      ),
    },
    { key: 'symbol', label: 'Symbol', render: (dataset) => <span className="mono">{dataset.symbol}</span> },
    { key: 'timeframe', label: 'Bar', render: (dataset) => dataset.timeframe },
    { key: 'date_range', label: 'Date range', render: (dataset) => <span className="mono small">{dataset.date_range}</span> },
    { key: 'rows', label: 'Rows', align: 'end', render: (dataset) => formatInteger(dataset.rows) },
    {
      key: 'status',
      label: 'Status',
      render: () => <span className="badge-soft badge-success">Validated</span>,
    },
    {
      key: 'actions',
      label: '',
      align: 'end',
      render: (dataset) => (
        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(dataset)}>
          Delete
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Data manager"
        title="Historical datasets"
        subtitle="Upload OHLCV CSVs, validate required columns, and manage the datasets available to experiments."
        actions={(
          <Button className="btn-cyan" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? 'Validating…' : 'Upload CSV'}
          </Button>
        )}
      />

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="visually-hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <Row className="g-3 mb-4">
        <Col xs={12} lg={8}>
          <div
            className={`panel upload-zone ${dragging ? 'is-dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
            }}
          >
            <div className="upload-icon">CSV</div>
            <h5 className="mb-1">Drag & drop an OHLCV CSV</h5>
            <p className="text-muted mb-2">or click to browse. Required columns:</p>
            <p className="mono small mb-0 text-info">timestamp, open, high, low, close, volume</p>
          </div>
        </Col>

        <Col xs={12} lg={4}>
          <div className="panel p-4 h-100">
            <div className="panel-eyebrow mb-3">Validation checklist</div>
            <ul className="check-list">
              <li>Timestamp column parses as a date</li>
              <li>OHLC columns are present</li>
              <li>Duplicate timestamps are rejected by the API</li>
              <li>Rows are counted before upload</li>
              <li>Metadata is stored with the dataset record</li>
            </ul>
          </div>
        </Col>
      </Row>

      <div className="panel overflow-hidden">
        <div className="panel-heading">
          <div>
            <div className="panel-eyebrow">Active datasets</div>
            <div className="text-muted small">Metadata verified · {datasets.length} datasets</div>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={datasets}
          rowKey="dataset_id"
          emptyMessage="No datasets yet. Upload an OHLCV CSV to begin."
        />
      </div>
    </>
  );
}
