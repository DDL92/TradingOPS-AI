import { tradingConfig } from "../config/tradingConfig";
import type { BacktestMetrics } from "../types/backtest.types";

export type RiskApproval = {
  approved: boolean;
  rejectionReasons: string[];
};

export function evaluatePaperTradingApproval(metrics: BacktestMetrics): RiskApproval {
  const rejectionReasons: string[] = [];

  if (metrics.totalTrades < tradingConfig.minimumTradesForValidation) {
    rejectionReasons.push(`Needs at least ${tradingConfig.minimumTradesForValidation} trades for validation.`);
  }

  if (metrics.profitFactor < tradingConfig.minimumProfitFactorForPaperTrading) {
    rejectionReasons.push(`Profit factor must be >= ${tradingConfig.minimumProfitFactorForPaperTrading}.`);
  }

  if (metrics.maxDrawdownPercent > tradingConfig.maxDrawdownBeforeStopPercent) {
    rejectionReasons.push(`Max drawdown must be <= ${tradingConfig.maxDrawdownBeforeStopPercent}%.`);
  }

  if (metrics.expectancy <= 0) {
    rejectionReasons.push("Expectancy must be positive.");
  }

  if (metrics.winRate < tradingConfig.minimumWinRateForPaperTrading) {
    rejectionReasons.push(`Win rate must be >= ${tradingConfig.minimumWinRateForPaperTrading}%.`);
  }

  return {
    approved: rejectionReasons.length === 0,
    rejectionReasons,
  };
}

export function riskRulesMarkdown(): string {
  return [
    `- Initial capital: $${tradingConfig.initialCapital}`,
    `- Max risk per trade: ${tradingConfig.maxRiskPerTradePercent}%`,
    `- Max daily loss: ${tradingConfig.maxDailyLossPercent}%`,
    `- Max weekly loss: ${tradingConfig.maxWeeklyLossPercent}%`,
    `- Stop after drawdown: ${tradingConfig.maxDrawdownBeforeStopPercent}%`,
    `- Minimum profit factor: ${tradingConfig.minimumProfitFactorForPaperTrading}`,
    `- Minimum validation trades: ${tradingConfig.minimumTradesForValidation}`,
  ].join("\n");
}
