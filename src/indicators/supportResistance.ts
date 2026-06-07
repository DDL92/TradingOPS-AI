import type { MarketCandle } from "../types/market.types";

export type SupportResistanceLevels = {
  support: number;
  resistance: number;
};

export function getSupportResistance(
  candles: MarketCandle[],
  index: number,
  lookback: number,
): SupportResistanceLevels | null {
  const window = candles.slice(index - lookback, index);
  if (window.length < lookback) return null;

  return {
    support: Math.min(...window.map((candle) => candle.low)),
    resistance: Math.max(...window.map((candle) => candle.high)),
  };
}

export const calculateSupportResistance = getSupportResistance;

export function isWithinPercent(value: number, target: number, percent: number): boolean {
  return Math.abs(value - target) / target <= percent / 100;
}
