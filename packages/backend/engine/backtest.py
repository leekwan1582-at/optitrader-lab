import sys
import json
import math
import warnings
from typing import Dict, Any, Tuple, List, Optional
import numpy as np
import pandas as pd
import vectorbt as vbt

warnings.filterwarnings('ignore')


def safe_float(value: Any, fallback: float = 0.0) -> float:
    """Convert numpy/pandas scalars to finite JSON-safe floats."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return number if math.isfinite(number) else fallback


def parse_args(args: List[str]) -> Tuple[str, Dict[str, Any]]:
    """Parse command line arguments."""
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
    """Load and prepare OHLCV data."""
    try:
        df = pd.read_csv(csv_path)
        
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
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


def infer_index_freq(index: pd.Index) -> Optional[Any]:
    """Infer a usable frequency for vectorbt annualization."""
    if not isinstance(index, pd.DatetimeIndex) or len(index) < 2:
        return None

    inferred = pd.infer_freq(index)
    if inferred:
        return inferred

    deltas = index.to_series().diff().dropna()
    if deltas.empty:
        return None

    median_delta = deltas.median()
    if pd.isna(median_delta) or median_delta <= pd.Timedelta(0):
        return None
    return median_delta


def build_parameter_grid(config: Dict[str, Any]) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    """Validate ranges and generate valid fast/slow parameter combinations."""
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
    
    combos = [(f, s) for f in fast_windows for s in slow_windows if f < s]
    if not combos:
        raise ValueError("No valid parameter combinations (Fast MA must be < Slow MA).")
        
    grid_bounds = {
        'fast_min': fast_min,
        'fast_max': fast_max,
        'slow_min': slow_min,
        'slow_max': slow_max,
    }
    return np.array([c[0] for c in combos]), np.array([c[1] for c in combos]), grid_bounds


def run_strategy_signals(
    close: pd.Series,
    fast_windows: np.ndarray,
    slow_windows: np.ndarray,
    strategy_type: str = 'sma_crossover'
) -> Tuple[Any, Any]:
    """
    Compute entries and exits for SMA Crossover or EMA Momentum across the full series.
    Indicators are generated over the full series to prevent cold-start distortion at split points.
    """
    if strategy_type == 'ema_momentum':
        fast_ma = vbt.MA.run(close, window=fast_windows, ewm=True, short_name='fast_ema')
        slow_ma = vbt.MA.run(close, window=slow_windows, ewm=True, short_name='slow_ema')
    else:
        fast_ma = vbt.MA.run(close, window=fast_windows, ewm=False, short_name='fast_sma')
        slow_ma = vbt.MA.run(close, window=slow_windows, ewm=False, short_name='slow_sma')

    entries = fast_ma.ma_crossed_above(slow_ma)
    exits = fast_ma.ma_crossed_below(slow_ma)
    return entries, exits


def run_backtest_pipeline(df: pd.DataFrame, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute complete backtest pipeline:
    1. Full series indicator generation.
    2. Chronological In-Sample (train) vs Out-of-Sample (holdout) splitting.
    3. Optimization strictly on In-Sample.
    4. Winner evaluation on Out-of-Sample.
    5. Robustness audits (edge-of-grid, OOS drop, sample sizes).
    """
    close = df['close']
    total_bars = len(close)
    if total_bars < 20:
        raise ValueError(f"Insufficient data for backtesting: {total_bars} bars provided.")

    fast_windows, slow_windows, grid_bounds = build_parameter_grid(config)
    strategy_type = str(config.get('strategy_type', 'sma_crossover')).lower()

    # Generate full-series signals
    entries, exits = run_strategy_signals(close, fast_windows, slow_windows, strategy_type)

    fees = float(config.get('transaction_costs', 0.0))
    freq = infer_index_freq(close.index)

    # Train / Holdout split
    raw_holdout = float(config.get('holdout_pct', 0.2))
    holdout_pct = max(0.05, min(0.5, raw_holdout))
    split_idx = int(total_bars * (1.0 - holdout_pct))
    split_idx = max(10, min(total_bars - 5, split_idx))

    # In-Sample slices
    is_close = close.iloc[:split_idx]
    is_entries = entries.iloc[:split_idx]
    is_exits = exits.iloc[:split_idx]

    # Out-of-Sample slices
    oos_close = close.iloc[split_idx:]
    oos_entries = entries.iloc[split_idx:]
    oos_exits = exits.iloc[split_idx:]

    # Build In-Sample Portfolio Matrix
    is_pf = vbt.Portfolio.from_signals(is_close, is_entries, is_exits, fees=fees, freq=freq)

    # Compute In-Sample metrics
    is_sharpe = is_pf.sharpe_ratio()
    is_total_return = is_pf.total_return()
    is_max_dd = np.abs(is_pf.max_drawdown())
    is_win_rate = is_pf.trades.win_rate()
    is_profit_factor = is_pf.trades.profit_factor()
    is_total_trades = is_pf.trades.count()

    # Compute Calmar ratio (annualized return / max drawdown)
    try:
        is_calmar = is_pf.calmar_ratio()
    except Exception:
        # Fallback approximation
        if isinstance(is_max_dd, pd.Series):
            is_calmar = is_total_return / is_max_dd.replace(0, np.nan)
        else:
            is_calmar = is_total_return / (is_max_dd if is_max_dd != 0 else np.nan)

    # Convert to Series if single combination returned scalar
    if not isinstance(is_sharpe, pd.Series):
        is_sharpe = pd.Series([is_sharpe], index=[0])
        is_total_return = pd.Series([is_total_return], index=[0])
        is_max_dd = pd.Series([is_max_dd], index=[0])
        is_calmar = pd.Series([is_calmar], index=[0])
        is_win_rate = pd.Series([is_win_rate], index=[0])
        is_profit_factor = pd.Series([is_profit_factor], index=[0])
        is_total_trades = pd.Series([is_total_trades], index=[0])

    metrics_df = pd.DataFrame({
        'sharpe': is_sharpe,
        'total_return': is_total_return,
        'max_drawdown': is_max_dd,
        'calmar': is_calmar,
        'win_rate': is_win_rate,
        'profit_factor': is_profit_factor,
        'total_trades': is_total_trades,
    })

    max_dd_cap = float(config.get('max_drawdown', 1.0))
    valid_combos = metrics_df[metrics_df['max_drawdown'] <= max_dd_cap]

    robustness_warnings: List[str] = []

    if valid_combos.empty:
        valid_combos = metrics_df
        robustness_warnings.append('0 parameter combinations met the max drawdown threshold; selected unconstrained winner.')

    objective = str(config.get('objective', 'sharpe')).lower()
    if objective == 'total_return':
        target_col = 'total_return'
    elif objective == 'calmar':
        target_col = 'calmar'
    else:
        target_col = 'sharpe'

    # Fill NaNs with -inf for selection
    valid_series = valid_combos[target_col].replace([np.inf, -np.inf], np.nan).fillna(-999999.0)
    best_idx = valid_series.idxmax()

    best_metrics = valid_combos.loc[best_idx]

    if isinstance(best_idx, tuple):
        # MultiIndex names: ['fast_..._window', 'fast_..._ewm', 'slow_..._window', 'slow_..._ewm']
        # The window levels are index 0 and index 2.
        best_fast = int(best_idx[0])
        best_slow = int(best_idx[2]) if len(best_idx) >= 3 else int(best_idx[1])
    else:
        best_fast = int(fast_windows[best_idx])
        best_slow = int(slow_windows[best_idx])

    # Edge of grid check
    edge_of_grid = (
        best_fast == grid_bounds['fast_min'] or
        best_fast == grid_bounds['fast_max'] or
        best_slow == grid_bounds['slow_min'] or
        best_slow == grid_bounds['slow_max']
    )
    if edge_of_grid:
        robustness_warnings.append('Best parameters hit the edge of the search grid; expand parameter bounds.')

    # Sample size checks
    if total_bars < 500:
        robustness_warnings.append(f'Dataset has only {total_bars} bars; minimum 500 recommended for reliable statistical inference.')
    is_trades_count = int(safe_float(best_metrics['total_trades']))
    if is_trades_count < 30:
        robustness_warnings.append(f'Winner produced only {is_trades_count} in-sample trades; minimum 30 recommended to prevent small-sample overfitting.')

    # Evaluate Winner on Out-of-Sample
    # When multiple combinations exist, entries/exits is a 2D DataFrame where columns are MultiIndex or single index.
    # When only 1 combination exists, entries/exits is a 1D Series.
    if isinstance(entries, pd.DataFrame):
        oos_winner_entries = oos_entries[best_idx]
        oos_winner_exits = oos_exits[best_idx]
        full_winner_entries = entries[best_idx]
        full_winner_exits = exits[best_idx]
    else:
        oos_winner_entries = oos_entries
        oos_winner_exits = oos_exits
        full_winner_entries = entries
        full_winner_exits = exits

    oos_pf = vbt.Portfolio.from_signals(oos_close, oos_winner_entries, oos_winner_exits, fees=fees, freq=freq)

    oos_sharpe_val = safe_float(oos_pf.sharpe_ratio())
    oos_total_return_val = safe_float(oos_pf.total_return())
    oos_max_dd_val = safe_float(np.abs(oos_pf.max_drawdown()))

    is_sharpe_val = safe_float(best_metrics['sharpe'])
    if is_sharpe_val > 0.001:
        oos_drop = (oos_sharpe_val - is_sharpe_val) / abs(is_sharpe_val)
    else:
        oos_drop = oos_sharpe_val - is_sharpe_val
    oos_drop = round(float(oos_drop), 4)

    # Full series portfolio of the winner for the equity curve
    full_pf = vbt.Portfolio.from_signals(close, full_winner_entries, full_winner_exits, fees=fees, freq=freq)

    equity_curve = full_pf.value()
    if isinstance(equity_curve.index, pd.DatetimeIndex):
        try:
            equity_curve = equity_curve.resample('W').last().dropna()
        except ValueError:
            step = max(1, len(equity_curve) // 30)
            equity_curve = equity_curve.iloc[::step]
    else:
        step = max(1, len(equity_curve) // 30)
        equity_curve = equity_curve.iloc[::step]

    if isinstance(equity_curve.index, pd.DatetimeIndex):
        curve_data = [
            {"date": date.strftime("%Y-%m-%d"), "value": round(safe_float(value), 2)}
            for date, value in equity_curve.items()
        ]
    else:
        curve_data = [
            {"date": str(index), "value": round(safe_float(value), 2)}
            for index, value in equity_curve.items()
        ]

    return {
        "status": "success",
        "best_params": {
            "fast_ma": best_fast,
            "slow_ma": best_slow,
        },
        "metrics": {
            "sharpe_ratio": round(is_sharpe_val, 2),
            "total_return": round(safe_float(best_metrics['total_return']) * 100, 2),
            "max_drawdown": round(abs(safe_float(best_metrics['max_drawdown'])) * 100, 2),
            "calmar_ratio": round(safe_float(best_metrics['calmar']), 2),
            "win_rate": round(safe_float(best_metrics['win_rate']) * 100, 2),
            "profit_factor": round(safe_float(best_metrics['profit_factor']), 2),
            "total_trades": is_trades_count,
            "oos_sharpe": round(oos_sharpe_val, 2),
            "oos_total_return": round(oos_total_return_val * 100, 2),
            "oos_max_drawdown": round(oos_max_dd_val * 100, 2),
        },
        "robustness": {
            "edge_of_grid": edge_of_grid,
            "out_of_sample_drop": oos_drop,
            "warnings": robustness_warnings,
        },
        "equity_curve": curve_data,
    }


def main() -> None:
    """Main execution entry point."""
    csv_path, config = parse_args(sys.argv[1:])
    df = load_data(csv_path)
    
    try:
        results = run_backtest_pipeline(df, config)
        print(json.dumps(results, allow_nan=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
