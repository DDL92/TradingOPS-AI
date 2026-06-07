import { Command } from "commander";
import { writeAndLogJsonReports } from "./cliOutput";
import { analyzeTrades, type TradeJournalAnalysis } from "../journal/tradeAnalyzer";
import { sampleTrades } from "../journal/sampleTrades";

const program = new Command();

program
  .name("journal:analyze")
  .description("Analyze local sample trade journal data.")
  .action(() => {
    const result = analyzeTrades(sampleTrades);

    writeAndLogJsonReports({
      jsonPath: "output/reports/trade-journal-analysis.json",
      markdownPath: "output/reports/trade-journal-analysis.md",
      data: result,
      markdown: journalMarkdown(result),
    });
  });

program.parse();

function journalMarkdown(result: TradeJournalAnalysis): string {
  return `# Trade Journal Analysis

## Summary
- Total trades: ${result.totalTrades}
- Total PnL: $${result.totalPnl}
- Win rate: ${result.winRate}%
- Best strategy: ${result.bestStrategy}
- Worst strategy: ${result.worstStrategy}
- Best symbol: ${result.bestSymbol}
- Average win: $${result.averageWin}
- Average loss: $${result.averageLoss}
- Profit factor: ${result.profitFactor}
- Max consecutive losses: ${result.maxConsecutiveLosses}

## Recommendation
${result.recommendation}
`;
}
