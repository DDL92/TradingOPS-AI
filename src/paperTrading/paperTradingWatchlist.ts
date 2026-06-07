import {
  PAPER_MODE,
  readPaperWatchlist,
  writePaperWatchlist,
  type PaperWatchlistEntry,
} from "./persistentPaperJournal";

export const PAPER_WATCHLIST_REASON = "Backtest is not enough. Requires forward paper validation.";

export const defaultPaperTradingWatchlist: PaperWatchlistEntry[] = [
  { symbol: "BTC", strategy: "rsi", mode: PAPER_MODE, realMoneyAllowed: false, reason: PAPER_WATCHLIST_REASON },
  { symbol: "SPY", strategy: "rsi", mode: PAPER_MODE, realMoneyAllowed: false, reason: PAPER_WATCHLIST_REASON },
  { symbol: "SPY", strategy: "breakout", mode: PAPER_MODE, realMoneyAllowed: false, reason: PAPER_WATCHLIST_REASON },
  { symbol: "SPY", strategy: "ema", mode: PAPER_MODE, realMoneyAllowed: false, reason: PAPER_WATCHLIST_REASON },
  { symbol: "QQQ", strategy: "rsi", mode: PAPER_MODE, realMoneyAllowed: false, reason: PAPER_WATCHLIST_REASON },
  { symbol: "QQQ", strategy: "breakout", mode: PAPER_MODE, realMoneyAllowed: false, reason: PAPER_WATCHLIST_REASON },
  {
    symbol: "NVDA",
    strategy: "volume-breakout",
    mode: PAPER_MODE,
    realMoneyAllowed: false,
    reason: PAPER_WATCHLIST_REASON,
  },
  { symbol: "TSLA", strategy: "rsi", mode: PAPER_MODE, realMoneyAllowed: false, reason: PAPER_WATCHLIST_REASON },
];

export function loadOrCreatePaperWatchlist(): PaperWatchlistEntry[] {
  const current = readPaperWatchlist();
  if (current.length > 0) return current;

  writePaperWatchlist(defaultPaperTradingWatchlist);
  return defaultPaperTradingWatchlist;
}
