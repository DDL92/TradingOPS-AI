import { Command } from "commander";
import { z } from "zod";
import { runWalkForwardTest, type WalkForwardResult } from "../backtesting/walkForwardTester";
import { getMarketData } from "../data/sampleMarketData";
import { writeJsonReport, writeMarkdownReport } from "../reports/reportBuilder";
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

    writeJsonReport(`${basePath}.json`, result);
    writeMarkdownReport(`${basePath}.md`, walkForwardMarkdown(result));

    console.log(JSON.stringify(result, null, 2));
    console.log(`Reports written to ${basePath}.json and ${basePath}.md`);
  });

program.parse();

function walkForwardMarkdown(result: WalkForwardResult): string {
  const rejectionReasons =
    result.rejectionReasons.length === 0
      ? "- None"
      : result.rejectionReasons.map((reason) => `- ${reason}`).join("\n");

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
- Average return: ${result.averageReturn}%
- Average drawdown: ${result.averageDrawdown}%
- Profitable windows: ${result.profitableWindowsPercent}%
- Consistency score: ${result.consistencyScore}
- Approved for further testing: ${result.approvedForFurtherTesting ? "Yes" : "No"}

## Rejection Reasons
${rejectionReasons}

## Windows
| Window | Test Period | Return | Max Drawdown | Trades | Profitable |
| --- | --- | ---: | ---: | ---: | --- |
${rows}
`;
}
