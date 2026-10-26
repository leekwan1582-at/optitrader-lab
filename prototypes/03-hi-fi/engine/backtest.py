import sys
import json
import warnings
from typing import Dict, Any, Tuple, List, Optional
import numpy as np
import pandas as pd
import vectorbt as vbt

warnings.filterwarnings('ignore')

def parse_args(args: List[str]) -> Tuple[str, Dict[str, Any]]:
    """
    Parse arguments passed from the Node.js orchestrator.

    Args:
        args (List[str]): The command-line arguments (excluding script name).

    Returns:
        Tuple[str, Dict[str, Any]]: A tuple containing the CSV path and the config dictionary.

    Raises:
        SystemExit: If arguments are missing or JSON is invalid.
    """
    if len(args) < 2:
        print(json.dumps({"error": "Missing arguments. Usage: python backtest.py <csv_path> '<json_config>'"}), file=sys.stderr)
        sys.exit(1)
    
    csv_path = args[0]
    try:
        config = json.loads(args[1])
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON configuration provided: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
        
    return csv_path, config

def load_data(csv_path: str) -> pd.DataFrame:
    """
    Load and prepare the OHLCV data from a CSV file.

    Args:
        csv_path (str): Absolute path to the CSV file.

    Returns:
        pd.DataFrame: A DataFrame with a DatetimeIndex and OHLCV columns.

    Raises:
        SystemExit: If the file is missing, unreadable, or missing required columns.
    """
def load_data(csv_path: str) -> pd.DataFrame:
    # ... (keep docstring) ...
    try:
        df = pd.read_csv(csv_path)
        
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            # FIXED: Removed inplace=True to avoid Pandas4Warning
            df = df.set_index('timestamp')
        elif not isinstance(df.index, pd.DatetimeIndex):
             raise ValueError("CSV must contain a 'timestamp' column or a DatetimeIndex.")
        
        required_cols = ['open', 'high', 'low', 'close']
        if not all(col in df.columns for col in required_cols):
            raise ValueError(f"CSV missing required OHLC columns. Found: {list(df.columns)}")
            
        return df
    except Exception as e:
        print(json.dumps({"error": f"Data loading failed: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

def run_sma_crossover(df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[vbt.Portfolio, np.ndarray, np.ndarray]:
    """
    Run SMA Crossover optimization using vectorbt.

    Args:
        df (pd.DataFrame): The historical data.
        config (Dict[str, Any]): The optimization configuration.

    Returns:
        Tuple[vbt.Portfolio, np.ndarray, np.ndarray]: The portfolio matrix, fast windows, and slow windows.
        
    Raises:
        ValueError: If no valid parameter combinations are found.
    """
    close = df['close']
    
    try:
        fast_min = int(config['fast_ma']['min'])
        fast_max = int(config['fast_ma']['max'])
        fast_step = int(config['fast_ma']['step'])
        
        slow_min = int(config['slow_ma']['min'])
        slow_max = int(config['slow_ma']['max'])
        slow_step = int(config['slow_ma']['step'])
    except KeyError as e:
        raise ValueError(f"Missing required parameter range in config: {e}")

    fast_windows = np.arange(fast_min, fast_max + 1, fast_step)
    slow_windows = np.arange(slow_min, slow_max + 1, slow_step)
    
    # Ensure fast is always less than slow (filter invalid combos)
    combos = [(f, s) for f in fast_windows for s in slow_windows if f < s]
    if not combos:
        raise ValueError("No valid parameter combinations (Fast MA must be < Slow MA).")
        
    fast_windows = np.array([c[0] for c in combos])
    slow_windows = np.array([c[1] for c in combos])
    
    fast_ma = vbt.MA.run(close, window=fast_windows, short_name='fast')
    slow_ma = vbt.MA.run(close, window=slow_windows, short_name='slow')
    
    entries = fast_ma.ma_crossed_above(slow_ma)
    exits = fast_ma.ma_crossed_below(slow_ma)
    
    fees = float(config.get('transaction_costs', 0.0))
    pf = vbt.Portfolio.from_signals(close, entries, exits, fees=fees)
    
    return pf, fast_windows, slow_windows

def extract_results(pf: vbt.Portfolio, fast_windows: np.ndarray, slow_windows: np.ndarray, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract metrics, find the best parameters, and format the equity curve.

    Args:
        pf (vbt.Portfolio): The generated portfolio matrix.
        fast_windows (np.ndarray): Array of fast MA windows tested.
        slow_windows (np.ndarray): Array of slow MA windows tested.
        config (Dict[str, Any]): The optimization configuration.

    Returns:
        Dict[str, Any]: A dictionary formatted for the Node.js backend containing best params, metrics, and equity curve.
    """
    sharpe = pf.sharpe_ratio()
    total_return = pf.total_return()
    max_dd = pf.max_drawdown()
    win_rate = pf.trades.win_rate()
    profit_factor = pf.trades.profit_factor()
    total_trades = pf.trades.count()
    
    metrics_df = pd.DataFrame({
        'sharpe': sharpe,
        'total_return': total_return,
        'max_drawdown': max_dd,
        'win_rate': win_rate,
        'profit_factor': profit_factor,
        'total_trades': total_trades
    })
    
    max_dd_cap = float(config.get('max_drawdown', 1.0))
    valid_combos = metrics_df[metrics_df['max_drawdown'] <= max_dd_cap]
    
    if valid_combos.empty:
        valid_combos = metrics_df
        
    objective = str(config.get('objective', 'sharpe')).lower()
    if objective == 'total_return':
        best_idx = valid_combos['total_return'].idxmax()
    else:
        best_idx = valid_combos['sharpe'].idxmax()
        
    best_pf = pf[best_idx] 
    best_metrics = valid_combos.loc[best_idx]
    
    # Handle single vs multiple combinations indexing
    if isinstance(best_idx, tuple):
        best_fast = fast_windows[best_idx[0]]
        best_slow = slow_windows[best_idx[1]]
    else:
        best_fast = fast_windows[best_idx]
        best_slow = slow_windows[best_idx]

    equity_curve = best_pf.value().resample('W').last().dropna()
    
    curve_data = [
        {"date": date.strftime("%Y-%m-%d"), "value": round(float(value), 2)}
        for date, value in equity_curve.items()
    ]

    return {
        "status": "success",
        "best_params": {
            "fast_ma": int(best_fast),
            "slow_ma": int(best_slow)
        },
        "metrics": {
            "sharpe_ratio": round(float(best_metrics['sharpe']), 2),
            "total_return": round(float(best_metrics['total_return']) * 100, 2),
            "max_drawdown": round(float(best_metrics['max_drawdown']) * 100, 2),
            "win_rate": round(float(best_metrics['win_rate']) * 100, 2),
            "profit_factor": round(float(best_metrics['profit_factor']), 2),
            "total_trades": int(best_metrics['total_trades'])
        },
        "equity_curve": curve_data
    }

def main() -> None:
    """Main execution entry point."""
    csv_path, config = parse_args(sys.argv[1:])
    df = load_data(csv_path)
    
    try:
        pf, fast_win, slow_win = run_sma_crossover(df, config)
        results = extract_results(pf, fast_win, slow_win, config)
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()