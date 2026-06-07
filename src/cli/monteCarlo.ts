import { Command } from "commander";
import { z } from "zod";
import { runMonteCarloSimulation, type MonteCarloResult } from "../backtesting/monteCarloSimulator";
import { writeAndLogJsonReports } from "./cliOutput";
import { getMarketData } from "../data/sampleMarketData";
import { getStrategyByKey } from "../strategies/strategyRegistry";

const optionsSchema = z.object({
  symbol: z.string().default("BTC"),
  strategy: z.string().default("rsi"),
  capital: z.coerce.number().positive().default(100),
  target: z.coerce.number().positive().optional(),
});

const program = new Command();

program
  .name("montecarlo")
  .description("Run deterministic Monte Carlo reshuffling on local backtest trade returns.")
  .option("--symbol <symbol>", "Local sample symbol", "BTC")
  .option("--strategy <key>", "Strategy key", "rsi")
  .option("--capital <amount>", "Starting simulation capital", "100")
  .option("--target <amount>", "Optional target capital")
  .action((rawOptions) => {
    const options = optionsSchema.parse(rawOptions);
    const symbol = options.symbol.toUpperCase();
    const strategy = getStrategyByKey(options.strategy);
    const result = runMonteCarloSimulation(getMarketData(symbol), strategy, options.capital, options.target);
    const basePath = `output/backtests/${symbol}-${strategy.key}-montecarlo`;

    writeAndLogJsonReports({
      jsonPath: `${basePath}.json`,
      markdownPath: `${basePath}.md`,
      data: result,
      markdown: monteCarloMarkdown(result),
    });
  });

program.parse();

function monteCarloMarkdown(result: MonteCarloResult): string {
  const targetLine =
    result.targetCapital !== undefined
      ? `- Target capital: $${result.targetCapital}
- Probability of reaching target: ${result.probabilityOfReachingTarget}%`
      : "- Target capital: not provided";
  const warnings = result.warnings.length === 0 ? "- None" : result.warnings.map((warning) => `- ${warning}`).join("\n");

  return `# Monte Carlo Report: ${result.symbol} ${result.strategy}

Mode: simulation only. Real trading is disabled.

## Summary
- Simulations: ${result.simulations}
- Starting capital: $${result.startingCapital}
${targetLine}
- Median final capital: $${result.medianFinalCapital}
- Worst 5th percentile final capital: $${result.worst5thPercentileFinalCapital}
- Best 95th percentile final capital: $${result.best95thPercentileFinalCapital}
- Probability of profit: ${result.probabilityOfProfit}%
- Probability of 20% drawdown: ${result.probabilityOfTwentyPercentDrawdown}%
- Trade return samples: ${result.tradeReturnSamples}
- Trade sample size: ${result.tradeSampleSize}
- Sample size quality: ${result.sampleSizeQuality}

## Warnings
${warnings}

Monte Carlo output is based on local backtest returns and does not predict future performance.
`;
}
