import { Command } from "commander";
import { z } from "zod";
import { runPaperTradingSession, type PaperTradingSession } from "../paperTrading/paperTradingEngine";
import { logJsonResult, logReportPaths, writeCliReports } from "./cliOutput";
import { getMarketData } from "../data/sampleMarketData";
import { getStrategyByKey } from "../strategies/strategyRegistry";

const optionsSchema = z.object({
  symbol: z.string().default("BTC"),
  strategy: z.string().default("rsi"),
  capital: z.coerce.number().positive().default(100),
});

const program = new Command();

program
  .name("paper:trade")
  .description("Run a simulation-only paper trading session over the latest local sample candles.")
  .option("--symbol <symbol>", "Local sample symbol", "BTC")
  .option("--strategy <key>", "Strategy key", "rsi")
  .option("--capital <amount>", "Starting paper capital", "100")
  .action((rawOptions) => {
    const options = optionsSchema.parse(rawOptions);
    const symbol = options.symbol.toUpperCase();
    const strategy = getStrategyByKey(options.strategy);
    const result = runPaperTradingSession(getMarketData(symbol), strategy, options.capital);
    const jsonPath = "output/reports/paper-trade-session.json";
    const markdownPath = "output/reports/paper-trade-session.md";

    writeCliReports({
      jsonPath,
      markdownPath,
      data: result,
      markdown: paperTradeMarkdown(result),
    });
    logJsonResult(toConsoleSummary(result));
    logReportPaths(jsonPath, markdownPath);
  });

program.parse();

function paperTradeMarkdown(result: PaperTradingSession): string {
  const position = result.finalPortfolio.openPosition
    ? `Open ${result.finalPortfolio.openPosition.symbol} position from ${result.finalPortfolio.openPosition.entryDate} at ${result.finalPortfolio.openPosition.entryPrice}`
    : "No open position";

  return `# Paper Trade Session

Mode: simulation only. Real trading is disabled.

## Summary
- Symbol: ${result.symbol}
- Strategy: ${result.strategy}
- Starting capital: $${result.startingCapital}
- Cash: $${result.finalPortfolio.cash}
- Equity: $${result.finalPortfolio.equity}
- Trades: ${result.finalPortfolio.tradeLog.length}
- Position: ${position}
- Latest signal: ${result.latestSignal.action}
- Latest reason: ${result.latestSignal.reason}
- Drawdown guard: ${result.drawdownGuard.message}

No broker is connected. No real trades were placed.
`;
}

function toConsoleSummary(result: PaperTradingSession): Record<string, unknown> {
  return {
    symbol: result.symbol,
    strategy: result.strategy,
    mode: result.mode,
    startingCapital: result.startingCapital,
    cash: result.finalPortfolio.cash,
    equity: result.finalPortfolio.equity,
    trades: result.finalPortfolio.tradeLog.length,
    openPosition: result.finalPortfolio.openPosition,
    latestSignal: result.latestSignal,
    drawdownGuard: result.drawdownGuard,
    note: result.note,
  };
}
