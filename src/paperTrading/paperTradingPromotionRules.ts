import { tradingConfig } from "../config/tradingConfig";

export type PaperPromotionStats = {
  symbol: string;
  strategy: string;
  closedTrades: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  expectancy: number;
  firstSignalTimestamp?: string;
  criticalRuleViolations: string[];
};

export type PaperPromotionResult = {
  symbol: string;
  strategy: string;
  approvedForPromotion: boolean;
  status: "BLOCKED" | "ELIGIBLE_FOR_MANUAL_REVIEW";
  reasons: string[];
  manualReviewRequired: true;
  realMoneyAllowed: false;
  message: "Manual review required. Real-money trading remains disabled.";
};

export function evaluatePaperTradingPromotion(stats: PaperPromotionStats, now = new Date()): PaperPromotionResult {
  const reasons: string[] = [];

  if (stats.closedTrades < 30) reasons.push("Minimum 30 closed paper trades required.");
  if (stats.profitFactor < tradingConfig.minimumProfitFactorForPaperTrading) {
    reasons.push(`Profit factor must be at least ${tradingConfig.minimumProfitFactorForPaperTrading}.`);
  }
  if (stats.maxDrawdownPercent > tradingConfig.maxDrawdownBeforeStopPercent) {
    reasons.push(`Max drawdown must stay at or below ${tradingConfig.maxDrawdownBeforeStopPercent}%.`);
  }
  if (stats.expectancy <= tradingConfig.minimumExpectancyForValidation) {
    reasons.push("Expectancy must be positive.");
  }
  if (stats.criticalRuleViolations.length > 0) {
    reasons.push(...stats.criticalRuleViolations);
  }
  if (!hasTwoWeeksForwardTesting(stats.firstSignalTimestamp, now)) {
    reasons.push("At least 2 weeks of forward paper testing required.");
  }

  return {
    symbol: stats.symbol,
    strategy: stats.strategy,
    approvedForPromotion: reasons.length === 0,
    status: reasons.length === 0 ? "ELIGIBLE_FOR_MANUAL_REVIEW" : "BLOCKED",
    reasons: reasons.length > 0 ? reasons : ["Forward paper validation thresholds met for manual review only."],
    manualReviewRequired: true,
    realMoneyAllowed: false,
    message: "Manual review required. Real-money trading remains disabled.",
  };
}

function hasTwoWeeksForwardTesting(firstSignalTimestamp: string | undefined, now: Date): boolean {
  if (!firstSignalTimestamp) return false;
  const firstSignalDate = new Date(firstSignalTimestamp);
  if (Number.isNaN(firstSignalDate.getTime())) return false;

  const millisecondsInTwoWeeks = 14 * 24 * 60 * 60 * 1000;
  return now.getTime() - firstSignalDate.getTime() >= millisecondsInTwoWeeks;
}
