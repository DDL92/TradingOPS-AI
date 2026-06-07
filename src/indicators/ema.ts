import type { MarketCandle } from "../types/market.types";

export function calculateEMA(values: number[], period: number): number[] {
  if (values.length < period) return [];

  const emaValues: number[] = [];
  let ema = calculateAverage(values.slice(0, period));
  const smoothing = 2 / (period + 1);

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === undefined) continue;

    if (index < period - 1) {
      emaValues.push(Number.NaN);
      continue;
    }

    if (index === period - 1) {
      emaValues.push(ema);
      continue;
    }

    ema = value * smoothing + ema * (1 - smoothing);
    emaValues.push(ema);
  }

  return emaValues;
}

export function calculateEmaAt(candles: MarketCandle[], index: number, period: number): number | null {
  const emaValues = calculateEMA(
    candles.slice(0, index + 1).map((candle) => candle.close),
    period,
  );
  const value = emaValues[index];
  return value === undefined || Number.isNaN(value) ? null : value;
}

export function calculateNumberEma(values: number[], period: number): number | null {
  const emaValues = calculateEMA(values, period);
  const value = emaValues[emaValues.length - 1];
  return value === undefined || Number.isNaN(value) ? null : value;
}

function calculateAverage(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
