import { readPaperSignals, readPaperTrades, PAPER_SAFETY_NOTICE } from "../paperTrading/persistentPaperJournal";
import { buildPaperJournalMarkdown, type PaperJournalReport } from "../reports/paperTradingReportBuilder";
import { handleCliError, printSimulationOnlyNotice, writeAndLogJsonReports } from "./cliOutput";

try {
  const signals = readPaperSignals();
  const trades = readPaperTrades();
  const report: PaperJournalReport = {
    safetyNotice: PAPER_SAFETY_NOTICE,
    openTrades: trades.filter((trade) => trade.status === "OPEN"),
    latestSignals: [...signals].reverse().slice(0, 20),
    latestClosedTrades: trades.filter((trade) => trade.status === "CLOSED").reverse().slice(0, 20),
  };

  printSimulationOnlyNotice();
  writeAndLogJsonReports({
    jsonPath: "output/reports/paper-journal-report.json",
    markdownPath: "output/reports/paper-journal-report.md",
    data: report,
    markdown: buildPaperJournalMarkdown(report),
  });
} catch (error) {
  handleCliError(error);
}
