import { Command } from "commander";
import { z } from "zod";
import { runBacktest } from "../backtesting/backtestEngine";
import { getMarketData } from "../data/sampleMarketData";
import { writeJsonReport, writeMarkdownReport } from "../reports/reportBuilder";
import { getStrategyByKey } from "../strategies/strategyRegistry";
import type { BacktestResult } from "../types/backtest.types";

const optionsSchema = z.object({
  symbol: z.string().default("BTC"),
  strategy: z.string().default("rsi"),
  capital: z.coerce.number().positive().default(100),
});

const program = new Command();

program
  .name("backtest")
  .description("Run a simulation-only backtest against local sample market data.")
  .option("--symbol <symbol>", "Local sample symbol", "BTC")
  .option("--strategy <key>", "Strategy key: rsi, ema, breakout", "rsi")
  .option("--capital <amount>", "Initial simulation capital", "100")
  .action((rawOptions) => {
    const options = optionsSchema.parse(rawOptions);
    const candles = getMarketData(options.symbol);
    const strategy = getStrategyByKey(options.strategy);
    const result = runBacktest(candles, strategy, options.capital);
    const basePath = `output/backtests/${result.symbol}-${result.strategy}-backtest`;

    writeJsonReport(`${basePath}.json`, result);
    writeMarkdownReport(`${basePath}.md`, backtestMarkdown(result));

    console.log(JSON.stringify(result, null, 2));
    console.log(`Reports written to ${basePath}.json and ${basePath}.md`);
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
