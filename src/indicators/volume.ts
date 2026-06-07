import type { MarketCandle } from "../types/market.types";

export function averageVolume(candles: MarketCandle[], index: number, lookback: number): number | null {
  const window = candles.slice(index - lookback, index);
  if (window.length < lookback) return null;

  return window.reduce((sum, candle) => sum + candle.volume, 0) / window.length;
}

export const calculateAverageVolume = averageVolume;
