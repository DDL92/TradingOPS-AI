import type { MarketCandle } from "../types/market.types";

export function calculateVWAP(candles: MarketCandle[]): number[] {
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;

  return candles.map((candle) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTypicalVolume += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
    return cumulativeVolume === 0 ? Number.NaN : cumulativeTypicalVolume / cumulativeVolume;
  });
}

export function calculateVwap(candles: MarketCandle[], index: number): number | null {
  const vwapValues = calculateVWAP(candles.slice(0, index + 1));
  const value = vwapValues[index];
  return value === undefined || Number.isNaN(value) ? null : value;
}
