import { tradingConfig } from "../config/tradingConfig";
import { calculateBacktestMetrics } from "./metricsCalculator";
import { evaluatePaperTradingApproval } from "../risk/riskRules";
import type { BacktestResult } from "../types/backtest.types";
import type { MarketCandle } from "../types/market.types";
import type { Strategy } from "../types/strategy.types";
import type { Trade } from "../types/trade.types";

type OpenPosition = {
  entryDate: string;
  entryPrice: number;
  quantity: number;
  allocatedCapital: number;
};

export function runBacktest(
  candles: MarketCandle[],
  strategy: Strategy,
  initialCapital: number = tradingConfig.initialCapital,
): BacktestResult {
  if (candles.length === 0) {
    throw new Error("Backtest requires at least one candle.");
  }

  const symbol = candles[0]?.symbol ?? "UNKNOWN";
  let cash = initialCapital;
  let openPosition: OpenPosition | null = null;
  const trades: Trade[] = [];
  const equityCurve: number[] = [initialCapital];

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    if (!candle) continue;

    const signal = strategy.generateSignal(candles, index);

    if (signal.action === "BUY" && openPosition === null) {
      const allocatedCapital = cash * (tradingConfig.positionSizePercent / 100);
      if (allocatedCapital > 0) {
        openPosition = {
          entryDate: candle.date,
          entryPrice: candle.close,
          quantity: allocatedCapital / candle.close,
          allocatedCapital,
        };
        cash -= allocatedCapital;
      }
    }

    if (signal.action === "SELL" && openPosition !== null) {
      const trade = closePosition(symbol, strategy.key, openPosition, candle, trades.length + 1);
      cash += openPosition.allocatedCapital + trade.pnl;
      trades.push(trade);
      openPosition = null;
    }

    const openValue = openPosition ? openPosition.quantity * candle.close : 0;
    equityCurve.push(round(cash + openValue));
  }

  const finalCandle = candles[candles.length - 1];
  if (openPosition && finalCandle) {
    const trade = closePosition(symbol, strategy.key, openPosition, finalCandle, trades.length + 1);
    cash += openPosition.allocatedCapital + trade.pnl;
    trades.push(trade);
    equityCurve.push(round(cash));
  }

  const finalCapital = round(cash);
  const metrics = calculateBacktestMetrics(trades, initialCapital, finalCapital, equityCurve);
  const approval = evaluatePaperTradingApproval(metrics);

  return {
    symbol,
    strategy: strategy.key,
    initialCapital,
    finalCapital,
    ...metrics,
    approvedForPaperTrading: approval.approved,
    rejectionReasons: approval.rejectionReasons,
    trades,
  };
}

function closePosition(
  symbol: string,
  strategy: string,
  position: OpenPosition,
  exitCandle: MarketCandle,
  sequence: number,
): Trade {
  const exitValue = position.quantity * exitCandle.close;
  const pnl = exitValue - position.allocatedCapital;
  const pnlPercent = (pnl / position.allocatedCapital) * 100;

  return {
    id: `${strategy}-${sequence.toString().padStart(3, "0")}`,
    symbol,
    strategy,
    direction: "long",
    entryDate: position.entryDate,
    exitDate: exitCandle.date,
    entryPrice: round(position.entryPrice),
    exitPrice: round(exitCandle.close),
    quantity: Number(position.quantity.toFixed(8)),
    pnl: round(pnl),
    pnlPercent: round(pnlPercent),
    result: pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven",
  };
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
