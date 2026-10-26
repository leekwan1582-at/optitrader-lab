# OptiTrader Lab

## Capstone Project Proposal & Design Documentation

**BELLS SCTP Diploma in AI-Powered **ftware**ngineering**  
**Module 9 Capstone Project**

**Author:** Lee Kwan  
**Version:** 3.0 (Final Report Edition)  
**Date:** 25 October 2026

---

# Executive Summary

OptiTrader Lab is an AI-assisted optimization platform designed for solo quantitative traders and systematic strategy developers.

The project addresses the inefficiencies of manual strategy optimization, including repetitive parameter tuning, fragmented result storage, configuration drift, and limited experiment traceability.

The proposed solution combines:

- Natural-language optimization workflows
- Historical dataset management
- Automated optimization execution
- Experiment tracking and auditability
- AI-generated analytics and summaries
- Robustness validation tools

> **Design Principle:** Every optimization is treated as a reproducible experiment.

The system enables traders to focus on strategy research rather than manual experiment management.

---

# Table of Contents

1. Project Overview
2. User Research & Problem Definition
3. Solution Design
4. Feature Specifications
5. User Stories & Acceptance Criteria
6. Prototype Design
7. High-Fidelity Mockups
8. System Architecture
9. AI Integration
10. Success Criteria
11. Conclusion

---

# 1. Project Overview

## 1.1 Project Details

| Item | Detail |
|--------|--------|
| Project Name | OptiTrader Lab |
| Tagline | A lightweight, AI-assisted web portal that turns strategy tuning into tracked and repeatable experiments |
| Audience | Solo traders and quantitative developers |
| Primary Problem | Manual parameter tuning and fragmented research workflows |
| Core Innovation | AI-guided optimization backed by reproducible experiment tracking |
| AI Technology | Google Gemini Function Calling |
| Persistence Layer | Experiment Log and Audit Trail |
| Stack | React, Node.js/Express, MongoDB, Gemini API |

---

## 1.2 Learning Outcome Mapping

| Learning Outcome | Evidence |
|------------------|----------|
| LO1 | Persona, pain points, problem statement |
| LO2 | Ideation, MoSCoW, user stories |
| LO3 | Wireframes and prototypes |
| LO4 | Data structures and validation |
| LO5 | Documentation and architecture |
| LO6 | Gemini function calling and AI integration |

---

# 2. User Research & Problem Definition

## Target Audience

The primary audience consists of:

- Solo algorithmic traders
- Independent quantitative researchers
- Systematic futures traders
- Forex strategy developers
- Python-based backtesting enthusiasts

Characteristics:

- Comfortable writing Python
- Not professional software engineers
- Frequently use spreadsheets for analysis
- Need optimization tools without enterprise complexity

---

## User Persona

### Marcus Lim

| Attribute | Description |
|--------|--------|
| Age | 31 |
| Occupation | Full-Time Systematic Trader |
| Background | Former Bank Risk Analyst |
| Tools | Python, Pandas, Jupyter, Excel |
| Goal | Improve strategy quality while reducing manual effort |
| Frustration | Repetitive optimization cycles and poor experiment traceability |

---

## Pain Points

### P1 – Repetitive Optimization Workflow

Users repeatedly:

- Edit Python constants
- Execute scripts
- Rename files
- Copy metrics

### P2 – Fragmented Result Storage

Optimization outputs become scattered across:

- CSV files
- Excel sheets
- Notebook outputs

### P3 – Low Confidence in Results

Users often cannot answer:

- How many tests were performed?
- Was the winner genuinely robust?
- Has the strategy been validated?

### P4 – Configuration Drift

Changes to:

- Parameters
- Date ranges
- Commission settings

often occur without proper tracking.

### P5 – Existing Solutions Are Poorly Positioned

Most alternatives are:

- Too heavy
- Too expensive
- Too technical
- Too restrictive

---

## Root Cause

There is no lightweight platform that:

- Separates parameters from strategy code
- Tracks optimization runs
- Stores complete experiment history
- Provides reproducible audit records

---

# 3. Solution Design

## Product Vision

```text
Strategy Idea
      ↓
Natural Language Prompt
      ↓
Configuration Generation
      ↓
Optimization Execution
      ↓
Experiment Tracking
      ↓
AI Analysis
      ↓
Decision Making
```

---

## Core Design Principle

### Every Optimization Is An Experiment

Each optimization run becomes a permanent experiment record.

Every experiment stores:

```text
Run ID
Run Hash
Strategy
Configuration
Dataset
Date Range
Trial Count
Timestamp
Results
Warnings
AI Summary
```

This solves:

- Result fragmentation
- Experiment traceability
- Overfitting uncertainty
- Reproducibility concerns

---

# 4. Feature Specifications

## F1 – Strategy Config Manager

### Purpose

Manage parameter profiles separately from code.

### Capabilities

- Create Profiles
- Edit Profiles
- Clone Profiles
- Version Profiles

---

## F2 – Historical Data Manager

### Purpose

Provide validated historical datasets.

### Capabilities

- CSV Upload
- Validation
- Metadata Extraction
- Dataset Catalog

---

## F3 – Optimization Run Engine

### Purpose

Automate parameter sweeps.

### Capabilities

- Grid Search
- Queue Management
- Progress Tracking
- Background Execution

---

## F4 – Experiment Log & Trial Counter

### Purpose

Maintain permanent experiment history.

Stored Information:

```text
Run ID
Run Hash
Configuration Snapshot
Dataset
Date Range
Trial Count
Timestamp
Metrics
AI Summary
Status
```

---

## F5 – Results Analytics Dashboard

Provides:

- Equity Curves
- Metrics
- Comparison Tables
- Export Functions

---

## F6 – Natural Language Optimization Assistant

Powered by Gemini Function Calling.

Example:

```text
Optimize SMA crossover for maximum Sharpe
with drawdown below 15%.
```

The assistant:

1. Parses intent
2. Builds configuration
3. Validates constraints
4. Launches optimization

---

## F7 – Robustness Guard

Risk-awareness framework.

Checks:

- Out-of-sample degradation
- Edge-of-grid solutions
- Missing transaction costs
- Walk-forward validation status

### Robustness Guard Indicators

```text
⚠ Out-of-Sample Degradation

⚠ Edge of Search Grid

⚠ Transaction Costs Not Included

⚠ Walk-Forward Validation Missing

⚠ Small Sample Size
```

---

## F8 – Authentication & Personal Workspace

Provides:

- Registration
- Login
- JWT Authentication
- Private User Workspaces

---

# 5. MVP Scope

The MVP includes:

- Authentication
- Dataset Management
- Parameter Profiles
- Optimization Execution
- Experiment Log
- Results Dashboard
- Gemini Assistant

Built-in Strategies:

1. SMA Crossover
2. EMA Momentum

Supported Datasets:

- OHLCV CSV Files

Optimization Objectives:

- Sharpe Ratio
- Total Return
- Calmar Ratio

---

# 6. User Stories

## US1 – Configuration Profiles

As a trader, I want parameter profiles so I do not need to edit source code.

---

## US2 – Dataset Upload

As a trader, I want validated datasets so I can trust my backtests.

---

## US3 – Optimization Runs

As a trader, I want automated parameter sweeps so I do not manually run dozens of tests.

---

## US4 – Experiment Log

As a trader, I want every optimization permanently recorded so I can reproduce results.

### Acceptance Criteria

Each completed run displays:

- Run ID
- Run Hash
- Configuration Snapshot
- Dataset
- Date Range
- Trial Count
- Timestamp
- Results

---

## US5 – Analytics Dashboard

As a trader, I want side-by-side comparisons so I can quickly evaluate alternatives.

---

## US6 – Natural Language Assistant

As a trader, I want to describe goals in English instead of configuring everything manually.

---

## US7 – Personal Workspace

As a user, I want my work stored privately.

---

## US8 – Robustness Guard

As a trader, I want warnings when results appear overfitted.

### Acceptance Criteria

Display warnings for:

- Edge-of-search-grid results
- Excessive out-of-sample degradation
- Missing transaction costs
- Missing walk-forward testing

---

# 7. User Journey

```text
Login
   ↓
Upload Dataset
   ↓
Create Profile
   ↓
Describe Goal
   ↓
Launch Optimization
   ↓
Review Analytics
   ↓
Compare Experiments
   ↓
Clone Best Run
```

---

# 8. Prototype Design

## Screen 0 – Login & Personal Workspace

Supports authentication and private user workspaces.

![Screen 0 - Login](../prototypes/01-lo-fi/00-login.png)

### Key Features

- Login
- Registration
- Workspace Ownership

---

## Screen 1 – Dashboard & Active Workspace

![Screen 1 - Dashboard](../prototypes/01-lo-fi/01-dashboard.png)

### Purpose

Provides optimization overview and quick experiment launch.

### Key Components

- Workspace Context
- Quick Run Assistant
- Recent Experiments
- Activity Feed
- Trial Counters

---

## Screen 2 – Natural Language Assistant & Configuration Studio

![Screen 2 - NL Assistant](../prototypes/01-lo-fi/02-nl-assistant.png)

### Purpose

Convert plain-English requests into optimization jobs.

### Key Components

- Prompt Input
- Strategy Selection
- Parameter Range Controls
- Combination Counter
- Launch Controls

---

## Screen 3 – Dataset Ingestion & Validation Manager

![Screen 3 - Dataset Manager](../prototypes/01-lo-fi/03-dataset-manager.png)

### Purpose

Manage historical datasets and perform automated validation.

### Features

- CSV Upload
- Validation Checks
- Metadata Catalog
- Dataset Library

---

## Screen 4 – Results Analytics Studio

![Screen 4 - Results Analytics](../prototypes/01-lo-fi/04-results-analytics.png)

### Key Metrics

- Sharpe Ratio
- Profit Factor
- Total Return
- Max Drawdown
- Trial Count

### Experiment Identity

```text
Run ID
Run Hash
Timestamp
```

### AI Synthesis

Provides:

- Key Findings
- Optimization Commentary
- Risk Indicators

### Robustness Guard

```text
⚠ Out-of-Sample Degradation

⚠ Missing Transaction Costs

⚠ Missing Walk-Forward Validation

⚠ Edge of Search Grid
```

---

## Screen 5 – Experiment Comparison & Audit Trail Workspace

![Screen 5 - Comparison](../prototypes/01-lo-fi/05---comparison.png.png)
### Comparison Layer

- Equity Curve Overlay
- Metrics Comparison Matrix
- Out-of-Sample Analysis

### Experiment Log

```text
Run ID
Run Hash
Dataset
Trials
Status
Timestamp
```

### Audit Trail

Supports:

- Reproducibility
- Version Tracking
- Run Cloning
- Historical Validation

---

## High-Fidelity Prototype Evolution

The polished PNG mockups are enhanced visual interpretations of the original low-fidelity wireframes.

Enhancements include:

- Institutional-grade dashboard styling
- KPI cards
- Enhanced charting
- AI audit summaries
- Robustness panels
- Risk indicators
- Experiment log visualization

These enhancements improve usability while preserving the MVP workflows, feature definitions, and acceptance criteria.

---

# 9. System Architecture

```text
┌────────────────────────────┐
│       React Frontend       │
└────────────────────────────┘

        ▼         ▼

   MongoDB    Gemini API

        │
        ▼

 Worker Thread
 Optimization Engine

        │
        ▼

 Experiment Log

        │
        ▼

 Analytics Layer
```

---

# 10. AI Integration

## Gemini Function Calling

Supported Functions:

```text
create_configuration()
validate_dataset()
launch_optimization()
summarize_results()
compare_runs()
```

---

## Example Request

```text
Optimize SMA crossover on EURUSD
for maximum Sharpe Ratio
with drawdown below 15%.
```

---

## Example Structured Output

```json
{
  "strategy": "SMA_Crossover",
  "dataset": "EURUSD_H1",
  "objective": "sharpe",
  "max_drawdown": 0.15,
  "fast_ma": {
    "min": 5,
    "max": 30,
    "step": 5
  },
  "slow_ma": {
    "min": 40,
    "max": 120,
    "step": 10
  }
}
```

---

# 11. Success Criteria

The capstone is considered successful if users can:

- ✅ Upload market data
- ✅ Create optimization profiles
- ✅ Launch parameter sweeps
- ✅ Track experiment history
- ✅ Compare multiple runs
- ✅ Understand robustness risks
- ✅ Reproduce previous results
- ✅ Operate without editing source code

---

# 12. Conclusion

OptiTrader Lab transforms optimization from a manual, error-prone workflow into a structured, auditable experimentation process.

By combining natural-language interaction, experiment tracking, reproducibility controls, and AI-assisted analytics, the platform directly addresses the root causes identified during user research while remaining lightweight enough for solo quantitative traders.

The defining innovation is not simply automation. It is the introduction of an experiment-centric workflow where every optimization is traceable, reproducible, comparable, and explainable. This creates greater confidence in research outcomes and helps traders spend less time managing files and more time evaluating ideas.