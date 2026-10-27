# OptiTrader Lab — TypeScript Candidate

> Production roadmap: [`../../docs/production-plan.md`](../../docs/production-plan.md).

**Research | Optimize | Validate | Deploy**

OptiTrader Lab is an AI-assisted optimization platform designed for solo quantitative traders and systematic strategy developers. It transforms strategy tuning from a manual, error-prone workflow into a structured, auditable experimentation process.

## 📖 Overview

Manual strategy optimization often leads to repetitive parameter tuning, fragmented result storage, and a lack of reproducibility. OptiTrader Lab solves this by treating **every optimization as a reproducible experiment**.

By combining natural-language interaction (via Google Gemini), automated parameter sweeps, and built-in robustness checks, traders can focus on evaluating ideas rather than managing files.

## 🛠 Tech Stack

- **Frontend:** React, Vite, TypeScript, react-bootstrap (with `bootstrap/dist/css/bootstrap.min.css`), apexcharts, sweetalert2
- **Backend:** Node.js (ES modules), TypeScript, Express
- **Database:** MongoDB (Mongoose)
- **AI Integration:** Google Gemini API (`@google/genai` SDK) with Function Calling
- **Quantitative Engine:** Python 3.11, `vectorbt`
- **Concurrency:** Node.js `child_process` (to spawn Python scripts)

> **Module system:** client and server source files are TypeScript (`.ts`/`.tsx`). The backend uses ES modules (`import`/`export`) with `"type": "module"` and `tsx` in development. Relative backend imports use `.js` specifiers that resolve to the compiled TypeScript files.

## 📂 Project Structure

```text
03-hi-fi-ts/
├── client/                     # React + Vite + TypeScript frontend
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── package.json
│   └── src/
│       ├── api/                # client.ts, mockApi.ts, realApi.ts, index.ts, types.ts
│       ├── components/         # AppLayout, Sidebar, KPICard, DataTable, ChartWrapper, …
│       ├── context/            # AppContext.tsx (session + workspace state)
│       ├── data/               # mockData.json (demo fixtures)
│       ├── pages/              # Login, Dashboard, Studio, Datasets, Results, Comparison
│       ├── types/              # domain.ts
│       ├── utils/              # format.ts
│       ├── App.tsx
│       ├── main.tsx
│       ├── vite-env.d.ts
│       └── styles.css
├── server/                     # Node.js + Express + TypeScript backend
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── app.ts                  # Express app factory, CORS, routes, error handling
│   ├── server.ts               # Startup: config → MongoDB → HTTP listener
│   ├── config.ts               # Environment/config validation
│   ├── database.ts             # MongoDB connection helper
│   ├── controllers/            # Auth, datasets, profiles, runs, assistant, misc
│   ├── middleware/             # JWT auth, Zod validation, rate limits, errors
│   ├── models/                 # Mongoose schemas
│   │   ├── User.ts
│   │   ├── Workspace.ts
│   │   ├── Dataset.ts
│   │   ├── Profile.ts
│   │   ├── Run.ts
│   │   ├── ErrorLog.ts
│   │   └── Setting.ts
│   ├── routes/                 # /api/auth, /api/datasets, /api/profiles, /api/runs…
│   ├── schemas/                # Zod request schemas
│   ├── services/               # Auth, datasets, runs, Gemini assistant
│   ├── test/                   # Config + domain tests (node:test via tsx)
│   ├── types/                  # domain.ts + Express request augmentation
│   ├── utils/                  # Errors, IDs, CSV parsing, combinations, run hashes
│   ├── workers/
│   │   └── backtestWorker.ts   # Spawns the Python/vectorbt engine
│   ├── uploads/                # Uploaded/synthetic CSVs (git-ignored)
│   ├── seed.ts                 # Demo user + database seed script
│   └── package.json
├── engine/                     # Python backtesting engine
│   ├── .venv/                  # Python virtual environment (git-ignored)
│   ├── backtest.py             # Main vectorbt execution script
│   └── requirements.txt        # Python dependencies (vectorbt, pandas, etc.)
├── test/
│   ├── readme.md               # Test environment and procedure
│   ├── test_backtest.py        # Python engine tests
│   ├── bridge.test.ts          # Node ↔ Python bridge tests
│   └── fixtures/
│       └── ohlcv.csv           # Deterministic 180-row OHLCV fixture
└── pytest.ini                  # Local pytest config: pythonpath = engine
```

### `pytest.ini`

This folder has a self-contained `pytest.ini` so its copied engine resolves `import backtest`:

```ini
[pytest]
pythonpath = engine
```

Run the Python engine tests from `prototypes/03-hi-fi-ts/`:

```bash
../../.venv/bin/python -m pytest -q
```

Or, with the venv activated:

```bash
pytest prototypes/03-hi-fi-ts/test/test_backtest.py -v
```

The Python suite covers only the engine (`parse_args`, `load_data`, `run_sma_crossover`, `extract_results`). It does **not** test server configuration, CORS, MongoDB, or the Gemini key.

Run the Node test suites (config, domain and the TypeScript ↔ Python bridge):

```bash
cd server
npm test
```

Target just the bridge test:

```bash
cd server
npm run test:bridge
```

The bridge suite (`test/bridge.test.ts`) spawns the real Python engine against `test/fixtures/ohlcv.csv` and checks successful JSON parsing, missing CSV handling, invalid config handling, and timeout enforcement. It does not require MongoDB or Gemini.

See [test/readme.md](test/readme.md) for the full test-environment setup, test-layer reference and troubleshooting.

Run the configuration preflight against your real `.env`:

```bash
cd server
npm run config:check
```

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local instance or MongoDB Atlas URI)
- [Google Gemini API Key](https://aistudio.google.com/app/apikey)
- **Python 3.11** (required for `vectorbt`)
- **WSL** (if developing on Windows, as `vectorbt` it’s mainly about numba/dependency installs on Windows, and that WSL is the recommended route)

---

### 1. Database

OptiTrader Lab uses MongoDB to store user data, datasets, and experiment logs. You have two options: **Local** (recommended for development) or **Cloud** (MongoDB Atlas).

#### Option A: Local MongoDB (Recommended for WSL/Ubuntu)

If you are developing in WSL (Ubuntu), install the MongoDB Community Edition locally.

1. **Install MongoDB** (if not already installed):

   ```bash
   sudo apt update
   sudo apt install -y mongodb-org
   ```

2. **Start the MongoDB service:**

   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

3. **Verify it is running:**

   ```bash
   sudo systemctl status mongod
   ```

4. **Set your `.env` variable** in `server/.env`:

   ```env
   MONGO_URI=mongodb://localhost:27017/optitrader_lab
   ```

5. **Install Mongoose** (done automatically in §2a, but listed here for clarity):

   ```bash
   cd server
   npm install mongoose
   ```

#### Option B: MongoDB Atlas (Cloud)

If you do not want to install MongoDB locally, use a free cloud database.

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2. Create a new free tier cluster.
3. Under **Database Access**, create a user with a username and password.
4. Under **Network Access**, allow access from your current IP address (or `0.0.0.0/0` for development).
5. Click **Connect**, choose **Drivers**, and copy the connection string.
6. Set your `.env` variable in `server/.env` (replace `<password>` and `<dbname>`):

   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/optitrader_lab?retryWrites=true&w=majority
   ```

> **Note:** With Atlas, ensure the connection string includes the database name (`optitrader_lab`) right before the `?` mark.

---

### 2. Backend Setup

```bash
cd server
```

#### 2a. Initialize `package.json` and install dependencies

If `server/package.json` is missing or empty:

```bash
npm init -y
```

**Install runtime dependencies:**

```bash
npm install express dotenv cors @google/genai mongoose \
  bcryptjs jsonwebtoken zod express-rate-limit
```

**Install dev dependencies:**

```bash
npm install -D typescript tsx @types/node @types/express @types/cors @types/jsonwebtoken
```

**What each package is for:**

| Package | Purpose |
|---|---|
| `express` + `cors` | HTTP API, JSON body parsing, CORS for the Vite origin |
| `mongoose` | MongoDB ODM |
| `dotenv` | Load `.env` variables |
| `@google/genai` | Google Gemini SDK (function calling, optional fallback) |
| `bcryptjs` | Password hashing (12 rounds) |
| `jsonwebtoken` | JWT access tokens |
| `zod` | Request and AI-output validation |
| `express-rate-limit` | Protects the assistant endpoint |
| `tsx` (dev) | TypeScript execution and watch mode |
| `typescript` (dev) | Type checking and build |
| `@types/*` (dev) | Node, Express, CORS, JWT and client types |

Ensure `server/package.json` contains `"type": "module"` and these scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch server.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/server.js",
    "seed": "tsx seed.ts",
    "test": "node --import tsx --test 'test/*.test.ts' '../test/*.test.ts'",
    "test:bridge": "node --import tsx --test ../test/bridge.test.ts",
    "typecheck": "tsc --noEmit",
    "config:check": "tsx -e \"import 'dotenv/config'; import { loadConfig } from './config.ts'; loadConfig(); console.log('✅ Configuration valid')\""
  }
}
```

> ℹ️ **Gemini SDK note:** this project uses the newer unified SDK `@google/genai`, not the legacy `@google/generative-ai`. Import it with ESM syntax:
>
> ```js
> import { GoogleGenAI } from '@google/genai';
> ```

#### 2b. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | ✅ | Express listen port (default `5000`). Must match `VITE_API_URL` in `client/.env`. |
| `NODE_ENV` | optional | `development` / `production` |
| `MONGO_URI` | ✅ | Local Mongo (`mongodb://localhost:27017/optitrader_lab`) or Atlas URI |
| `GEMINI_API_KEY` | ✅ | Get from https://aistudio.google.com/app/apikey |
| `GEMINI_MODEL` | optional | Model available in your AI Studio account (default in `.env.example`: `gemini-2.5-flash`) |
| `CLIENT_URL` | ✅ | CORS origin — must match the Vite port, e.g. `http://localhost:5173` |
| `JWT_SECRET` | ✅ for auth | Any strong random string; required when `NODE_ENV=production` (dev falls back with a warning) |
| `JWT_EXPIRES_IN` | if auth used | e.g. `1d` |

Validate the configuration before starting anything:

```bash
npm run config:check
```

`config.ts` rejects missing or placeholder values, non-MongoDB URIs, invalid ports, and `CLIENT_URL` values that are not a bare origin (a trailing slash is normalized). Its tests live in `server/test/config.test.ts` and run with `npm test`.

#### 2c. Smoke-test the database connection

Before launching the full app, verify MongoDB wiring with ESM:

```bash
npx tsx -e "import 'dotenv/config'; import connectDB from './database.ts'; await connectDB(); process.exit(0);"
```

Expected output:

```
✅ MongoDB Connected
```

If you see `ERR_INVALID_PACKAGE_CONFIG`, your `package.json` is empty or malformed — re-run `npm init -y` and reinstall dependencies (§2a).

#### 2d. Seed the database (optional, recommended for demos)

Populate MongoDB with sample data so the dashboard is populated on first load:

```bash
cd server
npm run seed
```

Expected output:

```
🌱 Seeding database...
✅ MongoDB Connected
🔐 Demo user: marcus@optitrader.dev / demo1234
🧹 Clearing existing collections...
  ✅ Workspace: Marcus_Lim_Research
  ✅ Datasets: 3
  ✅ Profiles: 2
  ✅ Runs: 3
  ✅ Error Logs: 3
  ✅ Settings: 3
🌱 Seed complete.
```

Demo login: `marcus@optitrader.dev` / `demo1234`.

**How it works:**

- Reads directly from `prototypes/02-mid-fi/mockData.json`
- Creates/updates the demo `User`, then inserts `workspaces` (1), `datasets` (3), `profiles` (2), `runs` (3), `errorlogs` (3), `settings` (3)
- Preserves original string IDs (`dataset_id`, `profile_id`, `run_id`) as `_id` so frontend references remain valid
- Every seeded record is scoped to the demo user's `owner` field
- **Idempotent:** clears the workspace/data collections before inserting — safe to re-run anytime
- Mongoose schemas live in `server/models/`; the script is `server/seed.ts`
- Requires the `"seed": "tsx seed.ts"` entry in `server/package.json` (already added in §2a)

> ⚠️ **Do not run in production** — this script deletes existing workspace, dataset, profile, run and log data.

#### 2e. API modules and endpoints

| Module | Responsibility |
|---|---|
| `app.ts` | CORS, JSON body parsing, route mounting and error middleware |
| `middleware/auth.ts` | Bearer-token verification; signs JWTs on login/register |
| `middleware/validate.ts` | Zod validation for bodies and query strings |
| `middleware/rateLimit.ts` | 20 requests / 15 minutes on `/api/assistant` |
| `services/authService.ts` | Register/login, bcrypt hashing, workspace creation |
| `services/datasetService.ts` | CSV validation, storage, synthetic fallback for seeded datasets |
| `services/runService.ts` | Profile snapshots, run hashes, worker execution, robustness and summaries |
| `services/assistantService.ts` | Gemini function calling with local heuristic fallback |
| `workers/backtestWorker.ts` | Spawns Python with a 120s timeout and parses JSON results |

| Method and path | Purpose |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | Accounts and JWT |
| `GET/POST/DELETE /api/datasets` | Dataset metadata, CSV storage and validation |
| `GET/POST/PUT/DELETE /api/profiles` | Profile CRUD |
| `POST/GET /api/runs`, `GET/DELETE /api/runs/:id` | Run engine and experiment log |
| `GET /api/runs/compare?ids=...` | Comparison data |
| `POST /api/assistant` | Natural-language configuration (rate-limited) |
| `GET /api/workspace`, `GET /api/error-logs`, `GET /api/health` | Workspace context, logs and health probe |

Protected routes require `Authorization: Bearer <token>`.

---

### 3. Frontend Setup

Open a new terminal window:

```bash
cd client
```

#### 3a. Initialize and install dependencies

The client is already scaffolded in this repo. Install the declared dependencies:

```bash
npm install
```

If `client/package.json` is missing, scaffold Vite first (`npm create vite@latest . -- --template react`), then install the UI packages:

```bash
npm install react-bootstrap bootstrap apexcharts react-apexcharts sweetalert2
```

**What each package is for:**

| Package | Purpose |
|---|---|
| `react-router-dom` | Login, dashboard, studio, results and comparison routes |
| `react-bootstrap` + `bootstrap` | Layout, forms, tables, buttons and base CSS |
| `apexcharts` + `react-apexcharts` | Equity-curve and overlay charts |
| `sweetalert2` | Confirmation dialogs, toasts and error messages |

#### 3b. Import Bootstrap CSS once

`client/src/main.tsx` already imports the stylesheet and the custom theme:

```js
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
```

#### 3c. Configure environment variables

```bash
cp .env.example .env
```

Ensure `client/.env` matches your backend:

```env
VITE_API_URL=http://localhost:5000/api
VITE_USE_MOCK_API=true
```

`VITE_USE_MOCK_API=true` keeps the standalone demo running from `src/data/mockData.json` and `localStorage`. Set it to `false` to use the Express API (`src/api/realApi.ts`), then sign in with the seeded `marcus@optitrader.dev` / `demo1234` account.

#### 3d. Client module map

| Module | Responsibility |
|---|---|
| `src/main.tsx` / `src/App.tsx` | Vite entry point, providers and protected routes |
| `src/context/AppContext.tsx` | Session, workspace bootstrap, datasets, profiles, runs and actions |
| `src/api/client.ts` | Fetch wrapper, base URL, bearer token and `ApiError` |
| `src/api/mockApi.ts` | Local demo store, prompt parsing, run generation and mock comparisons |
| `src/api/realApi.ts` | Express endpoint adapter (`/auth`, `/datasets`, `/profiles`, `/runs`, `/assistant`) |
| `src/components/` | Layout, navigation, KPI cards, tables, status badges, charts and loading states |
| `src/pages/` | Login, Dashboard, Experiment Studio, Datasets, Results Analytics and Comparison |
| `src/utils/format.ts` | Metric, date, duration and run-hash formatting |

Run the client with:

```bash
npm run dev
```

---

### 4. Python Engine Setup

Open a new terminal window:

```bash
cd prototypes/03-hi-fi-ts/engine

# Create and activate the virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

> ⚠️ **Venv path must match `backtestWorker.ts`.** The worker looks for `engine/.venv/bin/python` first, then the repository-root `.venv/bin/python`, then `python3.11` / `python3`. If you rename or move the venv, update `server/workers/backtestWorker.ts` accordingly.
>
> ```js
> const PYTHON_CANDIDATES = [
>   fileURLToPath(new URL('../../engine/.venv/bin/python', import.meta.url)),
>   fileURLToPath(new URL('../../../../.venv/bin/python', import.meta.url)),
>   'python3.11',
>   'python3',
> ];
> ```

#### Verify the engine standalone

The engine takes a CSV path and a JSON config:

```bash
engine/.venv/bin/python engine/backtest.py /path/to/ohlcv.csv \
  '{"fast_ma":{"min":5,"max":10,"step":5},"slow_ma":{"min":20,"max":30,"step":10},"objective":"sharpe","max_drawdown":0.15,"transaction_costs":0}'
```

It should print a JSON result to stdout. For seeded datasets without an uploaded CSV, the server generates a synthetic OHLCV file automatically. If the engine fails, fix the Python side before wiring up the Node worker.

---

### 🏃‍♂️ Running the Application

**Start the Backend:**

```bash
cd server
npm run dev
```

> `server.ts` is the entry point: it loads config, connects to MongoDB and calls `app.listen()`. `app.ts` only exports the Express app factory, so `npx tsx watch app.ts` exits immediately. Use `npm run dev`, `npm run build && npm start`, or `npx tsx watch server.ts`.

**Start the Frontend:**

```bash
cd client
npm run dev
```

The application should now be running at `http://localhost:5173` (or the port specified by Vite). The Express API listens on `http://localhost:5000`.

---

### 🧪 Testing the App in the Browser

You can test the UI in two modes:

| Mode | Requirements | How |
|---|---|---|
| **Standalone demo (mock)** | Node.js only | `client/.env` → `VITE_USE_MOCK_API=true`, then `npm run dev` in `client/` |
| **Live API** | MongoDB + server + Gemini key | `VITE_USE_MOCK_API=false`, start MongoDB, then run `seed`, `server` and `client` |

#### 1. Start the app

```bash
# terminal 1 — only needed for live API mode
cd prototypes/03-hi-fi-ts/server
npm run dev

# terminal 2
cd prototypes/03-hi-fi-ts/client
npm run dev
```

Open `http://localhost:5173`. You should be redirected to `/login`.

For live API mode, first run `npm run seed` in `server/` and sign in with:

```
Email:    marcus@optitrader.dev
Password: demo1234
```

In mock mode, the same credentials are pre-filled and any valid email/password combination is accepted.

#### 2. Browser walkthrough

1. **Login** — submit the demo credentials; you should land on the dashboard.
2. **Dashboard** — KPI cards show completed/failed runs, total trials and profiles; the recent experiments table is populated.
3. **New Experiment** — pick a suggestion or type a prompt, click **Parse parameters**, confirm the grid preview and combination count, then click **Launch run**.
4. **Results Analytics** — the new run opens with an equity curve, key metrics, AI synthesis and robustness warnings.
5. **Datasets** — upload an OHLCV CSV with the required `timestamp, open, high, low, close, volume` columns. Use a real dataset with enough rows for the MA windows (150+ rows recommended).
6. **Comparison** — select two runs in the experiment log and confirm the overlay chart and metrics matrix update.
7. **Reset demo** — in the top bar, restores the original mock runs/datasets/profiles (mock mode only).

#### 3. Verify the API

```bash
curl http://localhost:5000/api/health
# {"status":"ok","uptime":...}
```

If the browser shows CORS errors or empty data in live mode, check `CLIENT_URL`, the server terminal, and the troubleshooting section below.

#### 4. Test the production build

```bash
cd prototypes/03-hi-fi-ts/client
npm run build
npm run preview
```

Open the preview URL (usually `http://localhost:4173`) and repeat the walkthrough.

---

### ✅ First-Run Checklist

Use this to catch the most common setup failures before debugging:

- [ ] `server/.env` exists and `MONGO_URI` points to a running Mongo (local or Atlas)
- [ ] `server/.env` contains a real `GEMINI_API_KEY` (not the placeholder)
- [ ] `cd server && npm run config:check` prints `✅ Configuration valid`
- [ ] `cd server && npm run typecheck && npm test` passes config, domain and bridge tests
- [ ] `cd server && npm run test:bridge` passes against `test/fixtures/ohlcv.csv`
- [ ] `npx tsx -e "import 'dotenv/config'; import connectDB from './database.ts'; await connectDB(); process.exit(0);"` prints `✅ MongoDB Connected`
- [ ] `server/package.json` is valid JSON and contains `express`, `mongoose`, `dotenv`, `cors`, `@google/genai`
- [ ] `npm run seed` in `server/` prints `🌱 Seed complete.` and the demo user
- [ ] `prototypes/02-mid-fi/mockData.json` exists (seed source)
- [ ] `client/.env` has `VITE_API_URL=http://localhost:5000/api`
- [ ] `CLIENT_URL` in `server/.env` is the exact Vite origin (`http://localhost:5173`, no trailing slash or path)
- [ ] `client/` has `react-router-dom`, `react-bootstrap`, `bootstrap`, `apexcharts`, `react-apexcharts`, `sweetalert2` installed
- [ ] `cd client && npm run build` succeeds
- [ ] `client/.env` sets `VITE_USE_MOCK_API=true` for the standalone demo, or `false` to use the live API
- [ ] `GET /api/health` returns `{ "status": "ok" }`
- [ ] Login works with the demo account when `VITE_USE_MOCK_API=false`
- [ ] `python3.11 --version` reports Python 3.11.x
- [ ] `engine/.venv/bin/python` or repository-root `.venv/bin/python` exists and reports Python 3.11.x
- [ ] `engine/backtest.py` runs standalone and prints JSON
- [ ] `pytest.ini` exists in `03-hi-fi-ts/` with `pythonpath = engine`
- [ ] `pytest -v` passes the engine tests
- [ ] `npm run dev` works in **both** `server/` and `client/`
- [ ] `.gitignore` excludes `.env`, `node_modules/`, `.venv/`, and generated `results/`

---

### 🧯 Troubleshooting

Run the config preflight first; it catches the most common setup mistakes before the server starts:

```bash
cd server
npm run config:check
```

#### CORS error in the browser

**Symptom:** `Access to fetch at 'http://localhost:5000/api/...' from origin 'http://localhost:5173' has been blocked by CORS policy`.

**Cause:** `CLIENT_URL` does not match the exact Vite origin, the server was not restarted after editing `.env`, or Vite fell back to a different port.

**Fix:** Set `CLIENT_URL=http://localhost:5173` (scheme, host, port only — no trailing slash or path), restart `npm run dev` in `server/`, and confirm `VITE_API_URL=http://localhost:5000/api` in `client/.env`. If Vite reports a different port, update both values. `npm run config:check` rejects invalid origins and normalizes a trailing slash.

#### MongoDB is not running in WSL

**Symptom:** `ECONNREFUSED 127.0.0.1:27017` or `MongooseServerSelectionError`.

**Cause:** WSL often has systemd disabled, so `sudo systemctl start mongod` fails with `System has not been booted with systemd as init system`.

**Fix:** Try the service wrapper first:

```bash
sudo service mongod start
pgrep -a mongod
```

If that is unavailable, start `mongod` directly:

```bash
sudo mkdir -p /var/lib/mongodb /var/log/mongodb
sudo mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --fork
```

Alternatively, use a MongoDB Atlas URI. If you want systemd inside WSL, enable it in `/etc/wsl.conf` (`[boot]` → `systemd=true`) and restart WSL.

#### Python version mismatch

**Symptom:** `ModuleNotFoundError: No module named 'vectorbt'`, `numba`/wheel build errors, or the worker reports `python: command not found`.

**Cause:** The engine requires Python 3.11, but the virtual environment was created with another interpreter or the worker is using the system `python`.

**Fix:** Check both interpreters:

```bash
python3.11 --version
engine/.venv/bin/python --version
```

If either is not 3.11.x, recreate the environment and reinstall dependencies:

```bash
rm -rf engine/.venv
python3.11 -m venv engine/.venv
engine/.venv/bin/pip install --upgrade pip
engine/.venv/bin/pip install -r engine/requirements.txt
```

The worker must call `engine/.venv/bin/python`, not bare `python`.

#### Missing or placeholder `GEMINI_API_KEY`

**Symptom:** `npm run config:check` fails with `GEMINI_API_KEY is required` or `GEMINI_API_KEY is still a placeholder`, or assistant requests return an unavailable/500 response.

**Cause:** `.env` is missing, the key was left as `your_gemini_api_key_here`, or the server was not restarted after editing `.env`.

**Fix:** Copy the template, add a real key from [AI Studio](https://aistudio.google.com/app/apikey), and restart the server:

```bash
cd server
cp .env.example .env
# edit .env and set GEMINI_API_KEY
npm run config:check
```

Keep the key server-side only. Never expose it through `client/.env` or `VITE_*` variables. The API config check fails fast until a real key is present; the standalone mock client still works without it.

#### `ERR_INVALID_PACKAGE_CONFIG`

**Symptom:** Node reports `ERR_INVALID_PACKAGE_CONFIG` during setup or the database smoke test.

**Cause:** `server/package.json` is missing, empty, or malformed.

**Fix:** Recreate it and reinstall dependencies as described in §2a.

---

### 🧱 Architecture Notes

The Node.js backend **spawns** the Python engine as a child process, passing the strategy config as a JSON argument. A minimal worker:

```javascript
// server/workers/backtestWorker.ts
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pythonExecutable = path.join(__dirname, '../../engine/.venv/bin/python');
const pythonScript = path.join(__dirname, '../../engine/backtest.py');

function runBacktest(config) {
  return new Promise((resolve, reject) => {
    const pyProcess = spawn(pythonExecutable, [pythonScript, JSON.stringify(config)]);

    let output = '';
    let errorOutput = '';

    pyProcess.stdout.on('data', (data) => { output += data.toString(); });
    pyProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${errorOutput}`));
      } else {
        resolve(JSON.parse(output));
      }
    });
  });
}

export { runBacktest };
```

> The full worker in `server/workers/backtestWorker.ts` also tries the repository-root `.venv`, `python3.11` and `python3`, enforces a 120-second timeout, and maps failures to `TIMEOUT`, `ENGINE_ERROR` or `ENGINE_START_FAILED`.

The DB connection helper used by `server.ts` and the smoke test above:

```javascript
// server/database.ts
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

export default connectDB;
```

---

### 🔐 `.gitignore`

Place a  `.gitignore` at `project root directory`:

```gitignore
# ---------- Node ----------
prototypes/03-hi-fi-ts/server/node_modules/
prototypes/03-hi-fi-ts/client/node_modules/
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# ---------- Build / dist ----------
dist/
build/
.vite/
*.tsbuildinfo

# ---------- Env ----------
.env
.env.local
.env.*.local
!.env.example

# ---------- Python ----------
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
env/
*.egg-info/
.pytest_cache/
.mypy_cache/
.ruff_cache/

# ---------- Logs ----------
logs/
*.log

# ---------- OS / editor ----------
.DS_Store
Thumbs.db
.idea/
.vscode/*
!.vscode/extensions.json

# ---------- Data / outputs ----------
data/uploads/
results/
*.csv
!engine/tests/fixtures/*.csv

# ---------- Mongo local dumps ----------
dump/
*.bson
```

---

### ✨ MVP Features

- **Dashboard:** Overview of recent experiments, active datasets, and quick AI-assisted runs.
- **Natural Language Assistant:** Describe a strategy in plain English to auto-generate configurations.
- **Dataset Manager:** Upload and validate OHLCV CSV files.
- **Optimization Engine:** Node.js/TypeScript orchestrator spawning the Python/vectorbt engine for parameter sweeps.
- **Results Analytics:** Detailed equity curves, metrics comparison, and AI synthesis.
- **Robustness Guard:** Warnings for potential overfitting (e.g., edge-of-grid, missing transaction costs).

---

### ⚠️ Known Limitations (PoC Phase)

- The Python engine currently implements the SMA crossover path. The UI exposes EMA momentum, but it is not a separate engine algorithm yet.
- Seeded datasets without an uploaded CSV use a deterministic synthetic OHLCV file for local runs.
- Runs execute synchronously through the child process; Redis queues, WebSocket progress streaming and deployment hardening are post-MVP.
- Historical data ingestion supports standard OHLCV CSV formats only.
- AI Assistant uses the Gemini model configured server-side and falls back to a local heuristic parser when the API is unavailable.

---

### 📄 License

This project is part of a Capstone submission for BELLS SCTP Diploma in AI-Powered Software Engineering. Not intended for commercial use without permission.
