import type { BacktestResult } from "../types/backtest.types";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "EXTREME";

export type RiskScoreResult = {
  score: number;
  level: RiskLevel;
  reasons: string[];
};

export function calculateRiskScore(result: BacktestResult, targetMonthlyReturnPercent = 0): RiskScoreResult {
  const drawdownRisk = clamp(result.maxDrawdownPercent / 20, 0, 1) * 25;
  const profitFactorRisk = clamp((1.5 - result.profitFactor) / 1.5, 0, 1) * 20;
  const winRateRisk = clamp((50 - result.winRate) / 50, 0, 1) * 15;
  const sampleRisk = clamp((20 - result.totalTrades) / 20, 0, 1) * 15;
  const expectancyRisk = result.expectancy > 0 ? 0 : 15;
  const targetRisk = clamp(targetMonthlyReturnPercent / 100, 0, 1) * 10;
  const score = Math.round(drawdownRisk + profitFactorRisk + winRateRisk + sampleRisk + expectancyRisk + targetRisk);
  const reasons = buildReasons(result, targetMonthlyReturnPercent);

  return {
    score,
    level: riskLevel(score),
    reasons,
  };
}

function buildReasons(result: BacktestResult, targetMonthlyReturnPercent: number): string[] {
  const reasons: string[] = [];

  if (result.maxDrawdownPercent > 15) reasons.push("Drawdown exceeds the 15% protection threshold.");
  if (result.profitFactor < 1.3) reasons.push("Profit factor is below the minimum validation threshold.");
  if (result.winRate < 40) reasons.push("Win rate is below the minimum paper-trading threshold.");
  if (result.totalTrades < 20) reasons.push("Trade sample is too small for strategy approval.");
  if (result.expectancy <= 0) reasons.push("Expectancy is not positive.");
  if (targetMonthlyReturnPercent > 25) reasons.push("Target return is extremely aggressive.");

  return reasons.length > 0 ? reasons : ["Risk inputs are within current Sprint 2 research thresholds."];
}

function riskLevel(score: number): RiskLevel {
  if (score <= 25) return "LOW";
  if (score <= 50) return "MODERATE";
  if (score <= 75) return "HIGH";
  return "EXTREME";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
