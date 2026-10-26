### 1. `README.md`

```markdown
# OptiTrader Lab
**Research | Optimize | Validate | Deploy**

OptiTrader Lab is an AI-assisted optimization platform designed for solo quantitative traders and systematic strategy developers. It transforms strategy tuning from a manual, error-prone workflow into a structured, auditable experimentation process.

## 📖 Overview
Manual strategy optimization often leads to repetitive parameter tuning, fragmented result storage, and a lack of reproducibility. OptiTrader Lab solves this by treating **every optimization as a reproducible experiment**. 

By combining natural-language interaction (via Google Gemini), automated parameter sweeps, and built-in robustness checks, traders can focus on evaluating ideas rather than managing files.

## 🛠 Tech Stack
*   **Frontend:** React, Vite, react-bootstrap (npm install react-bootstrap bootstrap
 then import 'bootstrap/dist/css/bootstrap.min.css';), apexcharts, sweetalert2
*   **Backend:** Node.js, Express
*   **Database:** MongoDB (Mongoose)
*   **AI Integration:** Google Gemini API (`@google/genai` SDK) with Function Calling
*   **Quantitative Engine:** Python 3.11, `vectorbt`
*   **Concurrency:** Node.js `child_process` (to spawn Python scripts)

## 📂 Project Structure
```text
## 📂 Project Structure
```text
03-hi-fi/
├── client/                     # React + Vite Frontend
│   ├── src/
│   └── package.json
├── server/                     # Node.js + Express Backend
│   ├── workers/
│   │   └── backtestWorker.js   # Node.js orchestrator
│   ├── services/
│   │   └── assistantService.js # Gemini function calling service
│   ├── models/                 # MongoDB persistent schemas
│   └── server.js               # Express API gateway
!   └── database.js             # Mongo DB
└── engine/                     # Python Backtesting Engine
    ├── backtest.py             # Main vectorbt execution script
    └── requirements.txt        # Python dependencies (vectorbt, pandas, etc.)
```

Create pytest.ini in the project root to handle the issue "import backtest" of invalid folder naming convention in Python.
```
[pytest]
pythonpath = prototypes/03-hi-fi/engine
```

## 🚀 Getting Started

### Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [MongoDB](https://www.mongodb.com/try/download/community) (Local instance or MongoDB Atlas URI)
*   [Google Gemini API Key](https://aistudio.google.com/app/apikey)
*   **Python 3.11** (Required for `vectorbt`)
*   **WSL** (If developing on Windows, as `vectorbt` relies on C-compilers best supported in Linux)

### 1. Dataabse

OptiTrader Lab uses MongoDB to store user data, datasets, and experiment logs. You have two options to set this up: **Local** (recommended for development) or **Cloud** (MongoDB Atlas).

### Option A: Local MongoDB (Recommended for WSL/Ubuntu)
If you are developing in WSL (Ubuntu), you can install the MongoDB Community Edition locally.

1. **Install MongoDB** (if not already installed):
   ```bash
   sudo apt update
   sudo apt install -y mongodb-org
   ```
2. **Start the MongoDB service**:
   ```bash
   sudo systemctl start mongod
   ```
3. **Verify it is running**:
   ```bash
   sudo systemctl status mongod
   ```
4. **Set your `.env` variable** in `server/.env` to:
   ```env
   MONGO_URI=mongodb://localhost:27017/optitrader_lab
   ```

### Option B: MongoDB Atlas (Cloud)
If you do not want to install MongoDB locally, you can use a free cloud database.

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2. Create a new free tier cluster.
3. Under **Database Access**, create a user with a username and password.
4. Under **Network Access**, allow access from your current IP address (or `0.0.0.0/0` for development).
5. Click **Connect**, choose **Drivers**, and copy the connection string.
6. Set your `.env` variable in `server/.env` to match your string (replace `<password>` and `<dbname>`):
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/optitrader_lab?retryWrites=true&w=majority
   ```

> **Note:** If you are using MongoDB Atlas, ensure your connection string includes the database name (`optitrader_lab`) right before the `?` mark.
```

---

### 💡 Two Extra Tips for your README:

1. **Seeding the Database:** Since you have those beautiful mockups with populated tables (Recent Experiments, Datasets), it would be great to provide a seed script. You can add this to the README:
   ```bash
   # Optional: Populate the database with sample data for the UI
   cd server
   npm run seed
   ```
   *(You would need to create a `seed.js` script in your server folder that inserts mock data, but it makes the first-run experience much better for a grader).*

2. **Mongoose Connection File:** Make sure you have a `db.js` or `database.js` file in your `server/` folder that handles the connection gracefully, so if it fails, it logs a helpful message:
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


### 2. Backend Setup
```bash
cd server
npm install
```
Copy the environment variables template and fill in your specific details:
```bash
cp .env.example .env
```
*Edit `.env` and add your MongoDB URI and Gemini API Key.*

### 3. Frontend Setup
Open a new terminal window:
```bash
cd client
npm install
```
Copy the environment variables template:
```bash
cp .env.example .env
```
*Ensure the `VITE_API_URL` matches your backend port.*

```bash
npm install react-bootstrap bootstrap
```
subsequently import 'bootstrap/dist/css/bootstrap.min.css';

### 4. Python Engine Setup
Open a new terminal window:
```bash
cd engine

# Create and activate the virtual environment
python3.11 -m venv .venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

## 🏃‍♂️ Running the Application

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
The application should now be running at `http://localhost:5173` (or the port specified by Vite).

## ✨ MVP Features
*   **Dashboard:** Overview of recent experiments, active datasets, and quick AI-assisted runs.
*   **Natural Language Assistant:** Describe a strategy in plain English to auto-generate configurations.
*   **Dataset Manager:** Upload and validate OHLCV CSV files.
*   **Optimization Engine:** Background worker threads executing parameter sweeps.
*   **Results Analytics:** Detailed equity curves, metrics comparison, and AI synthesis.
*   **Robustness Guard:** Warnings for potential overfitting (e.g., edge-of-grid, missing transaction costs).

## ⚠️ Known Limitations (PoC Phase)
*   The backtesting engine is currently limited to specific strategies (SMA Crossover, EMA Momentum).
*   Historical data ingestion supports standard OHLCV CSV formats only.
*   AI Assistant uses Gemini 1.5 Pro; rate limits apply based on your API tier.

## 📄 License
This project is part of a Capstone submission for BELLS SCTP Diploma in AI-Powered Software Engineering. Not intended for commercial use without permission.
```

---

### 2. `server/.env.example` (Place in `03-hi-fi/server/`)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
# Use localhost for local MongoDB or your MongoDB Atlas connection string
MONGO_URI=mongodb://localhost:27017/optitrader_lab

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=1d

# AI Integration
# Get your API key from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Client URL (for CORS configuration)
CLIENT_URL=http://localhost:5173
```

---

### 3. `client/.env.example` (Place in `03-hi-fi/client/`)

```env
# API Configuration
# This points to your Express backend gateway
VITE_API_URL=http://localhost:5000/api
```

---

### 💡 Architecture Tip for the `server/workers/backtestWorker.js`

The Node.js will **spawn** the Python process.

Here is a quick pseudo-code example of how you will bridge them:

```javascript
// server/workers/backtestWorker.js
const { spawn } = require('child_process');
const path = require('path');

// Path to the venv python and the script
const pythonExecutable = path.join(__dirname, '../../engine/venv/bin/python');
const pythonScript = path.join(__dirname, '../../engine/backtest.py');

function runBacktest(config) {
  return new Promise((resolve, reject) => {
    // Spawn the python process, passing the JSON config as a string argument
    const pyProcess = spawn(pythonExecutable, [pythonScript, JSON.stringify(config)]);

    let output = '';
    let errorOutput = '';

    pyProcess.stdout.on('data', (data) => { output += data.toString(); });
    pyProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${errorOutput}`));
      } else {
        // Parse the JSON returned by backtest.py
        resolve(JSON.parse(output));
      }
    });
  });
}