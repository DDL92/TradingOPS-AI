export const tradingConfig = {
  initialCapital: 100,
  positionSizePercent: 25,
  maxRiskPerTradePercent: 2,
  maxDailyLossPercent: 5,
  maxWeeklyLossPercent: 10,
  maxDrawdownBeforeStopPercent: 15,
  minimumProfitFactorForPaperTrading: 1.3,
  minimumTradesForValidation: 20,
  minimumWinRateForPaperTrading: 40,
} as const;
