import { Command } from "commander";
import { z } from "zod";
import { runBacktest } from "../backtesting/backtestEngine";
import { handleCliError, writeAndLogJsonReports } from "./cliOutput";
import { createMarketDataProvider, parseMarketDataSource } from "../data/marketDataProviderFactory";
import { getStrategyByKey } from "../strategies/strategyRegistry";
import type { BacktestResult } from "../types/backtest.types";

const optionsSchema = z.object({
  symbol: z.string().default("BTC"),
  strategy: z.string().default("rsi"),
  capital: z.coerce.number().positive().default(100),
  data: z.string().default("sample"),
});

const program = new Command();

program
  .name("backtest")
  .description("Run a simulation-only backtest against local sample market data.")
  .option("--symbol <symbol>", "Local sample symbol", "BTC")
  .option("--strategy <key>", "Strategy key: rsi, ema, breakout", "rsi")
  .option("--capital <amount>", "Initial simulation capital", "100")
  .option("--data <source>", "Market data source: sample or csv", "sample")
  .action((rawOptions) => {
    try {
      const options = optionsSchema.parse(rawOptions);
      const provider = createMarketDataProvider(parseMarketDataSource(options.data));
      const candles = provider.getCandles(options.symbol);
      const strategy = getStrategyByKey(options.strategy);
      const result = runBacktest(candles, strategy, options.capital);
      const basePath = `output/backtests/${result.symbol}-${result.strategy}-backtest`;

      writeAndLogJsonReports({
        jsonPath: `${basePath}.json`,
        markdownPath: `${basePath}.md`,
        data: result,
        markdown: backtestMarkdown(result),
      });
    } catch (error) {
      handleCliError(error);
    }
  });

program.parse();

function backtestMarkdown(result: BacktestResult): string {
  const rejectionReasons =
    result.rejectionReasons.length === 0
      ? "- None"
      : result.rejectionReasons.map((reason) => `- ${reason}`).join("\n");

  return `# Backtest Report: ${result.symbol} ${result.strategy}

## Summary
- Initial capital: $${result.initialCapital}
- Final capital: $${result.finalCapital}
- Total return: ${result.totalReturnPercent}%
- Total trades: ${result.totalTrades}
- Win rate: ${result.winRate}%
- Profit factor: ${result.profitFactor}
- Max drawdown: ${result.maxDrawdownPercent}%
- Expectancy: $${result.expectancy}
- Approved for paper trading: ${result.approvedForPaperTrading ? "Yes" : "No"}

## Rejection Reasons
${rejectionReasons}

## Safety
This is a local simulation only. No broker is connected and no real trades were executed.
`;
}
