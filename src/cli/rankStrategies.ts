import { Command } from "commander";
import { z } from "zod";
import { handleCliError, writeAndLogTableReports } from "./cliOutput";
import { createMarketDataProvider, parseMarketDataSource } from "../data/marketDataProviderFactory";
import { buildStrategyLeaderboard, type LeaderboardEntry } from "../ranking/strategyLeaderboard";

const optionsSchema = z.object({
  symbol: z.string().default("BTC"),
  data: z.string().default("sample"),
});

const program = new Command();

program
  .name("rank:strategies")
  .description("Backtest and rank all registered strategies against local sample market data.")
  .option("--symbol <symbol>", "Local sample symbol", "BTC")
  .option("--data <source>", "Market data source: sample or csv", "sample")
  .action((rawOptions) => {
    try {
      const options = optionsSchema.parse(rawOptions);
      const symbol = options.symbol.toUpperCase();
      const provider = createMarketDataProvider(parseMarketDataSource(options.data));
      const leaderboard = buildStrategyLeaderboard(symbol, provider);
      const basePath = `output/leaderboards/${symbol}-strategy-leaderboard`;

      writeAndLogTableReports({
        jsonPath: `${basePath}.json`,
        markdownPath: `${basePath}.md`,
        data: leaderboard,
        markdown: leaderboardMarkdown(symbol, leaderboard),
        rows: leaderboard.map((entry) => ({
          rank: entry.rank,
          strategy: entry.strategyKey,
          score: entry.score,
          approved: entry.approvedForPaperTrading,
          risk: entry.riskLevel,
          riskScore: entry.riskScore,
          trades: entry.metrics.totalTrades,
          profitFactor: entry.metrics.profitFactor,
          drawdown: entry.metrics.maxDrawdownPercent,
        })),
      });
    } catch (error) {
      handleCliError(error);
    }
  });

program.parse();

function leaderboardMarkdown(symbol: string, leaderboard: LeaderboardEntry[]): string {
  const rows = leaderboard
    .map(
      (entry) =>
        `| ${entry.rank} | ${entry.strategy} | ${entry.score} | ${entry.approvedForPaperTrading ? "Yes" : "No"} | ${entry.metrics.totalTrades} | ${entry.metrics.winRate}% | ${entry.metrics.profitFactor} | ${entry.metrics.maxDrawdownPercent}% | ${entry.riskLevel} (${entry.riskScore}) | ${entry.mainReason} |`,
    )
    .join("\n");

  return `# ${symbol} Strategy Leaderboard

| Rank | Strategy | Score | Paper Trading Approved | Trades | Win Rate | Profit Factor | Max Drawdown | Risk | Main Reason |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
${rows}

This leaderboard is based on local sample data only and does not predict future returns.
`;
}
