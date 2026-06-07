import type { MarketCandle } from "../types/market.types";
import type { Strategy, StrategySignal } from "../types/strategy.types";

export class BreakoutStrategy implements Strategy {
  name = "20/10 Breakout";
  key = "breakout";

  generateSignal(candles: MarketCandle[], index: number): StrategySignal {
    if (index < 20) {
      return { action: "HOLD", reason: "Not enough candles for breakout levels.", confidence: 0 };
    }

    const previousTwenty = candles.slice(index - 20, index);
    const previousTen = candles.slice(index - 10, index);
    const current = candles[index];

    if (!current || previousTwenty.length < 20 || previousTen.length < 10) {
      return { action: "HOLD", reason: "Breakout windows are incomplete.", confidence: 0 };
    }

    const priorHigh = Math.max(...previousTwenty.map((candle) => candle.high));
    const priorLow = Math.min(...previousTen.map((candle) => candle.low));

    if (current.close > priorHigh) {
      return {
        action: "BUY",
        reason: `Close ${current.close} broke above 20-candle high ${priorHigh.toFixed(2)}.`,
        confidence: breakoutConfidence(current.close, priorHigh),
      };
    }

    if (current.close < priorLow) {
      return {
        action: "SELL",
        reason: `Close ${current.close} broke below 10-candle low ${priorLow.toFixed(2)}.`,
        confidence: breakoutConfidence(priorLow, current.close),
      };
    }

    return { action: "HOLD", reason: "No breakout.", confidence: 0.25 };
  }
}

function breakoutConfidence(upper: number, lower: number): number {
  const distancePercent = Math.abs(upper - lower) / lower;
  return Number(Math.min(0.92, 0.58 + distancePercent * 12).toFixed(2));
}
