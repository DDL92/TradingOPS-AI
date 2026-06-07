import type { MarketCandle } from "../types/market.types";
import { calculateEMA, calculateNumberEma } from "./ema";

export type MacdValue = {
  macd: number;
  signal: number;
};

export type MacdSeriesValue = {
  macd: number;
  signal: number;
  histogram: number;
};

export function calculateMACD(closes: number[], fast = 12, slow = 26, signal = 9): MacdSeriesValue[] {
  const fastEma = calculateEMA(closes, fast);
  const slowEma = calculateEMA(closes, slow);
  const macdLine = closes.map((_, index) => {
    const fastValue = fastEma[index];
    const slowValue = slowEma[index];
    return fastValue === undefined || slowValue === undefined || Number.isNaN(fastValue) || Number.isNaN(slowValue)
      ? Number.NaN
      : fastValue - slowValue;
  });
  const validMacdValues = macdLine.filter((value) => !Number.isNaN(value));
  const signalValues = calculateEMA(validMacdValues, signal);
  let signalIndex = 0;

  return macdLine.map((macd) => {
    if (Number.isNaN(macd)) {
      return { macd: Number.NaN, signal: Number.NaN, histogram: Number.NaN };
    }

    const signalValue = signalValues[signalIndex] ?? Number.NaN;
    signalIndex += 1;

    return {
      macd,
      signal: signalValue,
      histogram: Number.isNaN(signalValue) ? Number.NaN : macd - signalValue,
    };
  });
}

export function calculateMacd(
  candles: MarketCandle[],
  index: number,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdValue | null {
  const closes = candles.slice(0, index + 1).map((candle) => candle.close);
  const macdSeries = calculateMACD(closes, fastPeriod, slowPeriod, signalPeriod);
  const value = macdSeries[index];

  if (!value || Number.isNaN(value.macd) || Number.isNaN(value.signal)) return null;

  return { macd: value.macd, signal: value.signal };
}
