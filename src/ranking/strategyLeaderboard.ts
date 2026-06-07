import { runBacktest } from "../backtesting/backtestEngine";
import { getMarketData } from "../data/sampleMarketData";
import { calculateRiskScore, type RiskLevel } from "../risk/riskScore";
import { strategies } from "../strategies/strategyRegistry";
import type { BacktestResult } from "../types/backtest.types";

export type LeaderboardEntry = {
  rank: number;
  strategy: string;
  strategyKey: string;
  score: number;
  approvedForPaperTrading: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  mainReason: string;
  metrics: {
    totalReturnPercent: number;
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    maxDrawdownPercent: number;
    expectancy: number;
  };
};

export function buildStrategyLeaderboard(symbol: string): LeaderboardEntry[] {
  const candles = getMarketData(symbol);

  return strategies
    .map((strategy) => {
      const result = runBacktest(candles, strategy);
      return toLeaderboardEntry(result, strategy.name);
    })
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function toLeaderboardEntry(result: BacktestResult, strategyName: string): LeaderboardEntry {
  const risk = calculateRiskScore(result);

  return {
    rank: 0,
    strategy: strategyName,
    strategyKey: result.strategy,
    score: scoreBacktest(result),
    approvedForPaperTrading: result.approvedForPaperTrading,
    riskScore: risk.score,
    riskLevel: risk.level,
    mainReason: result.approvedForPaperTrading
      ? "Passed all paper-trading validation rules."
      : result.rejectionReasons[0] ?? "Insufficient evidence for paper trading.",
    metrics: {
      totalReturnPercent: result.totalReturnPercent,
      totalTrades: result.totalTrades,
      winRate: result.winRate,
      profitFactor: result.profitFactor,
      maxDrawdownPercent: result.maxDrawdownPercent,
      expectancy: result.expectancy,
    },
  };
}

function scoreBacktest(result: BacktestResult): number {
  const profitFactorScore = clamp(result.profitFactor / 2, 0, 1) * 30;
  const drawdownScore = clamp(1 - result.maxDrawdownPercent / 25, 0, 1) * 25;
  const expectancyScore = clamp((result.expectancy + 1) / 5, 0, 1) * 20;
  const winRateScore = clamp(result.winRate / 70, 0, 1) * 15;
  const sampleSizeScore = clamp(result.totalTrades / 20, 0, 1) * 10;

  return Number((profitFactorScore + drawdownScore + expectancyScore + winRateScore + sampleSizeScore).toFixed(2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
