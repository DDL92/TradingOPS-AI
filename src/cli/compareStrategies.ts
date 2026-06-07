import { Command } from "commander";
import { z } from "zod";
import { runMonteCarloSimulation } from "../backtesting/monteCarloSimulator";
import { runWalkForwardTest } from "../backtesting/walkForwardTester";
import { createMarketDataProvider, parseMarketDataSource } from "../data/marketDataProviderFactory";
import { buildStrategyLeaderboard, type LeaderboardEntry } from "../ranking/strategyLeaderboard";
import { strategies } from "../strategies/strategyRegistry";
import { handleCliError, writeAndLogTableReports } from "./cliOutput";

type StrategyComparisonEntry = LeaderboardEntry & {
  walkForwardApproved: boolean;
  monteCarloWarnings: string[];
  warnings: string[];
};

const optionsSchema = z.object({
  symbol: z.string().default("BTC"),
  data: z.string().default("sample"),
});

const program = new Command();

program
  .name("compare:strategies")
  .description("Compare all strategies on one symbol using sample or local CSV data.")
  .option("--symbol <symbol>", "Symbol to compare", "BTC")
  .option("--data <source>", "Market data source: sample or csv", "sample")
  .action((rawOptions) => {
    try {
      const options = optionsSchema.parse(rawOptions);
      const symbol = options.symbol.toUpperCase();
      const provider = createMarketDataProvider(parseMarketDataSource(options.data));
      const candles = provider.getCandles(symbol);
      const leaderboard = buildStrategyLeaderboard(symbol, provider);
      const comparison: StrategyComparisonEntry[] = leaderboard.map((entry) => {
        const strategy = strategies.find((candidate) => candidate.key === entry.strategyKey);
        const walkForward = strategy ? runWalkForwardTest(candles, strategy) : null;
        const monteCarlo = strategy ? runMonteCarloSimulation(candles, strategy) : null;
        const warnings = [
          ...(candles.length < 120 ? ["Dataset has fewer than 120 candles."] : []),
          ...(entry.metrics.totalTrades < 30 ? ["Strategy has fewer than 30 trades."] : []),
          ...(walkForward && entry.metrics.totalReturnPercent > 0 && !walkForward.approvedForFurtherTesting
            ? ["Backtest return is positive but walk-forward is weak."]
            : []),
          ...(monteCarlo?.warnings ?? []),
        ];

        return {
          ...entry,
          walkForwardApproved: walkForward?.approvedForFurtherTesting ?? false,
          monteCarloWarnings: monteCarlo?.warnings ?? [],
          warnings,
        };
      });
      const basePath = `output/leaderboards/${symbol}-realdata-strategy-comparison`;

      writeAndLogTableReports({
        jsonPath: `${basePath}.json`,
        markdownPath: `${basePath}.md`,
        data: {
          symbol,
          dataSource: options.data,
          bestStrategy: comparison[0]?.strategyKey ?? "N/A",
          approvedStrategies: comparison.filter((entry) => entry.approvedForPaperTrading).length,
          rejectedStrategies: comparison.filter((entry) => !entry.approvedForPaperTrading).length,
          strategies: comparison,
        },
        markdown: comparisonMarkdown(symbol, options.data, comparison),
        rows: comparison.map((entry) => ({
          rank: entry.rank,
          strategy: entry.strategyKey,
          score: entry.score,
          risk: entry.riskLevel,
          trades: entry.metrics.totalTrades,
          walkForward: entry.walkForwardApproved,
          warnings: entry.warnings.length,
        })),
      });
    } catch (error) {
      handleCliError(error);
    }
  });

program.parse();

function comparisonMarkdown(symbol: string, dataSource: string, comparison: StrategyComparisonEntry[]): string {
  const rows = comparison
    .map(
      (entry) =>
        `| ${entry.rank} | ${entry.strategyKey} | ${entry.score} | ${entry.riskLevel} (${entry.riskScore}) | ${entry.metrics.totalTrades} | ${entry.walkForwardApproved ? "Yes" : "No"} | ${entry.warnings.join("; ") || "None"} |`,
    )
    .join("\n");

  return `# Strategy Comparison: ${symbol}

Mode: simulation only. Real trading is disabled.

- Data source: ${dataSource}
- Best strategy: ${comparison[0]?.strategyKey ?? "N/A"}
- Approved strategies: ${comparison.filter((entry) => entry.approvedForPaperTrading).length}
- Rejected strategies: ${comparison.filter((entry) => !entry.approvedForPaperTrading).length}

| Rank | Strategy | Score | Risk | Trades | Walk-Forward Approved | Warnings |
| --- | --- | ---: | --- | ---: | --- | --- |
${rows}

Historical performance does not guarantee future results.
`;
}
