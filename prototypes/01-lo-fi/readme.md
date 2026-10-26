# OptiTrader Lab

## Capstone Project Proposal & Design Documentation (Lo-Fi Prototype Edition)

**BELLS SCTP Diploma in AI-Powered Software Engineering**  
**Module 9 Capstone Project**

**Author:** Lee Kwan  
**Version:** 3.0 (Lo-Fi Specification Edition)  
**Date:** 25 October 2026

---

# Executive Summary

OptiTrader Lab is a lightweight AI-assisted web application that helps solo systematic traders transform strategy optimization into tracked, repeatable experiments.

The platform addresses common research workflow problems:

- Manual parameter tuning
- Repetitive script execution
- Scattered optimization results
- Poor experiment traceability
- Lack of confidence in optimization outcomes

The solution introduces a natural-language interface powered by Gemini Function Calling alongside experiment logging, dataset management, optimization execution, and comparative analytics.

> **Core Design Principle:** Every optimization is treated as a reproducible experiment.

---

# Project Overview

| Item | Detail |
|--------|--------|
| Project Name | OptiTrader Lab |
| Tagline | A lightweight, AI-assisted web portal that turns strategy tuning into tracked, repeatable experiments |
| Target Audience | Solo systematic traders and quantitative developers |
| Core Problem | Manual parameter tweaking and untracked optimization workflows |
| Core Feature | Natural-language optimization assistant with experiment tracking |
| AI Model | Google Gemini |
| Stack | React · Node.js/Express · MongoDB · Gemini API |

---

# Design Objectives

The platform must:

1. Eliminate repetitive optimization workflows.
2. Separate configuration from strategy code.
3. Track every experiment automatically.
4. Improve trust in optimization results.
5. Reduce overfitting risk.
6. Provide a lightweight alternative to enterprise platforms.

---

# Core Design Principle

## Every Optimization Is An Experiment

Each optimization run is stored as a permanent experiment record.

```text
Run ID
Run Hash
Strategy
Profile
Dataset
Date Range
Trial Count
Timestamp
Status
Results
Warnings
AI Summary
```

This addresses:

- Result fragmentation
- Auditability
- Confidence
- Reproducibility

---

# MVP Features

## F1 Strategy Configuration Manager

Store optimization settings independently from source code.

### Functions

- Create Profile
- Save Profile
- Update Profile
- Clone Profile

---

## F2 Historical Dataset Manager

Manage datasets used for optimization.

### Functions

- Upload CSV
- Validate Format
- Extract Metadata
- Store Dataset Records

---

## F3 Optimization Run Engine

Execute repeatable optimization jobs.

### Functions

- Grid Search
- Job Queue
- Progress Tracking
- Run Management

---

## F4 Experiment Log & Trial Counter

Maintain complete experiment history.

### Stored Information

```text
Run ID
Run Hash
Configuration Snapshot
Dataset
Date Range
Trial Count
Timestamp
Results
AI Summary
```

---

## F5 Results Dashboard

Provide optimization analytics.

### Functions

- Equity Curves
- Sharpe Analysis
- Drawdown Analysis
- Performance Comparison
- CSV Export

---

## F6 Natural Language Assistant

Convert plain-English requests into optimization jobs.

### Example

```text
Optimize SMA crossover for maximum Sharpe
with drawdown below 15%.
```

---

## F7 Robustness Guard

Warn users when optimization results may be unreliable.

### Warnings

```text
⚠ Edge of Search Grid

⚠ Out-of-Sample Degradation

⚠ Missing Transaction Costs

⚠ Missing Walk-Forward Validation
```

---

## F8 Authentication & Workspace

Provide user authentication and private workspaces.

### Functions

- Register
- Login
- JWT Authentication
- Workspace Ownership

---

# User Journey

```text
Login
  ↓
Upload Dataset
  ↓
Create Strategy Profile
  ↓
Describe Optimization Goal
  ↓
Launch Run
  ↓
Review Analytics
  ↓
Compare Experiments
  ↓
Clone Best Configuration
```

---

# Low-Fidelity Wireframes

## Screen 0 – Login & Personal Workspace

Supports F8 Authentication and Personal Workspace.

```text
+-----------------------------------------------------------------------+
|                         OptiTrader Lab                                |
|           Research • Optimize • Validate • Deploy                     |
+-----------------------------------------------------------------------+
|                                                                       |
| Email Address                                                         |
| [______________________________________________]                      |
|                                                                       |
| Password                                                              |
| [______________________________________________]                      |
|                                                                       |
| [ Login ]                                                             |
|                                                                       |
| ------------------------------                                        |
|                                                                       |
| New User?                                                             |
|                                                                       |
| [ Register Account ]                                                  |
|                                                                       |
+-----------------------------------------------------------------------+
```

---

## Screen 1 – Dashboard & Active Workspace Overview

```text
+-----------------------------------------------------------------------+
| [Logo] OptiTrader Lab      [Datasets] [Profiles] [Docs]      (User)   |
+-----------------------------------------------------------------------+
| Workspace: Marcus_Lim_Research                                        |
+-----------------------------------------------------------------------+
| QUICK RUN [ "Optimize SMA crossover for max Sharpe..." ]       [Go]   |
+-----------------------------------------------------------------------+
| RECENT EXPERIMENTS                               [ + New Run ]        |
| +-------------------------------------------------------------------+ |
| | Run Name          | Dataset   | Trials | Best Metric | Status     | |
| |-------------------|-----------|--------|-------------|------------| |
| | EURUSD SMA Sweep  | EURUSD_H1 | 54     | Sh:1.18     | Done       | |
| | ES Momentum Grid  | ES_D1     | 120    | --          | Failed     | |
| +-------------------------------------------------------------------+ |
|                                                                       |
| [ Compare Selected (2) ]                                              |
+-----------------------------------------------------------------------+
```

---

## Screen 2 – Natural-Language Assistant & Configuration Studio

```text
+-----------------------------------------------------------------------+
| < Back to Dashboard            NEW EXPERIMENT                         |
+-----------------------------------------------------------------------+
| AI OPTIMIZATION ASSISTANT                                              |
|                                                                       |
| [ Tune fast/slow MA on EURUSD to maximize Sharpe with DD <15% ]       |
|                                                                       |
| Prompt Suggestions:                                                   |
| [ SMA ] [ EMA ] [ Breakout ]                                          |
|                                                                       |
| [ Ask Assistant ]                                                     |
|                                                                       |
| PARSED PARAMETER PREVIEW                                               |
|                                                                       |
| Strategy: [ SMA Crossover ]                                           |
| Dataset:  [ EURUSD_H1.csv ]                                           |
|                                                                       |
| Fast MA: Min[5] Max[30] Step[5]                                       |
| Slow MA: Min[40] Max[120] Step[10]                                    |
|                                                                       |
| Objective: [ Max Sharpe ]                                             |
| Max Drawdown: [ 15% ]                                                 |
|                                                                       |
| Estimated Combinations: 54 / 500 cap                                  |
|                                                                       |
| [ Cancel ]                                  [ Launch Run ]            |
+-----------------------------------------------------------------------+
```

---

## Screen 3 – Dataset Ingestion & Validation Manager

```text
+-----------------------------------------------------------------------+
| HISTORICAL DATASETS                               [ Upload CSV ]      |
+-----------------------------------------------------------------------+
|                                                                       |
| [ Drag & Drop CSV Here ]                                              |
|                                                                       |
| Supported:                                                            |
| timestamp, open, high, low, close, volume                             |
|                                                                       |
+-----------------------------------------------------------------------+
| ACTIVE DATASETS                                                       |
| +-------------------------------------------------------------------+ |
| | Name      | Symbol | Bar | Date Range      | Rows   | Active     | |
| |-----------|--------|-----|-----------------|--------|------------| |
| | EURUSD_H1 | EURUSD | 1H  | 2020-2024       | 31,240 | Yes        | |
| | NQ_M15    | NQ     |15m  | 2023-2024       | 24,100 | Yes        | |
| +-------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+
```

---

## Screen 4 – Results Analytics Studio

```text
+-----------------------------------------------------------------------+
| RUN #e41b7c90                               Status: COMPLETED         |
| Run Hash: 9adf72bc4e5f                                             |
+-----------------------------------------------------------------------+
| [ EQUITY CURVE ]                    | KEY METRICS                    |
|                                     | Sharpe Ratio: 1.18             |
|                                     | Total Return: 42.0%            |
|                                     | Max Drawdown: 12.1%            |
|                                     | Trials Tested: 54              |
+-----------------------------------------------------------------------+
| AI SYNTHESIS & ROBUSTNESS AUDIT                                      |
|                                                                       |
| Best Sharpe achieved at Fast MA 15 / Slow MA 60.                      |
|                                                                       |
| Observations:                                                         |
| • Stability observed between MA 50-70.                              |
|                                                                       |
| ROBUSTNESS GUARD                                                      |
| ⚠ Out-of-Sample Drop: -37%                                           |
| ⚠ Transaction Costs Not Included                                     |
| ⚠ Walk-Forward Test Not Performed                                    |
|                                                                       |
| Confidence Score: 7.8 / 10                                            |
|                                                                       |
| [ Clone Config ]        [ Export CSV ]     [ Export PDF ]             |
+-----------------------------------------------------------------------+
```

---

## Screen 5 – Experiment Comparison & Audit Trail Workspace

```text
+-----------------------------------------------------------------------+
| EXPERIMENT COMPARISON MATRIX                                          |
+-----------------------------------------------------------------------+

[ OVERLAID EQUITY CURVES ]

-----------------------------------------------------------------------

Metric                Run A               Run B
-------------------------------------------------------------
Sharpe Ratio           1.18                0.94
Max Drawdown          12.1%               8.4%
Profit Factor          1.42               1.28
Out-of-Sample Drop    -37%              -12%

-----------------------------------------------------------------------

EXPERIMENT LOG

Run ID      Hash         Dataset       Trials      Status
---------------------------------------------------------
e41b7c90    9adf72bc     EURUSD_H1       54        Done
f728ab11    c81aa2d7     EURUSD_H1       96        Done
a7ce004e    52bcf9c3     NQ_M15         120        Fail

[ Clone ] [ Compare ] [ Export ]

+-----------------------------------------------------------------------+
```

---

# High-Fidelity Design Evolution

The high-fidelity PNG mockups are visual enhancements of these low-fidelity wireframes.

Enhancements include:

- Modern UI styling
- KPI cards
- Enhanced charting
- Audit dashboards
- Robustness indicators
- AI-generated summaries

The underlying workflows, features, and acceptance criteria remain unchanged.

---

# Architecture

```text
React Frontend
       |
       v
Node.js / Express API
       |
       +-------- Gemini API
       |
       +-------- MongoDB
       |
       +-------- Worker Thread
                    |
                    v
           Optimization Engine
                    |
                    v
             Experiment Log
                    |
                    v
             Analytics Layer
```

---

# Success Criteria

The project is successful if users can:

- Upload and validate datasets
- Create optimization profiles
- Launch optimization jobs
- Track experiment history
- Compare runs
- View robustness warnings
- Reproduce previous results
- Operate without editing source code

---

# Conclusion

OptiTrader Lab transforms strategy optimization from an unstructured set of scripts into a reproducible experiment-driven workflow.

By combining AI-assisted configuration, experiment tracking, analytics, and robustness validation, the platform enables solo quantitative traders to conduct research with greater efficiency, confidence, and traceability.