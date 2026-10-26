### Phase 1: Scaffolding & Setup Documentation (Day 1-2)
Your folder structure is solid. Before building features, set up the skeleton.

1. **Initialize the Repo**: Create a root `03-hi-fi` folder and initialize a monorepo or separate folders for `client` and `server`.
2. **Base `README.md`**:
   * Prerequisites (Node.js vX, MongoDB, Gemini API Key).
   * Installation steps (`npm install` in both client and server).
   * Environment Variables template (create a `.env.example` file in both folders).
   * How to run (e.g., `npm run dev`).
3. **Environment Setup**:
   * **Client**: React + Vite + react-bootstrape
   * **Server**: Node.js + Express. Add standard middleware (`cors`, `dotenv`, `express.json`).

### Phase 2: Database Modeling & Mock Data (Day 3-4)
Looking at the mockups (specifically the Experiment Log, Dashboard, and Results Analytics), start defining your MongoDB schemas using Mongoose.

*   `User.js`: id, email, passwordHash, workspaceName.
*   `Dataset.js`: id, userId, name, symbol, timeframe, dateRange, rowCount, validationStatus.
*   `Experiment.js` (Crucial): id, runHash, strategy, datasetId, configuration (JSON object), trialsCount, metrics (Sharpe, Max DD, Win Rate), status (Running, Completed, Failed), createdAt.
*   `StrategyProfile.js`: id, name, strategyType, defaultParams.

*Tip: Write a seeder script (`seed.js`) to populate your database with the mock data exactly as seen in your screenshots so you can build the UI immediately without waiting for the backend worker to finish.*

### Phase 3: Backend API & Worker Thread (Day 5-8)
Build the Express API to serve the data.

*   **Routes**: `authRoutes`, `datasetRoutes`, `experimentRoutes`.
*   **The Worker (`workers/backtestWorker.js`)**: This is a key technical differentiator. Use Node.js `worker_threads`. When the user hits "Launch Run", the main Express thread should spawn a worker to run the parameter sweep. The worker communicates progress (e.g., "54 / 500 trials") back to the main thread, which you can either save to DB or push via WebSockets/Server-Sent Events (SSE) to the client.
*   **Gemini Service (`services/assistantService.js`)**: Start by mocking the function calling. Just return the JSON structure from your design doc. Once the UI is working, swap in the actual Gemini API using the `@google/genai` SDK.

### Phase 4: Frontend - Component Library (Day 9-11)
Don't build page by page. Build components first, based on your mockups:
*   `Sidebar.jsx` (Navigation with active states).
*   `KPICard.jsx` (The metric cards showing Sharpe 1.18, Total Return 42%, etc. with the little sparkline/bar charts).
*   `DataTable.jsx` (For the Active Datasets, Recent Experiments, and Experiment Log).
*   `StatusBadge.jsx` (Completed, Running, Failed).
*   `ChartWrapper.jsx` (Using Recharts or Chart.js for the Equity Curve).

### Phase 5: Frontend - Views & Routing (Day 12-15)
Connect React Router to your components.
1.  **Login Page**: Simple UI.
2.  **Dashboard**: Quick Run input, Recent Experiments table, Activity Feed.
3.  **New Experiment (Studio)**: The split-pane layout. AI prompt on top, parameter configuration below.
4.  **Results Analytics**: The complex view with the Equity Curve, Drawdown Analysis, and AI Synthesis tabs.
5.  **Comparison**: The overlay chart and metrics matrix.

### Phase 6: Connect, Polish & Document (Day 16+)
*   Connect your React frontend to your Express backend.
*   Wire up the Gemini API for real.
*   Implement the `backtestWorker.js` to actually process a CSV and run a simple SMA crossover (even if it just returns mocked metrics based on the CSV length for the PoC, as long as the *pipeline* works).
*   **Finalize Documentation**: Now update your `README.md` with actual screenshots, your architecture diagram, and a "Challenges & Learnings" section for your capstone report.

---

### A few technical recommendations for this specific stack:

1.  **Charting**: For those beautiful equity curves and drawdown charts, use **Recharts** or **Chart.js**. They integrate perfectly with React and support the tooltips and crosshairs shown in your mockups.
2.  **CSV Parsing**: For the dataset manager, use `papaparse` on the frontend to preview the CSV, and `csv-parser` on the backend to process it.
3.  **The AI Assistant**: In your mockup, it shows "Gemini 1.5 Pro". Make sure you use the modern `@google/genai` SDK (the older `@google/generative-ai` is deprecated). Use **Function Calling** heavily here. The AI shouldn't write the backtest; it should just return a JSON object of parameters (as you correctly showed in your design doc).

### Do you need a separate Setup Document?
No, keep it all in the root `README.md`. Your graders and future you will appreciate a single source of truth. Just make sure it includes:
*   **Prerequisites**
*   **Environment Setup** (`.env` keys needed)
*   **Installation Steps**
*   **How to Run (Local)**
*   **Architecture Overview** (briefly)
*   **Known Limitations** (e.g., "Backtesting engine currently supports only SMA/EMA for PoC").

You have a phenomenal blueprint. The hardest part (the design and problem definition) is done. Now just start with `npm create vite@latest` and build out that UI piece by piece. Good luck with the capstone!