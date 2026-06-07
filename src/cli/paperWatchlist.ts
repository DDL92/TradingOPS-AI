import { loadOrCreatePaperWatchlist } from "../paperTrading/paperTradingWatchlist";
import { PAPER_SAFETY_NOTICE } from "../paperTrading/persistentPaperJournal";
import { buildPaperWatchlistMarkdown, type PaperWatchlistReport } from "../reports/paperTradingReportBuilder";
import { handleCliError, printSimulationOnlyNotice, writeAndLogTableReports } from "./cliOutput";

try {
  const watchlist = loadOrCreatePaperWatchlist();
  const report: PaperWatchlistReport = {
    safetyNotice: PAPER_SAFETY_NOTICE,
    watchlist,
  };

  printSimulationOnlyNotice();
  writeAndLogTableReports({
    jsonPath: "output/reports/paper-watchlist-report.json",
    markdownPath: "output/reports/paper-watchlist-report.md",
    data: report,
    markdown: buildPaperWatchlistMarkdown(report),
    rows: watchlist,
  });
} catch (error) {
  handleCliError(error);
}
