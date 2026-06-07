import { tradingConfig } from "../config/tradingConfig";
import type { BacktestResult } from "../types/backtest.types";

export type CapitalProtectionResult = {
  mode: "simulation only";
  realTradingEnabled: false;
  approved: boolean;
  messages: string[];
};

export function evaluateCapitalProtection(result: BacktestResult): CapitalProtectionResult {
  const messages = [
    "Mode: simulation only. Real trading is disabled.",
    `Never risk more than ${tradingConfig.maxRiskPerTradePercent}% per trade with a $100 account.`,
  ];

  if (result.maxDrawdownPercent >= tradingConfig.maxDrawdownBeforeStopPercent) {
    messages.push(`Stop system if drawdown >= ${tradingConfig.maxDrawdownBeforeStopPercent}%.`);
  }

  if (result.totalTrades < tradingConfig.minimumTradesForValidation) {
    messages.push(`Do not approve strategy with fewer than ${tradingConfig.minimumTradesForValidation} trades.`);
  }

  if (result.expectancy <= 0 || result.totalTrades < 30) {
    messages.push("Do not scale position size unless the last 30 trades show positive expectancy.");
  }

  messages.push("Sprint 2 cannot recommend real trading.");

  return {
    mode: "simulation only",
    realTradingEnabled: false,
    approved: false,
    messages,
  };
}
