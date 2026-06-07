import { Command } from "commander";
import { z } from "zod";
import { runMonteCarloSimulation, type MonteCarloResult } from "../backtesting/monteCarloSimulator";
import { getMarketData } from "../data/sampleMarketData";
import { writeJsonReport, writeMarkdownReport } from "../reports/reportBuilder";
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

    writeJsonReport(`${basePath}.json`, result);
    writeMarkdownReport(`${basePath}.md`, monteCarloMarkdown(result));

    console.log(JSON.stringify(result, null, 2));
    console.log(`Reports written to ${basePath}.json and ${basePath}.md`);
  });

program.parse();

function monteCarloMarkdown(result: MonteCarloResult): string {
  const targetLine =
    result.targetCapital !== undefined
      ? `- Target capital: $${result.targetCapital}
- Probability of reaching target: ${result.probabilityOfReachingTarget}%`
      : "- Target capital: not provided";

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

Monte Carlo output is based on local backtest returns and does not predict future performance.
`;
}
