import { Command } from "commander";
import { z } from "zod";
import { runBacktest } from "../backtesting/backtestEngine";
import { tradingConfig } from "../config/tradingConfig";
import { createMarketDataProvider, parseMarketDataSource } from "../data/marketDataProviderFactory";
import { calculateRiskScore } from "../risk/riskScore";
import { getStrategyByKey } from "../strategies/strategyRegistry";
import { handleCliError, writeAndLogTableReports } from "./cliOutput";

type SymbolComparisonEntry = {
  rank: number;
  symbol: string;
  finalCapital: number;
  totalReturnPercent: number;
  totalTrades: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  riskScore: number;
  warnings: string[];
};

const optionsSchema = z.object({
  symbols: z.string(),
  strategy: z.string().default("rsi"),
  data: z.string().default("sample"),
});

const program = new Command();

program
  .name("compare:symbols")
  .description("Compare one strategy across multiple symbols using sample or local CSV data.")
  .requiredOption("--symbols <symbols>", "Comma-separated symbols")
  .option("--strategy <key>", "Strategy key", "rsi")
  .option("--data <source>", "Market data source: sample or csv", "sample")
  .action((rawOptions) => {
    try {
      const options = optionsSchema.parse(rawOptions);
      const provider = createMarketDataProvider(parseMarketDataSource(options.data));
      const strategy = getStrategyByKey(options.strategy);
      const skipped: string[] = [];
      const entries: SymbolComparisonEntry[] = [];

      for (const rawSymbol of options.symbols.split(",")) {
        const symbol = rawSymbol.trim().toUpperCase();
        if (!symbol) continue;

        try {
          const candles = provider.getCandles(symbol);
          const result = runBacktest(candles, strategy);
          const risk = calculateRiskScore(result);
          entries.push({
            rank: 0,
            symbol,
            finalCapital: result.finalCapital,
            totalReturnPercent: result.totalReturnPercent,
            totalTrades: result.totalTrades,
            profitFactor: result.profitFactor,
            maxDrawdownPercent: result.maxDrawdownPercent,
            riskScore: risk.score,
            warnings: [
              ...(candles.length < 120 ? ["Dataset has fewer than 120 candles."] : []),
              ...(result.totalTrades < 30 ? ["Strategy has fewer than 30 trades."] : []),
              ...(result.maxDrawdownPercent > tradingConfig.maxDrawdownBeforeStopPercent
                ? ["Max drawdown is above threshold."]
                : []),
            ],
          });
        } catch (error) {
          skipped.push(`${symbol}: ${error instanceof Error ? error.message : "Unknown symbol error."}`);
        }
      }

      const ranked = entries
        .sort((a, b) => b.totalReturnPercent - a.totalReturnPercent)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
      const globalWarnings =
        ranked.length === 1 && ranked[0] && ranked[0].totalReturnPercent > 0
          ? ["Strategy performs well on only one tested symbol; broaden symbol coverage before trusting results."]
          : [];
      const basePath = `output/leaderboards/multi-symbol-${strategy.key}-comparison`;

      writeAndLogTableReports({
        jsonPath: `${basePath}.json`,
        markdownPath: `${basePath}.md`,
        data: { strategy: strategy.key, dataSource: options.data, skipped, globalWarnings, symbols: ranked },
        markdown: symbolsMarkdown(strategy.key, options.data, ranked, skipped, globalWarnings),
        rows: ranked.map((entry) => ({
          rank: entry.rank,
          symbol: entry.symbol,
          return: entry.totalReturnPercent,
          trades: entry.totalTrades,
          profitFactor: entry.profitFactor,
          drawdown: entry.maxDrawdownPercent,
          warnings: entry.warnings.length,
        })),
      });
    } catch (error) {
      handleCliError(error);
    }
  });

program.parse();

function symbolsMarkdown(
  strategy: string,
  dataSource: string,
  entries: SymbolComparisonEntry[],
  skipped: string[],
  globalWarnings: string[],
): string {
  const rows = entries
    .map(
      (entry) =>
        `| ${entry.rank} | ${entry.symbol} | ${entry.totalReturnPercent}% | ${entry.totalTrades} | ${entry.profitFactor} | ${entry.maxDrawdownPercent}% | ${entry.warnings.join("; ") || "None"} |`,
    )
    .join("\n");
  const skippedRows = skipped.length === 0 ? "- None" : skipped.map((item) => `- ${item}`).join("\n");
  const warningRows = globalWarnings.length === 0 ? "- None" : globalWarnings.map((item) => `- ${item}`).join("\n");

  return `# Multi-Symbol Comparison: ${strategy}

Mode: simulation only. Real trading is disabled.

- Data source: ${dataSource}

| Rank | Symbol | Return | Trades | Profit Factor | Max Drawdown | Warnings |
| --- | --- | ---: | ---: | ---: | ---: | --- |
${rows}

## Skipped Symbols
${skippedRows}

## Warnings
${warningRows}

Historical performance does not guarantee future results.
`;
}
