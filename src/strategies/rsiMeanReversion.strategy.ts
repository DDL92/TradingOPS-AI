import type { Strategy, StrategySignal } from "../types/strategy.types";
import type { MarketCandle } from "../types/market.types";

export class RsiMeanReversionStrategy implements Strategy {
  name = "RSI Mean Reversion";
  key = "rsi";

  generateSignal(candles: MarketCandle[], index: number): StrategySignal {
    const rsi = calculateRsi(candles, index, 14);

    if (rsi === null) {
      return { action: "HOLD", reason: "Not enough candles to calculate RSI.", confidence: 0 };
    }

    if (rsi < 30) {
      return { action: "BUY", reason: `RSI ${rsi.toFixed(2)} is below 30.`, confidence: normalizeConfidence(30 - rsi, 30) };
    }

    if (rsi > 55) {
      return { action: "SELL", reason: `RSI ${rsi.toFixed(2)} is above 55.`, confidence: normalizeConfidence(rsi - 55, 45) };
    }

    return { action: "HOLD", reason: `RSI ${rsi.toFixed(2)} is neutral.`, confidence: 0.35 };
  }
}

function calculateRsi(candles: MarketCandle[], index: number, period: number): number | null {
  if (index < period) return null;

  let gains = 0;
  let losses = 0;

  for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
    const current = candles[cursor];
    const previous = candles[cursor - 1];
    if (!current || !previous) return null;

    const change = current.close - previous.close;
    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const averageGain = gains / period;
  const averageLoss = losses / period;

  if (averageLoss === 0) return 100;

  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

function normalizeConfidence(value: number, divisor: number): number {
  return Number(Math.min(0.95, 0.55 + value / divisor).toFixed(2));
}
