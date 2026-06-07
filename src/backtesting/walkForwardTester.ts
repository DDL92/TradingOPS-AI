import { runBacktest } from "./backtestEngine";
import type { BacktestResult } from "../types/backtest.types";
import type { MarketCandle } from "../types/market.types";
import type { Strategy } from "../types/strategy.types";

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
};

export type WalkForwardResult = {
  symbol: string;
  strategy: string;
  trainingWindow: number;
  testingWindow: number;
  numberOfWindows: number;
  averageReturn: number;
  averageDrawdown: number;
  profitableWindowsPercent: number;
  consistencyScore: number;
  approvedForFurtherTesting: boolean;
  rejectionReasons: string[];
  windows: WalkForwardWindowResult[];
};

export function runWalkForwardTest(
  candles: MarketCandle[],
  strategy: Strategy,
  trainingWindow = 60,
  testingWindow = 20,
  initialCapital = 100,
): WalkForwardResult {
  const windows: WalkForwardWindowResult[] = [];

  for (let start = 0; start + trainingWindow + testingWindow <= candles.length; start += testingWindow) {
    const trainingCandles = candles.slice(start, start + trainingWindow);
    const testingCandles = candles.slice(start + trainingWindow, start + trainingWindow + testingWindow);
    const warmTestingCandles = [...trainingCandles, ...testingCandles];
    const result = runBacktest(warmTestingCandles, strategy, initialCapital);

    windows.push(toWindowResult(windows.length + 1, trainingCandles, testingCandles, result));
  }

  const averageReturn = average(windows.map((window) => window.returnPercent));
  const averageDrawdown = average(windows.map((window) => window.maxDrawdownPercent));
  const profitableWindowsPercent =
    windows.length === 0 ? 0 : (windows.filter((window) => window.profitable).length / windows.length) * 100;
  const consistencyScore = Math.round(
    clamp(profitableWindowsPercent * 0.6 + Math.max(0, 40 - averageDrawdown * 2), 0, 100),
  );
  const rejectionReasons = buildRejectionReasons(profitableWindowsPercent, averageDrawdown, averageReturn);

  return {
    symbol: candles[0]?.symbol ?? "UNKNOWN",
    strategy: strategy.key,
    trainingWindow,
    testingWindow,
    numberOfWindows: windows.length,
    averageReturn: round(averageReturn),
    averageDrawdown: round(averageDrawdown),
    profitableWindowsPercent: round(profitableWindowsPercent),
    consistencyScore,
    approvedForFurtherTesting: rejectionReasons.length === 0,
    rejectionReasons,
    windows,
  };
}

function toWindowResult(
  window: number,
  trainingCandles: MarketCandle[],
  testingCandles: MarketCandle[],
  result: BacktestResult,
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
  };
}

function buildRejectionReasons(profitableWindowsPercent: number, averageDrawdown: number, averageReturn: number): string[] {
  const reasons: string[] = [];

  if (profitableWindowsPercent < 50) reasons.push("Profitable windows must be at least 50%.");
  if (averageDrawdown > 15) reasons.push("Average drawdown must be <= 15%.");
  if (averageReturn <= 0) reasons.push("Average return must be positive.");

  return reasons;
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
