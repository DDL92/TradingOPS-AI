# AI Trading Growth Lab

AI Trading Growth Lab is a TypeScript CLI research lab for simulation-only trading strategy evaluation. It starts from a conservative $100 capital context and focuses on goal feasibility, local backtesting, strategy ranking, trade journal analysis, and strict risk review.

This is not a live trading bot.

## Safety Warning

- Not financial advice.
- No profit guarantee.
- No broker integration.
- No real-money execution.
- No margin, leverage, options, futures, or short selling in the MVP.
- Results come from local sample data and must not be treated as proof a strategy works.

## Setup

```bash
npm install
npm run typecheck
```

## Commands

```bash
npm run goal:check -- --capital 100 --target 1000
npm run backtest -- --symbol BTC --strategy rsi
npm run rank:strategies -- --symbol BTC
npm run journal:analyze
npm run walkforward -- --symbol BTC --strategy rsi
npm run montecarlo -- --symbol BTC --strategy rsi --capital 100 --target 1000
npm run growth:project -- --capital 100 --target 1000 --months 6
npm run paper:trade -- --symbol BTC --strategy rsi --capital 100
npm run data:validate -- --symbol BTC
npm run data:import -- --symbol BTC --file ./some/path/BTC.csv
npm run compare:strategies -- --symbol BTC --data sample
npm run compare:symbols -- --symbols BTC --strategy rsi --data sample
```

## Example Goal Output

For $100 capital and a $1,000 monthly target:

- Required monthly return: 1000%
- Feasibility: NEARLY_IMPOSSIBLE_WITHOUT_EXTREME_RISK
- Recommendation: run simulations, backtesting, trade-history analysis, and risk audits only

## Reports

Generated reports are written to:

- `output/reports/goal-feasibility.json`
- `output/reports/goal-feasibility.md`
- `output/backtests/BTC-rsi-backtest.json`
- `output/backtests/BTC-rsi-backtest.md`
- `output/leaderboards/BTC-strategy-leaderboard.json`
- `output/leaderboards/BTC-strategy-leaderboard.md`
- `output/reports/trade-journal-analysis.json`
- `output/reports/trade-journal-analysis.md`
- `output/backtests/BTC-rsi-walkforward.json`
- `output/backtests/BTC-rsi-walkforward.md`
- `output/backtests/BTC-rsi-montecarlo.json`
- `output/backtests/BTC-rsi-montecarlo.md`
- `output/reports/growth-projection.json`
- `output/reports/growth-projection.md`
- `output/reports/paper-trade-session.json`
- `output/reports/paper-trade-session.md`
- `output/reports/BTC-data-validation.json`
- `output/reports/BTC-data-validation.md`
- `output/leaderboards/BTC-realdata-strategy-comparison.json`
- `output/leaderboards/BTC-realdata-strategy-comparison.md`
- `output/leaderboards/multi-symbol-rsi-comparison.json`
- `output/leaderboards/multi-symbol-rsi-comparison.md`

## Historical CSV Data

Sprint 3 supports local CSV files only. No API keys, paid APIs, broker connections, or live orders are used.

Expected CSV columns:

```csv
date,open,high,low,close,volume
2024-01-01,42000,43000,41000,42500,123456
```

Rules:

- `date` must be parseable.
- `open`, `high`, `low`, `close`, and `volume` must be numeric.
- `high` must be greater than or equal to open, close, and low.
- `low` must be less than or equal to open, close, and high.
- `volume` must be greater than or equal to 0.
- Duplicate dates are rejected.
- Rows are sorted by date before simulation.

Import local data:

```bash
npm run data:import -- --symbol BTC --file ./some/path/BTC.csv
```

Validate data:

```bash
npm run data:validate -- --symbol BTC --data csv
```

Run simulations with CSV data:

```bash
npm run backtest -- --symbol BTC --strategy rsi --data csv
npm run rank:strategies -- --symbol BTC --data csv
npm run walkforward -- --symbol BTC --strategy rsi --data csv
npm run montecarlo -- --symbol BTC --strategy rsi --capital 100 --target 1000 --data csv
npm run paper:trade -- --symbol BTC --strategy rsi --capital 100 --data csv
```

Compare:

```bash
npm run compare:strategies -- --symbol BTC --data csv
npm run compare:symbols -- --symbols BTC,ETH,SPY,QQQ,NVDA,TSLA --strategy rsi --data csv
```

Historical performance does not guarantee future results.

## Strategy MVP

- RSI Mean Reversion: buys when RSI is below 30 and sells above 55.
- EMA Crossover: buys when EMA 9 crosses above EMA 21 and sells when it crosses below.
- Breakout: buys above the previous 20-candle high and sells below the previous 10-candle low.
- MACD Confirmation: buys when MACD crosses above signal and sells when it crosses below.
- Volume Breakout: requires breakout plus 1.5x volume confirmation.
- Support Resistance Bounce: buys near support after a green close and sells near resistance or support failure.
- VWAP Approximation: trades close/VWAP crossovers.

Backtests are long-only, no leverage, one open position at a time, and use 25% of available simulation capital per trade.

## Sprint 2 Validation

- Walk-forward testing checks consistency across sequential train/test windows.
- Monte Carlo simulation reshuffles backtest trade returns with a seeded pseudo-random function.
- Growth projection explains required total, monthly, weekly, and daily returns.
- Paper trading is a local simulation only with no broker connection and no persistence.

Every Sprint 2 output states: Mode: simulation only. Real trading is disabled.

## Paper Trading Risk Rules

A strategy is rejected unless it meets all of these conditions:

- Minimum 20 trades
- Profit factor >= 1.3
- Max drawdown <= 15%
- Positive expectancy
- Win rate >= 40%

## Roadmap

Phase 1 completed: MVP with backtesting and goal feasibility.

Phase 2 completed: advanced validation with walk-forward testing, Monte Carlo, growth projection, risk scoring, and paper trading simulation.

Phase 3 next: real historical data provider.

Phase 4 next: persistent paper trading database.

Phase 5 later: broker integration with manual approval only.
