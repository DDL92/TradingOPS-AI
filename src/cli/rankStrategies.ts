import { Command } from "commander";
import { z } from "zod";
import { buildStrategyLeaderboard, type LeaderboardEntry } from "../ranking/strategyLeaderboard";
import { writeJsonReport, writeMarkdownReport } from "../reports/reportBuilder";

const optionsSchema = z.object({
  symbol: z.string().default("BTC"),
});

const program = new Command();

program
  .name("rank:strategies")
  .description("Backtest and rank all registered strategies against local sample market data.")
  .option("--symbol <symbol>", "Local sample symbol", "BTC")
  .action((rawOptions) => {
    const options = optionsSchema.parse(rawOptions);
    const symbol = options.symbol.toUpperCase();
    const leaderboard = buildStrategyLeaderboard(symbol);
    const basePath = `output/leaderboards/${symbol}-strategy-leaderboard`;

    writeJsonReport(`${basePath}.json`, leaderboard);
    writeMarkdownReport(`${basePath}.md`, leaderboardMarkdown(symbol, leaderboard));

    console.table(
      leaderboard.map((entry) => ({
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
    );
    console.log(`Reports written to ${basePath}.json and ${basePath}.md`);
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
