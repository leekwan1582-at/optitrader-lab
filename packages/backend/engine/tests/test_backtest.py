import json
import pytest
import pandas as pd
import numpy as np
from unittest.mock import patch
import backtest

# ==========================================
# TESTS FOR: parse_args
# ==========================================

def test_parse_args_success():
    """Test successful parsing of arguments."""
    args = ["/path/to/data.csv", '{"strategy_type": "sma_crossover"}']
    csv_path, config = backtest.parse_args(args)
    
    assert csv_path == "/path/to/data.csv"
    assert config["strategy_type"] == "sma_crossover"

def test_parse_args_missing_args(capsys):
    """Test that missing arguments triggers SystemExit and outputs JSON error."""
    with pytest.raises(SystemExit) as excinfo:
        backtest.parse_args(["only_one_arg"])
    
    assert excinfo.value.code == 1
    captured = capsys.readouterr()
    assert "Missing arguments" in captured.err

def test_parse_args_invalid_json(capsys):
    """Test that invalid JSON triggers SystemExit and outputs JSON error."""
    with pytest.raises(SystemExit) as excinfo:
        backtest.parse_args(["/path/to/data.csv", "{invalid_json}"])
    
    assert excinfo.value.code == 1
    captured = capsys.readouterr()
    assert "Invalid JSON configuration" in captured.err

# ==========================================
# TESTS FOR: load_data
# ==========================================

def test_load_data_success(tmp_path):
    """Test loading a valid CSV file."""
    csv_file = tmp_path / "valid.csv"
    content = [
        "timestamp,open,high,low,close,volume",
        "2023-01-01 00:00:00,10,12,9,11,100",
        "2023-01-01 01:00:00,11,13,10,12,150",
    ]
    csv_file.write_text("\n".join(content))

    df = backtest.load_data(str(csv_file))
    assert isinstance(df.index, pd.DatetimeIndex)
    assert list(df.columns) == ["open", "high", "low", "close", "volume"]
    assert len(df) == 2

def test_load_data_missing_ohlc(tmp_path, capsys):
    """Test missing required OHLC columns triggers SystemExit."""
    csv_file = tmp_path / "missing_cols.csv"
    content = [
        "timestamp,open,close",
        "2023-01-01 00:00:00,10,11"
    ]
    csv_file.write_text("\n".join(content))

    with pytest.raises(SystemExit) as excinfo:
        backtest.load_data(str(csv_file))

    assert excinfo.value.code == 1
    captured = capsys.readouterr()
    assert "CSV missing required OHLC columns" in captured.err

# ==========================================
# TESTS FOR: build_parameter_grid
# ==========================================

def test_build_parameter_grid_success():
    config = {
        'fast_ma': {'min': 5, 'max': 15, 'step': 5},
        'slow_ma': {'min': 20, 'max': 40, 'step': 10}
    }
    fast_win, slow_win, bounds = backtest.build_parameter_grid(config)
    assert len(fast_win) == 9
    assert bounds['fast_min'] == 5
    assert bounds['slow_max'] == 40
    assert all(f < s for f, s in zip(fast_win, slow_win))

def test_build_parameter_grid_invalid():
    config = {
        'fast_ma': {'min': 50, 'max': 60, 'step': 10},
        'slow_ma': {'min': 10, 'max': 20, 'step': 10}
    }
    with pytest.raises(ValueError, match="No valid parameter combinations"):
        backtest.build_parameter_grid(config)

def test_build_parameter_grid_missing_config():
    config = {'fast_ma': {'min': 5}}
    with pytest.raises(ValueError, match="Missing required parameter range"):
        backtest.build_parameter_grid(config)

# ==========================================
# TESTS FOR: run_backtest_pipeline (EMA, OOS, Edge of Grid)
# ==========================================

def test_run_backtest_pipeline_ema_vs_sma():
    """Verify that EMA momentum and SMA crossover produce distinct signal behavior."""
    dates = pd.date_range('2023-01-01', periods=100, freq='h')
    np.random.seed(42)
    # Sine wave plus drift to ensure crosses
    prices = 100 + np.sin(np.linspace(0, 8 * np.pi, 100)) * 5 + np.linspace(0, 10, 100)
    df = pd.DataFrame({
        'open': prices,
        'high': prices + 1,
        'low': prices - 1,
        'close': prices,
        'volume': 1000
    }, index=dates)

    config_sma = {
        'strategy_type': 'sma_crossover',
        'fast_ma': {'min': 5, 'max': 10, 'step': 5},
        'slow_ma': {'min': 15, 'max': 25, 'step': 10},
        'objective': 'sharpe',
        'max_drawdown': 0.5,
        'holdout_pct': 0.2
    }

    config_ema = {
        **config_sma,
        'strategy_type': 'ema_momentum'
    }

    res_sma = backtest.run_backtest_pipeline(df, config_sma)
    res_ema = backtest.run_backtest_pipeline(df, config_ema)

    assert res_sma['status'] == 'success'
    assert res_ema['status'] == 'success'
    # Check that metrics or equity curves differ between SMA and EMA
    assert (res_sma['metrics']['total_trades'] != res_ema['metrics']['total_trades']
            or res_sma['metrics']['sharpe_ratio'] != res_ema['metrics']['sharpe_ratio']
            or res_sma['equity_curve'] != res_ema['equity_curve'])

def test_run_backtest_pipeline_edge_of_grid_and_oos():
    """Verify edge of grid detection and out of sample metrics computation."""
    dates = pd.date_range('2023-01-01', periods=80, freq='h')
    np.random.seed(123)
    prices = 50 + np.cumsum(np.random.randn(80))
    df = pd.DataFrame({
        'open': prices,
        'high': prices + 0.5,
        'low': prices - 0.5,
        'close': prices,
        'volume': 500
    }, index=dates)

    config = {
        'strategy_type': 'sma_crossover',
        'fast_ma': {'min': 5, 'max': 5, 'step': 5},
        'slow_ma': {'min': 10, 'max': 10, 'step': 10},
        'objective': 'sharpe',
        'max_drawdown': 0.9,
        'holdout_pct': 0.25
    }

    res = backtest.run_backtest_pipeline(df, config)
    assert res['status'] == 'success'
    # Since fast=5 (min/max) and slow=10 (min/max), it must flag edge of grid
    assert res['robustness']['edge_of_grid'] is True
    assert any('edge of the search grid' in w for w in res['robustness']['warnings'])
    # Check OOS metrics present
    assert 'oos_sharpe' in res['metrics']
    assert 'oos_total_return' in res['metrics']
    assert 'oos_max_drawdown' in res['metrics']
    assert 'out_of_sample_drop' in res['robustness']
