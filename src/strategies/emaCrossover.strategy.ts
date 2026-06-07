import { calculateEmaAt } from "../indicators";
import type { MarketCandle } from "../types/market.types";
import type { Strategy, StrategySignal } from "../types/strategy.types";

export class EmaCrossoverStrategy implements Strategy {
  name = "EMA 9/21 Crossover";
  key = "ema";

  generateSignal(candles: MarketCandle[], index: number): StrategySignal {
    if (index < 22) {
      return { action: "HOLD", reason: "Not enough candles for EMA crossover.", confidence: 0 };
    }

    const previousFast = calculateEmaAt(candles, index - 1, 9);
    const previousSlow = calculateEmaAt(candles, index - 1, 21);
    const currentFast = calculateEmaAt(candles, index, 9);
    const currentSlow = calculateEmaAt(candles, index, 21);

    if ([previousFast, previousSlow, currentFast, currentSlow].some((value) => value === null)) {
      return { action: "HOLD", reason: "EMA values are not ready.", confidence: 0 };
    }

    const prevFast = previousFast as number;
    const prevSlow = previousSlow as number;
    const fast = currentFast as number;
    const slow = currentSlow as number;

    if (prevFast <= prevSlow && fast > slow) {
      return { action: "BUY", reason: "EMA 9 crossed above EMA 21.", confidence: crossoverConfidence(fast, slow) };
    }

    if (prevFast >= prevSlow && fast < slow) {
      return { action: "SELL", reason: "EMA 9 crossed below EMA 21.", confidence: crossoverConfidence(fast, slow) };
    }

    return { action: "HOLD", reason: "No EMA crossover.", confidence: 0.3 };
  }
}

function crossoverConfidence(fast: number, slow: number): number {
  const spreadPercent = Math.abs(fast - slow) / slow;
  return Number(Math.min(0.9, 0.55 + spreadPercent * 15).toFixed(2));
}
