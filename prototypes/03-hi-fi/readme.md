# OptiTrader Lab — Full `README.md`

Below is the complete regenerated README with:
- **All missing setup steps** (Vite, dotenv, cors, express, mongoose, Gemini SDK, nodemon, bootstrap, apexcharts, sweetalert2)
- **Enhanced §2d** (seed script with behavioral summary, not full code)
- **Consistent `.venv` naming** matching `python3.11 -m venv .venv`
- **First-run checklist** including seed verification
- **Architecture notes** (worker + DB helper)
- **`.gitignore`** block
- **Fixtures path note** for the seed script

```markdown
# OptiTrader Lab

**Research | Optimize | Validate | Deploy**

OptiTrader Lab is an AI-assisted optimization platform designed for solo quantitative traders and systematic strategy developers. It transforms strategy tuning from a manual, error-prone workflow into a structured, auditable experimentation process.

## 📖 Overview

Manual strategy optimization often leads to repetitive parameter tuning, fragmented result storage, and a lack of reproducibility. OptiTrader Lab solves this by treating **every optimization as a reproducible experiment**.

By combining natural-language interaction (via Google Gemini), automated parameter sweeps, and built-in robustness checks, traders can focus on evaluating ideas rather than managing files.

## 🛠 Tech Stack

- **Frontend:** React, Vite, react-bootstrap (with `bootstrap/dist/css/bootstrap.min.css`), apexcharts, sweetalert2
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **AI Integration:** Google Gemini API (`@google/genai` SDK) with Function Calling
- **Quantitative Engine:** Python 3.11, `vectorbt`
- **Concurrency:** Node.js `child_process` (to spawn Python scripts)

## 📂 Project Structure

```markdown
03-hi-fi/
├── client/                     # React + Vite Frontend
│   ├── src/
│   └── package.json
├── server/                     # Node.js + Express Backend
│   ├── fixtures/
│   │   └── mockData.json       # Seed data (copy of 02-mid-fi/mockData.json)
│   ├── models/                 # Mongoose schemas
│   │   ├── Workspace.js
│   │   ├── Dataset.js
│   │   ├── Profile.js
│   │   ├── Run.js
│   │   ├── ErrorLog.js
│   │   └── Setting.js
│   ├── services/
│   │   └── assistantService.js # Gemini function calling service
│   ├── workers/
│   │   └── backtestWorker.js   # Node.js orchestrator (spawns Python)
│   ├── seed.js                 # Database seed script
│   ├── server.js               # Express API gateway
│   └── database.js             # MongoDB connection helper
├── engine/                     # Python Backtesting Engine
│   ├── .venv/                  # Python virtual environment (git-ignored)
│   ├── backtest.py             # Main vectorbt execution script
│   └── requirements.txt        # Python dependencies (vectorbt, pandas, etc.)
├── pytest.ini                  # Pytest path config for `import backtest`
└── .gitignore                  # Root ignore file (Node + Python + env + data)
```

### `pytest.ini`

Create `pytest.ini` in the **project root** (`03-hi-fi/`) so pytest can resolve `import backtest`:

```ini
[pytest]
pythonpath = prototypes/03-hi-fi/engine
```

> Note: if you run pytest from inside `03-hi-fi/`, you can simplify `pythonpath = engine`.

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local instance or MongoDB Atlas URI)
- [Google Gemini API Key](https://aistudio.google.com/app/apikey)
- **Python 3.11** (required for `vectorbt`)
- **WSL** (if developing on Windows, as `vectorbt` relies on C-compilers best supported in Linux)

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
npm install express mongoose dotenv cors @google/genai
```

**Install dev dependencies:**

```bash
npm install -D nodemon
```

**What each package is for:**

| Package | Purpose |
|---|---|
| `express` | HTTP API server |
| `mongoose` | MongoDB ODM |
| `dotenv` | Load `.env` variables |
| `cors` | Allow the Vite frontend to call the API |
| `@google/genai` | Google Gemini SDK (function calling) |
| `nodemon` (dev) | Auto-restart server on file changes |

Ensure `server/package.json` contains these scripts:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "seed": "node seed.js"
}
```

> ℹ️ **Gemini SDK note:** this project uses the newer unified SDK `@google/genai`, not the legacy `@google/generative-ai`. Import it as:
>
> ```js
> // CommonJS
> const { GoogleGenAI } = require("@google/genai");
> // or ESM
> import { GoogleGenAI } from "@google/genai";
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
| `CLIENT_URL` | ✅ | CORS origin — must match the Vite port, e.g. `http://localhost:5173` |
| `JWT_SECRET` | if auth used | Any strong random string |
| `JWT_EXPIRES_IN` | if auth used | e.g. `1d` |

#### 2c. Smoke-test the database connection

Before launching the full app, verify MongoDB wiring:

```bash
node -e "require('dotenv').config(); require('./database')();"
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
🧹 Clearing existing collections...
  ✅ Workspace: Marcus_Lim_Research
  ✅ Datasets: 3
  ✅ Profiles: 2
  ✅ Runs: 3
  ✅ Error Logs: 3
  ✅ Settings: 3
🌱 Seed complete.
```

**How it works:**

- Reads from `server/fixtures/mockData.json` — **copy** `02-mid-fi/mockData.json` into `server/fixtures/` so the seed is self-contained and portable
- Inserts into 6 collections: `workspaces` (1), `datasets` (3), `profiles` (2), `runs` (3), `errorlogs` (3), `settings` (3)
- Preserves original string IDs (`dataset_id`, `profile_id`, `run_id`) as `_id` so frontend references remain valid
- **Idempotent:** clears the 6 collections before inserting — safe to re-run anytime
- Mongoose schemas live in `server/models/`; the script is `server/seed.js`
- Requires the `"seed": "node seed.js"` entry in `server/package.json` (already added in §2a)

> ⚠️ **Do not run in production** — this script deletes existing collection data.

#### 2e. Pytest path config

Create `pytest.ini` at the project root (`03-hi-fi/`) so Python tests can `import backtest`:

```ini
[pytest]
pythonpath = prototypes/03-hi-fi/engine
```

> If you run pytest from inside `03-hi-fi/`, use `pythonpath = engine` instead.

---

### 3. Frontend Setup

Open a new terminal window:

```bash
cd client
```

#### 3a. Initialize and install dependencies

If `client/package.json` is missing, scaffold the Vite project first:

```bash
npm create vite@latest . -- --template react
```

> If `client/` already contains your React + Vite project (as in this repo), skip the scaffold and just install.

Install all dependencies:

```bash
# Core (already declared if you cloned the repo, but re-run to be safe)
npm install

# UI: Bootstrap + react-bootstrap
npm install react-bootstrap bootstrap

# Charts
npm install apexcharts react-apexcharts

# Alerts / toasts
npm install sweetalert2
```

**What each package is for:**

| Package | Purpose |
|---|---|
| `react-bootstrap` | Bootstrap components for React |
| `bootstrap` | Base CSS + JS bundle |
| `apexcharts` + `react-apexcharts` | Equity-curve / metrics charts |
| `sweetalert2` | Confirmation dialogs, toasts |

#### 3b. Import Bootstrap CSS once

In `client/src/main.jsx` (or `main.tsx`), add near the top:

```js
import 'bootstrap/dist/css/bootstrap.min.css';
```

#### 3c. Configure environment variables

```bash
cp .env.example .env
```

Ensure `client/.env` matches your backend:

```env
VITE_API_URL=http://localhost:5000/api
```

---

### 4. Python Engine Setup

Open a new terminal window:

```bash
cd engine

# Create and activate the virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

> ⚠️ **Venv path must match `backtestWorker.js`.** The Node worker spawns `engine/.venv/bin/python`. If you rename the venv folder, update `server/workers/backtestWorker.js` accordingly:
>
> ```js
> const pythonExecutable = path.join(__dirname, '../../engine/.venv/bin/python');
> ```

#### Verify the engine standalone

```bash
python engine/backtest.py '{"strategy":"sma","fast":10,"slow":30,"symbol":"BTCUSDT"}'
```

It should print a JSON result to stdout. If it fails, fix the Python side before wiring up the Node worker.

---

### 🏃‍♂️ Running the Application

**Start the Backend:**

```bash
cd server
npm run dev
```

**Start the Frontend:**

```bash
cd client
npm run dev
```

The application should now be running at `http://localhost:5173` (or the port specified by Vite). The Express API listens on `http://localhost:5000`.

---

### ✅ First-Run Checklist

Use this to catch the most common setup failures before debugging:

- [ ] `server/.env` exists and `MONGO_URI` points to a running Mongo (local or Atlas)
- [ ] `node -e "require('dotenv').config(); require('./database')();"` prints `✅ MongoDB Connected`
- [ ] `server/package.json` is valid JSON and contains `express`, `mongoose`, `dotenv`, `cors`, `@google/genai`
- [ ] `npm run seed` in `server/` prints `🌱 Seed complete.`
- [ ] `server/fixtures/mockData.json` exists
- [ ] `client/.env` has `VITE_API_URL=http://localhost:5000/api`
- [ ] `CLIENT_URL` in `server/.env` matches the Vite port (`http://localhost:5173`)
- [ ] `client/` has `react-bootstrap`, `bootstrap`, `apexcharts`, `react-apexcharts`, `sweetalert2` installed
- [ ] `engine/.venv/bin/python` exists (venv created with `python3.11 -m venv .venv`)
- [ ] `engine/backtest.py` runs standalone and prints JSON
- [ ] `pytest.ini` exists at project root with `pythonpath` pointing at `engine/`
- [ ] `npm run dev` works in **both** `server/` and `client/`
- [ ] `.gitignore` excludes `.env`, `node_modules/`, `.venv/`, and generated `results/`

---

### 🧱 Architecture Notes

The Node.js backend **spawns** the Python engine as a child process, passing the strategy config as a JSON argument. A minimal worker:

```javascript
// server/workers/backtestWorker.js
const { spawn } = require('child_process');
const path = require('path');

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

module.exports = { runBacktest };
```

The DB connection helper used by `server.js` and the smoke test above:

```javascript
// server/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

### 🔐 `.gitignore`

Place a single `.gitignore` at `03-hi-fi/`:

```gitignore
# ---------- Node ----------
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
- **Optimization Engine:** Background worker threads executing parameter sweeps.
- **Results Analytics:** Detailed equity curves, metrics comparison, and AI synthesis.
- **Robustness Guard:** Warnings for potential overfitting (e.g., edge-of-grid, missing transaction costs).

---

### ⚠️ Known Limitations (PoC Phase)

- The backtesting engine is currently limited to specific strategies (SMA Crossover, EMA Momentum).
- Historical data ingestion supports standard OHLCV CSV formats only.
- AI Assistant uses Gemini 1.5 Pro; rate limits apply based on your API tier.

---

### 📄 License

This project is part of a Capstone submission for BELLS SCTP Diploma in AI-Powered Software Engineering. Not intended for commercial use without permission.
```

---

## Answering your question directly

> **Do we need to include the installation of Vite, dotenv, and any other package needed?**

**Yes — every package that a fresh clone would need.** I've included:

| Where | Packages added | Why |
|---|---|---|
| **§2a Backend** | `express`, `mongoose`, `dotenv`, `cors`, `@google/genai`, `nodemon` | Previously only `mongoose` was mentioned. `dotenv` is critical — without it, `process.env.MONGO_URI` is `undefined`. `cors` is needed because Vite (5173) ≠ Express (5000). `@google/genai` is the Gemini SDK. `nodemon` is for `npm run dev`. |
| **§3a Frontend** | `react-bootstrap`, `bootstrap`, `apexcharts`, `react-apexcharts`, `sweetalert2` + Vite scaffold | Previously only `react-bootstrap` + `bootstrap` were listed. ApexCharts and SweetAlert2 were mentioned in the tech stack but never installed. Vite scaffold is included as a fallback if `client/package.json` is missing. |
| **§4 Python** | `vectorbt`, `pandas` (via `requirements.txt`) | Already covered — kept as-is. |

**What I deliberately did *not* include:**
- Full `seed.js` source (lives in the repo, README only summarizes behavior)
- Full Mongoose model files (live in `server/models/`)
- The verbose `node -e "require('mongoose')..."` verification snippet (the seed's expected output already confirms success)

That keeps the README at ~430 lines — a setup document, not a code dump — while making **every install command explicit** so a grader can go from zero to a running app without guessing.