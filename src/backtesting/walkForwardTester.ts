import { tradingConfig } from "../config/tradingConfig";
import { calculateBacktestMetrics } from "./metricsCalculator";
import type { MarketCandle } from "../types/market.types";
import type { Strategy } from "../types/strategy.types";
import type { Trade } from "../types/trade.types";

export type WalkForwardWindowResult = {
  window: number;
  trainingStart: string;
  trainingEnd: string;
  testingStart: string;
  testingEnd: string;
  returnPercent: number;
  maxDrawdownPercent: number;
  totalTrades: number;
  profitable: boolean;
  warning?: string;
};

export type WalkForwardResult = {
  symbol: string;
  strategy: string;
  trainingWindow: number;
  testingWindow: number;
  trainingWindowSize: number;
  testingWindowSize: number;
  numberOfWindows: number;
  profitableWindows: number;
  averageReturn: number;
  averageDrawdown: number;
  profitableWindowsPercent: number;
  profitableWindowPercent: number;
  consistencyScore: number;
  approvedForFurtherTesting: boolean;
  rejectionReasons: string[];
  warnings: string[];
  windows: WalkForwardWindowResult[];
};

export function runWalkForwardTest(
  candles: MarketCandle[],
  strategy: Strategy,
  trainingWindow = tradingConfig.walkForwardTrainingWindow,
  testingWindow = tradingConfig.walkForwardTestingWindow,
  initialCapital = tradingConfig.initialCapital,
): WalkForwardResult {
  const windows: WalkForwardWindowResult[] = [];

  for (let start = 0; start + trainingWindow + testingWindow <= candles.length; start += testingWindow) {
    const trainingCandles = candles.slice(start, start + trainingWindow);
    const testingCandles = candles.slice(start + trainingWindow, start + trainingWindow + testingWindow);
    const warmTestingCandles = [...trainingCandles, ...testingCandles];
    const result = runTestWindowOnlyBacktest(warmTestingCandles, strategy, trainingCandles.length, initialCapital);

    windows.push(toWindowResult(windows.length + 1, trainingCandles, testingCandles, result));
  }

  const averageReturn = average(windows.map((window) => window.returnPercent));
  const averageDrawdown = average(windows.map((window) => window.maxDrawdownPercent));
  const profitableWindows = windows.filter((window) => window.profitable).length;
  const profitableWindowsPercent =
    windows.length === 0 ? 0 : (profitableWindows / windows.length) * 100;
  const consistencyScore = Math.round(
    clamp(profitableWindowsPercent * 0.6 + Math.max(0, 40 - averageDrawdown * 2), 0, 100),
  );
  const rejectionReasons = buildRejectionReasons(profitableWindowsPercent, averageDrawdown, averageReturn);
  const warnings = buildWarnings(windows);

  return {
    symbol: candles[0]?.symbol ?? "UNKNOWN",
    strategy: strategy.key,
    trainingWindow,
    testingWindow,
    trainingWindowSize: trainingWindow,
    testingWindowSize: testingWindow,
    numberOfWindows: windows.length,
    profitableWindows,
    averageReturn: round(averageReturn),
    averageDrawdown: round(averageDrawdown),
    profitableWindowsPercent: round(profitableWindowsPercent),
    profitableWindowPercent: round(profitableWindowsPercent),
    consistencyScore,
    approvedForFurtherTesting: rejectionReasons.length === 0,
    rejectionReasons,
    warnings,
    windows,
  };
}

function toWindowResult(
  window: number,
  trainingCandles: MarketCandle[],
  testingCandles: MarketCandle[],
  result: TestWindowBacktestResult,
): WalkForwardWindowResult {
  return {
    window,
    trainingStart: trainingCandles[0]?.date ?? "N/A",
    trainingEnd: trainingCandles[trainingCandles.length - 1]?.date ?? "N/A",
    testingStart: testingCandles[0]?.date ?? "N/A",
    testingEnd: testingCandles[testingCandles.length - 1]?.date ?? "N/A",
    returnPercent: result.totalReturnPercent,
    maxDrawdownPercent: result.maxDrawdownPercent,
    totalTrades: result.totalTrades,
    profitable: result.totalReturnPercent > 0,
    ...(result.totalTrades < 3 ? { warning: "Low trade count in this test window." } : {}),
  };
}

type TestPosition = {
  entryDate: string;
  entryPrice: number;
  quantity: number;
  allocatedCapital: number;
};

type TestWindowBacktestResult = {
  totalReturnPercent: number;
  maxDrawdownPercent: number;
  totalTrades: number;
};

function runTestWindowOnlyBacktest(
  warmCandles: MarketCandle[],
  strategy: Strategy,
  testStartIndex: number,
  initialCapital: number,
): TestWindowBacktestResult {
  const symbol = warmCandles[0]?.symbol ?? "UNKNOWN";
  let cash = initialCapital;
  let openPosition: TestPosition | null = null;
  const trades: Trade[] = [];
  const equityCurve: number[] = [initialCapital];

  for (let index = testStartIndex; index < warmCandles.length; index += 1) {
    const candle = warmCandles[index];
    if (!candle) continue;

    const signal = strategy.generateSignal(warmCandles, index);

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
      const trade = closeTestPosition(symbol, strategy.key, openPosition, candle, trades.length + 1);
      cash += openPosition.allocatedCapital + trade.pnl;
      trades.push(trade);
      openPosition = null;
    }

    const openValue = openPosition ? openPosition.quantity * candle.close : 0;
    equityCurve.push(round(cash + openValue));
  }

  const finalCandle = warmCandles[warmCandles.length - 1];
  if (openPosition && finalCandle) {
    const trade = closeTestPosition(symbol, strategy.key, openPosition, finalCandle, trades.length + 1);
    cash += openPosition.allocatedCapital + trade.pnl;
    trades.push(trade);
    equityCurve.push(round(cash));
  }

  const metrics = calculateBacktestMetrics(trades, initialCapital, round(cash), equityCurve);

  return {
    totalReturnPercent: metrics.totalReturnPercent,
    maxDrawdownPercent: metrics.maxDrawdownPercent,
    totalTrades: metrics.totalTrades,
  };
}

function closeTestPosition(
  symbol: string,
  strategy: string,
  position: TestPosition,
  exitCandle: MarketCandle,
  sequence: number,
): Trade {
  const exitValue = position.quantity * exitCandle.close;
  const pnl = exitValue - position.allocatedCapital;

  return {
    id: `walkforward-${strategy}-${sequence.toString().padStart(3, "0")}`,
    symbol,
    strategy,
    direction: "long",
    entryDate: position.entryDate,
    exitDate: exitCandle.date,
    entryPrice: round(position.entryPrice),
    exitPrice: round(exitCandle.close),
    quantity: Number(position.quantity.toFixed(8)),
    pnl: round(pnl),
    pnlPercent: round((pnl / position.allocatedCapital) * 100),
    result: pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven",
  };
}

function buildRejectionReasons(profitableWindowsPercent: number, averageDrawdown: number, averageReturn: number): string[] {
  const reasons: string[] = [];

  if (profitableWindowsPercent < 50) reasons.push("Profitable windows must be at least 50%.");
  if (averageDrawdown > tradingConfig.maxDrawdownBeforeStopPercent) {
    reasons.push(`Average drawdown must be <= ${tradingConfig.maxDrawdownBeforeStopPercent}%.`);
  }
  if (averageReturn <= 0) reasons.push("Average return must be positive.");

  return reasons;
}

function buildWarnings(windows: WalkForwardWindowResult[]): string[] {
  const warnings: string[] = [];
  const totalTrades = windows.reduce((sum, window) => sum + window.totalTrades, 0);

  if (windows.length < 3) warnings.push("Walk-forward sample has fewer than 3 windows.");
  if (totalTrades < tradingConfig.monteCarloMinimumTrades) {
    warnings.push("Walk-forward test has a very low trade sample across test windows.");
  }

  return warnings;
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
