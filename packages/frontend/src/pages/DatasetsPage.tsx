import { useRef, useState, type DragEvent } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import Swal from 'sweetalert2';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { api } from '../api/index';
import { ApiError } from '../api/client';
import { formatInteger } from '../utils/format';
import type { Dataset, DatasetPreviewResponse } from '../types/domain';

export default function DatasetsPage() {
  const { datasets, uploadDataset, removeDataset } = useApp();
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<{ message: string; code?: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<DatasetPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function handleFile(file?: File): Promise<void> {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setUploadError({
        message: 'Unsupported file format. Please upload an OHLCV .csv file.',
        code: 'INVALID_FILE_TYPE',
      });
      return;
    }

    setLastUploadedFile(file);
    setUploadError(null);
    setBusy(true);
    setUploadProgress(0);

    const baseName = file.name.replace(/\.csv$/i, '');
    const parts = baseName.toUpperCase().split(/[_\-\s]+/).filter(Boolean);
    const symbol = parts[0] || 'UNKNOWN';
    const timeframe = parts.slice(1).join('') || '1H';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', baseName);
    formData.append('symbol', symbol);
    formData.append('timeframe', timeframe);

    try {
      const created = await uploadDataset(formData, (percent) => {
        setUploadProgress(percent);
      });

      setUploadProgress(null);
      await Swal.fire({
        icon: 'success',
        title: 'Dataset uploaded & validated',
        text: `${created.name} (${created.symbol}) · ${created.rows.toLocaleString()} rows verified.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      setUploadProgress(null);
      let message = 'Upload failed. Please check the CSV file formatting and try again.';
      let code: string | undefined;

      if (error instanceof ApiError) {
        message = error.message;
        code = error.code;
      } else if (error instanceof Error) {
        message = error.message;
      }

      setUploadError({ message, code });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(dataset: Dataset): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: `Delete ${dataset.name}?`,
      text: 'Datasets referenced by active or completed runs cannot be deleted.',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ff5d5d',
    });
    if (!result.isConfirmed) return;

    try {
      await removeDataset(dataset.dataset_id);
      Swal.fire({ icon: 'success', title: 'Dataset removed', timer: 1200, showConfirmButton: false });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete dataset.';
      Swal.fire({
        icon: 'error',
        title: 'Deletion blocked',
        text: message,
      });
    }
  }

  async function handleOpenPreview(dataset: Dataset): Promise<void> {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);

    try {
      const data = await api.getDatasetPreview(dataset.dataset_id);
      setPreviewData(data);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to load preview.');
    } finally {
      setPreviewLoading(false);
    }
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
      label: 'Actions',
      align: 'end',
      render: (dataset) => (
        <div className="d-flex justify-content-end gap-2">
          <Button
            variant="outline-info"
            size="sm"
            style={{ minHeight: '44px', minWidth: '44px' }}
            onClick={() => void handleOpenPreview(dataset)}
            aria-label={`Preview rows for ${dataset.name}`}
          >
            Preview
          </Button>
          <Button
            variant="outline-danger"
            size="sm"
            style={{ minHeight: '44px', minWidth: '44px' }}
            onClick={() => void handleDelete(dataset)}
            aria-label={`Delete dataset ${dataset.name}`}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Data manager"
        title="Historical datasets"
        subtitle="Upload OHLCV CSVs, validate schema and integrity, and inspect stored candles."
        actions={(
          <Button
            className="btn-cyan"
            style={{ minHeight: '44px', minWidth: '44px' }}
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? 'Processing…' : 'Upload CSV'}
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

      {uploadProgress !== null && (
        <div className="mb-4">
          <div className="d-flex justify-content-between small text-muted mb-1">
            <span>Uploading dataset…</span>
            <span>{uploadProgress}%</span>
          </div>
          <ProgressBar now={uploadProgress} animated={uploadProgress < 100} variant="info" />
        </div>
      )}

      {uploadError && (
        <div aria-live="polite" className="mb-4">
          <Alert variant="danger" dismissible onClose={() => setUploadError(null)}>
            <Alert.Heading className="h6 mb-1">Upload Validation Error</Alert.Heading>
            <p className="mb-2">{uploadError.message}</p>
            {uploadError.code && (
              <p className="small mono text-danger-emphasis mb-2">Error code: {uploadError.code}</p>
            )}
            {lastUploadedFile && (
              <Button
                variant="outline-danger"
                size="sm"
                style={{ minHeight: '44px', minWidth: '44px' }}
                onClick={() => void handleFile(lastUploadedFile)}
                disabled={busy}
              >
                Retry Upload
              </Button>
            )}
          </Alert>
        </div>
      )}

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
              <li>Header row includes required OHLCV columns</li>
              <li>Timestamps are strictly chronological with zero duplicates</li>
              <li>Prices and volume are strictly valid positive numbers</li>
              <li>Files stored in isolated owner storage</li>
              <li>Referential integrity protects active experiment runs</li>
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

      {/* Dataset Preview Modal */}
      <Modal
        show={previewOpen}
        onHide={() => setPreviewOpen(false)}
        size="lg"
        centered
        aria-labelledby="dataset-preview-title"
      >
        <Modal.Header closeButton>
          <Modal.Title id="dataset-preview-title">
            {previewData ? `${previewData.name} — First 10 Rows` : 'Dataset Preview'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {previewLoading && (
            <div className="text-center py-4 text-muted">
              Loading preview data…
            </div>
          )}

          {previewError && (
            <Alert variant="danger">
              {previewError}
            </Alert>
          )}

          {previewData && (
            <div>
              <div className="d-flex justify-content-between mb-3 text-muted small">
                <span>Symbol: <strong>{previewData.symbol}</strong> ({previewData.timeframe})</span>
                <span>Total rows: <strong>{previewData.total_rows.toLocaleString()}</strong></span>
              </div>
              <div className="table-responsive">
                <Table striped bordered hover size="sm" className="mb-0">
                  <thead>
                    <tr>
                      {previewData.columns.map((col) => (
                        <th key={col} className="mono small">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview_rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="mono small">{row.timestamp}</td>
                        <td className="mono small text-end">{row.open}</td>
                        <td className="mono small text-end">{row.high}</td>
                        <td className="mono small text-end">{row.low}</td>
                        <td className="mono small text-end">{row.close}</td>
                        <td className="mono small text-end">{row.volume}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            style={{ minHeight: '44px', minWidth: '44px' }}
            onClick={() => setPreviewOpen(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
