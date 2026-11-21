# DATAFORGE AI

**Intelligent Data Engineering and Machine Learning Platform**

A comprehensive data engineering and machine learning platform designed to collect, process, manage, analyse, and transform datasets into useful insights through automated data engineering workflows and artificial intelligence.

---

## Technology Stack

- **Fullstack Architecture:** [nub-stack](https://npmjs.com/package/nub-stack) (Dual-mode Vite + React 19 TypeScript frontend with Node.js Express backend)
- **Notifications:** [sleek-toast](https://npmjs.com/package/sleek-toast)
- **Styling:** Tailwind CSS v4
- **Icons:** React Icons (`react-icons`) — Clean vector SVG iconography with zero tacky emojis
- **Data Engine:** SheetJS (`xlsx`) for CSV, JSON, and Excel parsing with in-memory statistical and ML evaluation kernels

---

## 12 Core Platform Capabilities

1. **User Registration and Authentication:**
   - Role-Based Access Control (RBAC): Data Engineer, ML Engineer, Data Analyst, Platform Admin.
   - Profile management and API Key lifecycle manager (Create, Scope, Revoke, Copy).
   - One-click demo profiles for immediate exploration.

2. **Dataset Ingestion & Upload:**
   - Multi-format ingestion: CSV, JSON, and Excel (`.xlsx` / `.xls`).
   - Drag-and-drop zone with automatic schema type inference and delimiter detection.
   - Pre-loaded enterprise sample datasets:
     - Customer Churn & LTV Telemetry (CSV)
     - Industrial Turbine Sensor Stream (JSON)
     - Financial Underwriting Risk Score (XLSX)

3. **Data Validation and Preprocessing:**
   - Automatic contract schema enforcement across all tabular columns.
   - Missing values audit, zero-variance flags, and IQR-based outlier thresholding ($1.5 \times \text{IQR}$).
   - Composite Health Score (Completeness, Validity, Uniqueness indices).

4. **Data Cleaning and Transformation:**
   - Composable transformation recipe builder:
     - Missing value imputation (Mean, Median, Mode, Constant, Drop rows)
     - Row deduplication
     - Standard Z-score feature scaling ($\mu=0, \sigma=1$)
     - Min-Max normalization ($[0.0, 1.0]$)
     - Categorical One-Hot Encoding (OHE)
     - Text string lowercase normalization
     - Column dropping & pruning
   - Live audit history with step-by-step undo/rollback and DVC snapshot saving.

5. **Automated Data Pipeline Management:**
   - Visual Directed Acyclic Graph (DAG) topology (Ingestion $\rightarrow$ Validation $\rightarrow$ Cleaning $\rightarrow$ Feature Store $\rightarrow$ ML Inference $\rightarrow$ Warehouse Export).
   - Cron-based scheduling and manual trigger execution.
   - Live execution console streaming real-time event logs and throughput metrics (records/sec).

6. **Database and Data Warehouse Management:**
   - Federated warehouse connection manager (PostgreSQL, ClickHouse, Snowflake, BigQuery, DuckDB embedded).
   - Interactive SQL Studio with template queries (`GROUP BY`, `JOIN`, `FILTER`).
   - Execution timer, byte scanned telemetry, and paginated result viewer.

7. **Exploratory Data Analysis (EDA):**
   - Parametric moments and summary statistics table (Mean, Median, StdDev, Min, Q25, Q75, Max, Skewness).
   - Interactive Pearson correlation heatmap with coefficient threshold filter.
   - Synthesized natural language AI Data Profiler narrative report.

8. **Machine Learning Model Development:**
   - Learning tasks: Supervised Classification, Supervised Regression, Unsupervised Clustering, Anomaly Detection.
   - Algorithms: Random Forest, Gradient Boosting (GBM), Logistic Regression, Linear Regression, Support Vector Machine (SVM), K-Means, Neural Network (MLP).
   - Target feature selector, predictor subset checkboxes, train/test split slider, and hyperparameter tuning.
   - Interactive training execution with animated loss convergence progression.

9. **Model Evaluation & Comparison:**
   - Comprehensive metrics: Accuracy, Precision, Recall, F1-Score, ROC-AUC, $R^2$, MAE, RMSE, Latency.
   - Interactive Confusion Matrix ($2 \times 2$) with TP, FP, FN, TN diagnostics.
   - Receiver Operating Characteristic (ROC) curve visualization.
   - Feature Importance ranking bar chart.
   - Side-by-side Model Benchmark Leaderboard.

10. **Interactive Data Visualisation Dashboards:**
    - Real-time analytical KPI scorecards.
    - Time-series area/line charts with timeframe selectors (7D, 30D, 90D, 1Y).
    - Segment distribution bar charts and dimensional breakdowns.

11. **Dataset Quality Monitoring and Versioning:**
    - DVC-style dataset version control ($v1.0$, $v1.1$, $v2.0$) with commit hashes, author, and timestamp.
    - Version diff inspector displaying row deltas and schema modifications.
    - Continuous Quality Score Index ($0-100$).
    - Population Stability Index (PSI) drift detection alerting on covariate distribution shifts.

12. **Experiment Management & Report Generation:**
    - MLflow-style experiment tracking ledger with run IDs, parameters, metrics, duration, and status tags.
    - Automated Executive & Technical Intelligence Report generator.
    - Export options: Markdown view, Copy to clipboard, and Printable PDF format.

---

## Getting Started

### Development Mode
Runs both the frontend dev server (Vite + Tailwind v4 on `http://localhost:5173`) and Express backend (`http://localhost:3000`) with automatic `/api` proxying:
```bash
pnpm run dev:full
```

### Production Build & Launch
Builds the client bundle directly into `backend/public` and starts the unified Node.js server:
```bash
pnpm run build
pnpm run start
```
Unified application will be live at `http://localhost:3000`.
