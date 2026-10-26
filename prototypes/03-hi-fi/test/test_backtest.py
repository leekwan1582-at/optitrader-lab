import json
import sys
import pytest
import pandas as pd
import numpy as np
from unittest.mock import MagicMock, patch
# import importlib

# Dynamically import the package or a submodule
# backtest = importlib.import_module(".prototypes.03-hi-fi.engine.backtest")
# Import your script (ensure it's in the same directory)
import backtest

# ==========================================
# TESTS FOR: parse_args
# ==========================================

def test_parse_args_success():
    """Test successful parsing of arguments."""
    args = ["/path/to/data.csv", '{"strategy": "SMA_Crossover"}']
    csv_path, config = backtest.parse_args(args)
    
    assert csv_path == "/path/to/data.csv"
    assert config["strategy"] == "SMA_Crossover"

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
    # Create a dummy CSV
    csv_file = tmp_path / "test_data.csv"
    df = pd.DataFrame({
        'timestamp': pd.date_range(start='2020-01-01', periods=5, freq='D'),
        'open': [1.0, 1.1, 1.2, 1.3, 1.4],
        'high': [1.1, 1.2, 1.3, 1.4, 1.5],
        'low': [0.9, 1.0, 1.1, 1.2, 1.3],
        'close': [1.0, 1.1, 1.2, 1.3, 1.4],
        'volume': [100, 200, 300, 400, 500]
    })
    df.to_csv(csv_file, index=False)
    
    loaded_df = backtest.load_data(str(csv_file))
    
    assert isinstance(loaded_df.index, pd.DatetimeIndex)
    assert len(loaded_df) == 5
    assert 'close' in loaded_df.columns

def test_load_data_missing_columns(tmp_path, capsys):
    """Test that missing OHLC columns triggers SystemExit."""
    csv_file = tmp_path / "bad_data.csv"
    df = pd.DataFrame({'timestamp': ['2020-01-01'], 'close': [1.0]})
    df.to_csv(csv_file, index=False)
    
    with pytest.raises(SystemExit):
        backtest.load_data(str(csv_file))
        
    captured = capsys.readouterr()
    # FIXED: Check for lowercase "ohlc" because we called .lower() on the error string
    assert "missing required ohlc columns" in captured.err.lower()

def test_load_data_file_not_found(capsys):
    """Test that non-existent file triggers SystemExit."""
    with pytest.raises(SystemExit):
        backtest.load_data("/path/does/not/exist.csv")
        
    captured = capsys.readouterr()
    assert "Data loading failed" in captured.err

# ==========================================
# TESTS FOR: run_sma_crossover
# ==========================================

@patch('backtest.vbt')
def test_run_sma_crossover_no_valid_combos(mock_vbt):
    """Test that fast MA > slow MA raises a ValueError."""
    df = pd.DataFrame({'close': [1.0, 2.0]})
    config = {
        'fast_ma': {'min': 50, 'max': 60, 'step': 10},
        'slow_ma': {'min': 10, 'max': 20, 'step': 10}
    }
    
    with pytest.raises(ValueError, match="No valid parameter combinations"):
        backtest.run_sma_crossover(df, config)

@patch('backtest.vbt')
def test_run_sma_crossover_missing_config(mock_vbt):
    """Test that missing config keys raises a ValueError."""
    df = pd.DataFrame({'close': [1.0, 2.0]})
    config = {'fast_ma': {'min': 5}} # Missing max/step
    
    with pytest.raises(ValueError, match="Missing required parameter range"):
        backtest.run_sma_crossover(df, config)

# ==========================================
# TESTS FOR: extract_results
# ==========================================

def test_extract_results_drawdown_filter():
    """
    Test that the best parameter selection respects the max_drawdown cap.
    Ensures that a high Sharpe ratio is rejected if it breaches the drawdown limit.
    """
    mock_pf = MagicMock()
    
    # Mock metrics returned by vectorbt as REAL pandas Series
    mock_pf.sharpe_ratio.return_value = pd.Series([2.0, 1.5], index=[0, 1])
    mock_pf.total_return.return_value = pd.Series([0.5, 0.3], index=[0, 1])
    
    # Index 0 exceeds the 15% cap (0.20), Index 1 is safe (0.10)
    mock_pf.max_drawdown.return_value = pd.Series([0.20, 0.10], index=[0, 1]) 
    
    mock_pf.trades.win_rate.return_value = pd.Series([0.6, 0.5], index=[0, 1])
    mock_pf.trades.profit_factor.return_value = pd.Series([1.5, 1.2], index=[0, 1])
    mock_pf.trades.count.return_value = pd.Series([100, 80], index=[0, 1])
    
    fast_windows = np.array([10, 15])
    slow_windows = np.array([50, 60])
    config = {'max_drawdown': 0.15, 'objective': 'sharpe'}
    
    # Setup mock for the specific best portfolio returned by pf[best_idx]
    mock_best_pf = MagicMock()
    # The function expects a pandas Series with a DatetimeIndex so it can resample
    mock_series = pd.Series([100.0, 105.0], index=pd.date_range('2020-01-01', periods=2, freq='W'))
    mock_best_pf.value.return_value = mock_series
    
    # When pf[best_idx] is called, return the mock_best_pf
    mock_pf.__getitem__.return_value = mock_best_pf

    # Call the function directly (No @patch decorator needed here)
    result = backtest.extract_results(mock_pf, fast_windows, slow_windows, config)
    
    # Assertions
    # Even though Index 0 had better Sharpe (2.0), it had Max DD of 20% (>15%). 
    # Therefore, Index 1 should be selected (Sharpe 1.5, Fast MA 15, Slow MA 60).
    assert result['best_params']['fast_ma'] == 15
    assert result['best_params']['slow_ma'] == 60
    assert result['metrics']['sharpe_ratio'] == 1.5