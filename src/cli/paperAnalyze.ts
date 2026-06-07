import { analyzePaperTradeJournal } from "../paperTrading/paperTradeJournalAnalyzer";
import { readPaperSignals, readPaperTrades, PAPER_SAFETY_NOTICE } from "../paperTrading/persistentPaperJournal";
import { buildPaperAnalysisMarkdown } from "../reports/paperTradingReportBuilder";
import { handleCliError, printSimulationOnlyNotice, writeAndLogJsonReports } from "./cliOutput";

try {
  const report = analyzePaperTradeJournal(readPaperSignals(), readPaperTrades(), PAPER_SAFETY_NOTICE);

  printSimulationOnlyNotice();
  writeAndLogJsonReports({
    jsonPath: "output/reports/paper-analysis-report.json",
    markdownPath: "output/reports/paper-analysis-report.md",
    data: report,
    markdown: buildPaperAnalysisMarkdown(report),
  });
} catch (error) {
  handleCliError(error);
}
