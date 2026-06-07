import type { PaperJournalAnalysis } from "../paperTrading/paperTradeJournalAnalyzer";
import type { PaperSignalEntry, PaperTradeEntry, PaperWatchlistEntry } from "../paperTrading/persistentPaperJournal";

export type PaperScanReport = {
  safetyNotice: string;
  dataSource: string;
  capital: number;
  scannedPairs: number;
  buySignals: number;
  sellSignals: number;
  holdSignals: number;
  openedSimulatedTrades: number;
  closedSimulatedTrades: number;
  openSimulatedTrades: number;
  signals: PaperSignalEntry[];
  openedTrades: PaperTradeEntry[];
  closedTrades: PaperTradeEntry[];
  warnings: string[];
};

export type PaperJournalReport = {
  safetyNotice: string;
  openTrades: PaperTradeEntry[];
  latestSignals: PaperSignalEntry[];
  latestClosedTrades: PaperTradeEntry[];
};

export type PaperWatchlistReport = {
  safetyNotice: string;
  watchlist: PaperWatchlistEntry[];
};

export function buildPaperScanMarkdown(report: PaperScanReport): string {
  const warnings = report.warnings.length === 0 ? "- None" : report.warnings.map((warning) => `- ${warning}`).join("\n");

  return `# Persistent Paper Scan Report

## Safety
${report.safetyNotice}

## Summary
- Data source: ${report.dataSource}
- Simulated capital: $${report.capital}
- Scanned pairs: ${report.scannedPairs}
- BUY signals: ${report.buySignals}
- SELL signals: ${report.sellSignals}
- HOLD signals: ${report.holdSignals}
- Opened simulated trades: ${report.openedSimulatedTrades}
- Closed simulated trades: ${report.closedSimulatedTrades}
- Open simulated trades: ${report.openSimulatedTrades}

## Signals
${signalRows(report.signals)}

## Opened Simulated Trades
${tradeRows(report.openedTrades)}

## Closed Simulated Trades
${tradeRows(report.closedTrades)}

## Warnings
${warnings}
`;
}

export function buildPaperJournalMarkdown(report: PaperJournalReport): string {
  return `# Persistent Paper Trading Journal

## Safety
${report.safetyNotice}

## Open Simulated Trades
${tradeRows(report.openTrades)}

## Latest 20 Signals
${signalRows(report.latestSignals)}

## Latest 20 Closed Simulated Trades
${tradeRows(report.latestClosedTrades)}
`;
}

export function buildPaperAnalysisMarkdown(report: PaperJournalAnalysis): string {
  const rows =
    report.promotionStatusBySymbolStrategy.length === 0
      ? "_No symbol/strategy paper records found._"
      : [
          "| Symbol | Strategy | Closed Trades | Profit Factor | Max Drawdown | Expectancy | Promotion Status |",
          "| --- | --- | ---: | ---: | ---: | ---: | --- |",
          ...report.promotionStatusBySymbolStrategy.map(
            (item) =>
              `| ${item.symbol} | ${item.strategy} | ${item.closedTrades} | ${item.profitFactor} | ${item.maxDrawdownPercent}% | $${item.expectancy} | ${item.promotion.status} |`,
          ),
        ].join("\n");

  return `# Persistent Paper Trading Analysis

## Safety
${report.safetyNotice}
${report.manualReviewNotice}

## Summary
- Total signals: ${report.totalSignals}
- Total simulated trades: ${report.totalSimulatedTrades}
- Open trades: ${report.openTrades}
- Closed trades: ${report.closedTrades}
- Win rate: ${report.winRate}%
- Total simulated PnL: $${report.totalSimulatedPnl}
- Average win: $${report.averageWin}
- Average loss: $${report.averageLoss}
- Profit factor: ${report.profitFactor}
- Max consecutive losses: ${report.maxConsecutiveLosses}
- Best strategy: ${report.bestStrategy ?? "N/A"}
- Worst strategy: ${report.worstStrategy ?? "N/A"}
- Best symbol: ${report.bestSymbol ?? "N/A"}

## Promotion Status By Symbol/Strategy
${rows}
`;
}

export function buildPaperWatchlistMarkdown(report: PaperWatchlistReport): string {
  const rows =
    report.watchlist.length === 0
      ? "_No paper watchlist entries found._"
      : [
          "| Symbol | Strategy | Mode | Real Money Allowed | Reason |",
          "| --- | --- | --- | --- | --- |",
          ...report.watchlist.map(
            (entry) => `| ${entry.symbol} | ${entry.strategy} | ${entry.mode} | ${entry.realMoneyAllowed} | ${entry.reason} |`,
          ),
        ].join("\n");

  return `# Persistent Paper Trading Watchlist

## Safety
${report.safetyNotice}

## Watchlist
${rows}
`;
}

function signalRows(signals: PaperSignalEntry[]): string {
  if (signals.length === 0) return "_No signals recorded._";

  return [
    "| Time | Symbol | Strategy | Action | Close | Risk | Reason |",
    "| --- | --- | --- | --- | ---: | --- | --- |",
    ...signals.map(
      (signal) =>
        `| ${signal.timestamp} | ${signal.symbol} | ${signal.strategy} | ${signal.signalAction} | $${signal.latestClose} | ${signal.riskLevel} | ${signal.reason} |`,
    ),
  ].join("\n");
}

function tradeRows(trades: PaperTradeEntry[]): string {
  if (trades.length === 0) return "_No simulated trades recorded._";

  return [
    "| Symbol | Strategy | Status | Entry | Exit | Entry Price | Exit Price | PnL | Result |",
    "| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |",
    ...trades.map(
      (trade) =>
        `| ${trade.symbol} | ${trade.strategy} | ${trade.status} | ${trade.entryDate} | ${trade.exitDate ?? "N/A"} | $${trade.entryPrice} | ${trade.exitPrice === undefined ? "N/A" : `$${trade.exitPrice}`} | ${trade.pnl === undefined ? "N/A" : `$${trade.pnl}`} | ${trade.result ?? "N/A"} |`,
    ),
  ].join("\n");
}
