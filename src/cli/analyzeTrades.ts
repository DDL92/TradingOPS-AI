import { Command } from "commander";
import { analyzeTrades, type TradeJournalAnalysis } from "../journal/tradeAnalyzer";
import { sampleTrades } from "../journal/sampleTrades";
import { writeJsonReport, writeMarkdownReport } from "../reports/reportBuilder";

const program = new Command();

program
  .name("journal:analyze")
  .description("Analyze local sample trade journal data.")
  .action(() => {
    const result = analyzeTrades(sampleTrades);

    writeJsonReport("output/reports/trade-journal-analysis.json", result);
    writeMarkdownReport("output/reports/trade-journal-analysis.md", journalMarkdown(result));

    console.log(JSON.stringify(result, null, 2));
    console.log("Reports written to output/reports/trade-journal-analysis.json and output/reports/trade-journal-analysis.md");
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
