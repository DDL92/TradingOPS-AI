import type { MarketCandle } from "../types/market.types";

export function calculateRSI(closes: number[], period = 14): number[] {
  const values: number[] = [];

  for (let index = 0; index < closes.length; index += 1) {
    if (index < period) {
      values.push(Number.NaN);
      continue;
    }

    let gains = 0;
    let losses = 0;

    for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
      const current = closes[cursor];
      const previous = closes[cursor - 1];
      if (current === undefined || previous === undefined) {
        values.push(Number.NaN);
        continue;
      }

      const change = current - previous;
      if (change >= 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const averageGain = gains / period;
    const averageLoss = losses / period;

    if (averageLoss === 0) {
      values.push(100);
      continue;
    }

    const relativeStrength = averageGain / averageLoss;
    values.push(100 - 100 / (1 + relativeStrength));
  }

  return values;
}

export function calculateRsi(candles: MarketCandle[], index: number, period: number): number | null {
  const rsiValues = calculateRSI(
    candles.slice(0, index + 1).map((candle) => candle.close),
    period,
  );
  const value = rsiValues[index];
  return value === undefined || Number.isNaN(value) ? null : value;
}
