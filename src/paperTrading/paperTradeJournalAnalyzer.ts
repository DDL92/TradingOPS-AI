import {
  evaluatePaperTradingPromotion,
  type PaperPromotionResult,
  type PaperPromotionStats,
} from "./paperTradingPromotionRules";
import type { PaperSignalEntry, PaperTradeEntry } from "./persistentPaperJournal";

export type PaperPairAnalysis = {
  symbol: string;
  strategy: string;
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  winRate: number;
  totalSimulatedPnl: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  expectancy: number;
  maxConsecutiveLosses: number;
  maxDrawdownPercent: number;
  promotion: PaperPromotionResult;
};

export type PaperJournalAnalysis = {
  safetyNotice: string;
  totalSignals: number;
  totalSimulatedTrades: number;
  openTrades: number;
  closedTrades: number;
  winRate: number;
  totalSimulatedPnl: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxConsecutiveLosses: number;
  bestStrategy: string | null;
  worstStrategy: string | null;
  bestSymbol: string | null;
  promotionStatusBySymbolStrategy: PaperPairAnalysis[];
  manualReviewNotice: "Manual review required. Real-money trading remains disabled.";
};

export function analyzePaperTradeJournal(
  signals: PaperSignalEntry[],
  trades: PaperTradeEntry[],
  safetyNotice: string,
): PaperJournalAnalysis {
  const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
  const openTrades = trades.filter((trade) => trade.status === "OPEN");
  const aggregate = calculateTradeStats(closedTrades);
  const pairAnalyses = analyzePairs(signals, trades);

  return {
    safetyNotice,
    totalSignals: signals.length,
    totalSimulatedTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    winRate: aggregate.winRate,
    totalSimulatedPnl: aggregate.totalSimulatedPnl,
    averageWin: aggregate.averageWin,
    averageLoss: aggregate.averageLoss,
    profitFactor: aggregate.profitFactor,
    maxConsecutiveLosses: aggregate.maxConsecutiveLosses,
    bestStrategy: bestGroupByPnl(closedTrades, "strategy"),
    worstStrategy: worstGroupByPnl(closedTrades, "strategy"),
    bestSymbol: bestGroupByPnl(closedTrades, "symbol"),
    promotionStatusBySymbolStrategy: pairAnalyses,
    manualReviewNotice: "Manual review required. Real-money trading remains disabled.",
  };
}

function analyzePairs(signals: PaperSignalEntry[], trades: PaperTradeEntry[]): PaperPairAnalysis[] {
  const pairKeys = new Set<string>();
  for (const signal of signals) pairKeys.add(pairKey(signal.symbol, signal.strategy));
  for (const trade of trades) pairKeys.add(pairKey(trade.symbol, trade.strategy));

  return [...pairKeys].sort().map((key) => {
    const [symbol = "UNKNOWN", strategy = "unknown"] = key.split("|");
    const pairSignals = signals.filter((signal) => signal.symbol === symbol && signal.strategy === strategy);
    const pairTrades = trades.filter((trade) => trade.symbol === symbol && trade.strategy === strategy);
    const pairClosedTrades = pairTrades.filter((trade) => trade.status === "CLOSED");
    const stats = calculateTradeStats(pairClosedTrades);
    const promotionStats: PaperPromotionStats = {
      symbol,
      strategy,
      closedTrades: pairClosedTrades.length,
      profitFactor: stats.profitFactor,
      maxDrawdownPercent: stats.maxDrawdownPercent,
      expectancy: stats.expectancy,
      criticalRuleViolations: findCriticalRuleViolations(pairTrades),
      ...(pairSignals[0] ? { firstSignalTimestamp: pairSignals[0].timestamp } : {}),
    };

    return {
      symbol,
      strategy,
      totalTrades: pairTrades.length,
      closedTrades: pairClosedTrades.length,
      openTrades: pairTrades.length - pairClosedTrades.length,
      winRate: stats.winRate,
      totalSimulatedPnl: stats.totalSimulatedPnl,
      averageWin: stats.averageWin,
      averageLoss: stats.averageLoss,
      profitFactor: stats.profitFactor,
      expectancy: stats.expectancy,
      maxConsecutiveLosses: stats.maxConsecutiveLosses,
      maxDrawdownPercent: stats.maxDrawdownPercent,
      promotion: evaluatePaperTradingPromotion(promotionStats),
    };
  });
}

function calculateTradeStats(trades: PaperTradeEntry[]): Omit<PaperPairAnalysis, "symbol" | "strategy" | "totalTrades" | "closedTrades" | "openTrades" | "promotion"> {
  const wins = trades.filter((trade) => (trade.pnl ?? 0) > 0);
  const losses = trades.filter((trade) => (trade.pnl ?? 0) < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0));
  const totalSimulatedPnl = trades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);

  return {
    winRate: trades.length === 0 ? 0 : round((wins.length / trades.length) * 100),
    totalSimulatedPnl: round(totalSimulatedPnl),
    averageWin: wins.length === 0 ? 0 : round(grossProfit / wins.length),
    averageLoss: losses.length === 0 ? 0 : round(grossLoss / losses.length),
    profitFactor: grossLoss === 0 ? (grossProfit > 0 ? round(grossProfit) : 0) : round(grossProfit / grossLoss),
    expectancy: trades.length === 0 ? 0 : round(totalSimulatedPnl / trades.length),
    maxConsecutiveLosses: calculateMaxConsecutiveLosses(trades),
    maxDrawdownPercent: calculateMaxDrawdownPercent(trades),
  };
}

function calculateMaxConsecutiveLosses(trades: PaperTradeEntry[]): number {
  let current = 0;
  let max = 0;

  for (const trade of trades) {
    if ((trade.pnl ?? 0) < 0) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }

  return max;
}

function calculateMaxDrawdownPercent(trades: PaperTradeEntry[]): number {
  if (trades.length === 0) return 0;

  const startingCapital = trades[0]?.simulatedCapital ?? 100;
  let equity = startingCapital;
  let peak = startingCapital;
  let maxDrawdown = 0;

  for (const trade of trades) {
    equity += trade.pnl ?? 0;
    peak = Math.max(peak, equity);
    const drawdown = peak === 0 ? 0 : ((peak - equity) / peak) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return round(maxDrawdown);
}

function findCriticalRuleViolations(trades: PaperTradeEntry[]): string[] {
  return trades.some((trade) => trade.realMoneyAllowed !== false)
    ? ["Critical violation: journal contains a trade not marked realMoneyAllowed=false."]
    : [];
}

function bestGroupByPnl(trades: PaperTradeEntry[], key: "symbol" | "strategy"): string | null {
  return rankedGroupByPnl(trades, key, "desc")[0]?.name ?? null;
}

function worstGroupByPnl(trades: PaperTradeEntry[], key: "symbol" | "strategy"): string | null {
  return rankedGroupByPnl(trades, key, "asc")[0]?.name ?? null;
}

function rankedGroupByPnl(trades: PaperTradeEntry[], key: "symbol" | "strategy", direction: "asc" | "desc"): Array<{ name: string; pnl: number }> {
  const groups = new Map<string, number>();
  for (const trade of trades) {
    groups.set(trade[key], (groups.get(trade[key]) ?? 0) + (trade.pnl ?? 0));
  }

  return [...groups.entries()]
    .map(([name, pnl]) => ({ name, pnl }))
    .sort((left, right) => (direction === "asc" ? left.pnl - right.pnl : right.pnl - left.pnl));
}

function pairKey(symbol: string, strategy: string): string {
  return `${symbol.toUpperCase()}|${strategy}`;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
