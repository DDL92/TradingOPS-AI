import { Command } from "commander";
import { z } from "zod";
import { runWalkForwardTest, type WalkForwardResult } from "../backtesting/walkForwardTester";
import { writeAndLogJsonReports } from "./cliOutput";
import { getMarketData } from "../data/sampleMarketData";
import { getStrategyByKey } from "../strategies/strategyRegistry";

const optionsSchema = z.object({
  symbol: z.string().default("BTC"),
  strategy: z.string().default("rsi"),
});

const program = new Command();

program
  .name("walkforward")
  .description("Run simulation-only walk-forward testing using local sample market data.")
  .option("--symbol <symbol>", "Local sample symbol", "BTC")
  .option("--strategy <key>", "Strategy key", "rsi")
  .action((rawOptions) => {
    const options = optionsSchema.parse(rawOptions);
    const symbol = options.symbol.toUpperCase();
    const strategy = getStrategyByKey(options.strategy);
    const result = runWalkForwardTest(getMarketData(symbol), strategy);
    const basePath = `output/backtests/${symbol}-${strategy.key}-walkforward`;

    writeAndLogJsonReports({
      jsonPath: `${basePath}.json`,
      markdownPath: `${basePath}.md`,
      data: result,
      markdown: walkForwardMarkdown(result),
    });
  });

program.parse();

function walkForwardMarkdown(result: WalkForwardResult): string {
  const rejectionReasons =
    result.rejectionReasons.length === 0
      ? "- None"
      : result.rejectionReasons.map((reason) => `- ${reason}`).join("\n");
  const warnings = result.warnings.length === 0 ? "- None" : result.warnings.map((warning) => `- ${warning}`).join("\n");

  const rows = result.windows
    .map(
      (window) =>
        `| ${window.window} | ${window.testingStart} to ${window.testingEnd} | ${window.returnPercent}% | ${window.maxDrawdownPercent}% | ${window.totalTrades} | ${window.profitable ? "Yes" : "No"} |`,
    )
    .join("\n");

  return `# Walk-Forward Report: ${result.symbol} ${result.strategy}

Mode: simulation only. Real trading is disabled.

## Summary
- Windows: ${result.numberOfWindows}
- Training window size: ${result.trainingWindowSize}
- Testing window size: ${result.testingWindowSize}
- Profitable windows: ${result.profitableWindows}
- Average return: ${result.averageReturn}%
- Average drawdown: ${result.averageDrawdown}%
- Profitable windows percent: ${result.profitableWindowPercent}%
- Consistency score: ${result.consistencyScore}
- Approved for further testing: ${result.approvedForFurtherTesting ? "Yes" : "No"}

## Rejection Reasons
${rejectionReasons}

## Warnings
${warnings}

## Windows
| Window | Test Period | Return | Max Drawdown | Trades | Profitable |
| --- | --- | ---: | ---: | ---: | --- |
${rows}
`;
}
