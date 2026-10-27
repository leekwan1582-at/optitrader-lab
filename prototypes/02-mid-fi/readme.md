# OptiTrader Lab — Medium-Fidelity Prototype

Interactive, browser-based prototype of the OptiTrader Lab workflows. It is the middle tier between the paper wireframes in `01-lo-fi/` and the React application in `03-hi-fi/`.

## Files

| File | Purpose |
|---|---|
| `index.html` | Six-screen single-page layout |
| `stylesheet.css` | Dark enterprise dashboard theme |
| `script.js` | ES6 navigation, mock parsing, charts and table rendering |
| `mockData.json` | Workspace, dataset, profile, run, robustness and error-log fixtures |

## Run it

No build step or backend is required. Serve the folder over HTTP so `fetch("mockData.json")` works:

```bash
cd prototypes/02-mid-fi
python3 -m http.server 8000
```

Open `http://localhost:8000`.

Alternative:

```bash
npx serve prototypes/02-mid-fi
```

Opening `index.html` directly via `file://` may block the JSON fetch in some browsers.

## Screens

| Screen | Purpose |
|---|---|
| 0 — Login | Personal workspace entry |
| 1 — Dashboard | KPI cards, quick prompt and recent experiments |
| 2 — Experiment Studio | AI prompt parsing and parameter preview |
| 3 — Datasets | Drag-and-drop OHLCV upload and dataset table |
| 4 — Results Analytics | Equity curve, metrics and robustness guard |
| 5 — Comparison | Overlay chart, metrics matrix and experiment log |

The login, prompt parsing, upload and exports are simulated in the browser. The prototype demonstrates interaction and layout, not a live backtest.

## Relationship to the other prototypes

- `01-lo-fi/` defines the paper wireframes and feature intent.
- `02-mid-fi/` (this folder) validates the interaction flow with mock data.
- `03-hi-fi/` implements the React client, Express API, MongoDB models and Python/vectorbt engine.

Canonical documentation:

- [Capstone report](../../docs/submission.md)
- [Technical design](../../docs/design_v01.md)
- [High-fidelity setup](../03-hi-fi/readme.md)

## Known limitations

- No authentication, API or database.
- Mock data is loaded once from `mockData.json`; changes are not persisted.
- The AI assistant always returns a simulated parsed configuration.
- CSV upload is validated in the browser only; no file is stored.
- Charts use ApexCharts via CDN.
