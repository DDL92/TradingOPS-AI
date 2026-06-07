import type { Trade } from "../types/trade.types";

export type TradeJournalAnalysis = {
  totalTrades: number;
  totalPnl: number;
  winRate: number;
  bestStrategy: string;
  worstStrategy: string;
  bestSymbol: string;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxConsecutiveLosses: number;
  recommendation: string;
};

export function analyzeTrades(trades: Trade[]): TradeJournalAnalysis {
  const wins = trades.filter((trade) => trade.result === "win");
  const losses = trades.filter((trade) => trade.result === "loss");
  const grossProfit = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
  const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

  return {
    totalTrades: trades.length,
    totalPnl: round(trades.reduce((sum, trade) => sum + trade.pnl, 0)),
    winRate: round(trades.length === 0 ? 0 : (wins.length / trades.length) * 100),
    bestStrategy: bestGroup(trades, "strategy"),
    worstStrategy: worstGroup(trades, "strategy"),
    bestSymbol: bestGroup(trades, "symbol"),
    averageWin: round(wins.length === 0 ? 0 : grossProfit / wins.length),
    averageLoss: round(losses.length === 0 ? 0 : grossLoss / losses.length),
    profitFactor: round(profitFactor),
    maxConsecutiveLosses: calculateMaxConsecutiveLosses(trades),
    recommendation: buildRecommendation(trades.length, profitFactor),
  };
}

function bestGroup(trades: Trade[], key: "strategy" | "symbol"): string {
  return rankGroups(trades, key)[0]?.name ?? "N/A";
}

function worstGroup(trades: Trade[], key: "strategy" | "symbol"): string {
  const ranked = rankGroups(trades, key);
  return ranked[ranked.length - 1]?.name ?? "N/A";
}

function rankGroups(trades: Trade[], key: "strategy" | "symbol"): { name: string; pnl: number }[] {
  const groups = new Map<string, number>();

  for (const trade of trades) {
    groups.set(trade[key], (groups.get(trade[key]) ?? 0) + trade.pnl);
  }

  return [...groups.entries()]
    .map(([name, pnl]) => ({ name, pnl }))
    .sort((a, b) => b.pnl - a.pnl);
}

function calculateMaxConsecutiveLosses(trades: Trade[]): number {
  let current = 0;
  let max = 0;

  for (const trade of trades) {
    if (trade.result === "loss") {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }

  return max;
}

function buildRecommendation(totalTrades: number, profitFactor: number): string {
  if (totalTrades < 20) {
    return "Collect more simulated or journaled trades before trusting any strategy ranking.";
  }

  if (profitFactor < 1.3) {
    return "Do not move to paper trading. Improve strategy quality and risk control first.";
  }

  return "Continue validation with strict risk rules. This is not approval for real-money trading.";
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
