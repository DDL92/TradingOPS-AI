import type { MarketCandle } from "../types/market.types";
import type { Strategy, StrategySignal } from "../types/strategy.types";

export class MacdConfirmationStrategy implements Strategy {
  name = "MACD Confirmation";
  key = "macd";

  generateSignal(candles: MarketCandle[], index: number): StrategySignal {
    if (index < 35) {
      return { action: "HOLD", reason: "Not enough candles for MACD confirmation.", confidence: 0 };
    }

    const previous = calculateMacd(candles, index - 1);
    const current = calculateMacd(candles, index);

    if (!previous || !current) {
      return { action: "HOLD", reason: "MACD values are not ready.", confidence: 0 };
    }

    if (previous.macd <= previous.signal && current.macd > current.signal) {
      return {
        action: "BUY",
        reason: "MACD crossed above signal line.",
        confidence: macdConfidence(current.macd, current.signal),
      };
    }

    if (previous.macd >= previous.signal && current.macd < current.signal) {
      return {
        action: "SELL",
        reason: "MACD crossed below signal line.",
        confidence: macdConfidence(current.macd, current.signal),
      };
    }

    return { action: "HOLD", reason: "No MACD confirmation crossover.", confidence: 0.3 };
  }
}

function calculateMacd(candles: MarketCandle[], index: number): { macd: number; signal: number } | null {
  const macdSeries: number[] = [];

  for (let cursor = 25; cursor <= index; cursor += 1) {
    const ema12 = calculateEmaAt(candles, cursor, 12);
    const ema26 = calculateEmaAt(candles, cursor, 26);
    if (ema12 === null || ema26 === null) return null;
    macdSeries.push(ema12 - ema26);
  }

  if (macdSeries.length < 9) return null;

  return {
    macd: macdSeries[macdSeries.length - 1] ?? 0,
    signal: calculateNumberEma(macdSeries, 9),
  };
}

function calculateEmaAt(candles: MarketCandle[], index: number, period: number): number | null {
  if (index < period - 1) return null;

  const smoothing = 2 / (period + 1);
  let ema = average(candles.slice(0, period).map((candle) => candle.close));

  for (let cursor = period; cursor <= index; cursor += 1) {
    const candle = candles[cursor];
    if (!candle) return null;
    ema = candle.close * smoothing + ema * (1 - smoothing);
  }

  return ema;
}

function calculateNumberEma(values: number[], period: number): number {
  const smoothing = 2 / (period + 1);
  let ema = average(values.slice(0, period));

  for (let index = period; index < values.length; index += 1) {
    ema = (values[index] ?? ema) * smoothing + ema * (1 - smoothing);
  }

  return ema;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function macdConfidence(macd: number, signal: number): number {
  const spread = Math.abs(macd - signal);
  return Number(Math.min(0.9, 0.55 + spread / 250).toFixed(2));
}
