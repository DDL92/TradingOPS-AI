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

## Strategy MVP

- RSI Mean Reversion: buys when RSI is below 30 and sells above 55.
- EMA Crossover: buys when EMA 9 crosses above EMA 21 and sells when it crosses below.
- Breakout: buys above the previous 20-candle high and sells below the previous 10-candle low.

Backtests are long-only, no leverage, one open position at a time, and use 25% of available simulation capital per trade.

## Paper Trading Risk Rules

A strategy is rejected unless it meets all of these conditions:

- Minimum 20 trades
- Profit factor >= 1.3
- Max drawdown <= 15%
- Positive expectancy
- Win rate >= 40%

## Roadmap

Phase 1: backtesting and goal feasibility.

Phase 2: paper trading.

Phase 3: external market data.

Phase 4: broker integration with manual approval.

Phase 5: controlled automation with kill switch.
