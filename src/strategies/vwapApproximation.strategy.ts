import type { MarketCandle } from "../types/market.types";
import type { Strategy, StrategySignal } from "../types/strategy.types";

export class VwapApproximationStrategy implements Strategy {
  name = "VWAP Approximation";
  key = "vwap";

  generateSignal(candles: MarketCandle[], index: number): StrategySignal {
    if (index < 2) {
      return { action: "HOLD", reason: "Not enough candles for VWAP crossover.", confidence: 0 };
    }

    const previousClose = candles[index - 1]?.close;
    const currentClose = candles[index]?.close;
    const previousVwap = calculateVwap(candles, index - 1);
    const currentVwap = calculateVwap(candles, index);

    if (!previousClose || !currentClose || previousVwap === null || currentVwap === null) {
      return { action: "HOLD", reason: "VWAP values are not ready.", confidence: 0 };
    }

    if (previousClose <= previousVwap && currentClose > currentVwap) {
      return {
        action: "BUY",
        reason: "Close crossed above approximate VWAP.",
        confidence: vwapConfidence(currentClose, currentVwap),
      };
    }

    if (previousClose >= previousVwap && currentClose < currentVwap) {
      return {
        action: "SELL",
        reason: "Close crossed below approximate VWAP.",
        confidence: vwapConfidence(currentClose, currentVwap),
      };
    }

    return { action: "HOLD", reason: "No VWAP crossover.", confidence: 0.28 };
  }
}

function calculateVwap(candles: MarketCandle[], index: number): number | null {
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;

  for (let cursor = 0; cursor <= index; cursor += 1) {
    const candle = candles[cursor];
    if (!candle) return null;
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTypicalVolume += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
  }

  return cumulativeVolume === 0 ? null : cumulativeTypicalVolume / cumulativeVolume;
}

function vwapConfidence(close: number, vwap: number): number {
  const distance = Math.abs(close - vwap) / vwap;
  return Number(Math.min(0.88, 0.55 + distance * 20).toFixed(2));
}
