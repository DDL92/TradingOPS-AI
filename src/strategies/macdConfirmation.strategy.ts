import { calculateMacd } from "../indicators";
import type { MarketCandle } from "../types/market.types";
import type { Strategy, StrategySignal } from "../types/strategy.types";

export class MacdConfirmationStrategy implements Strategy {
  name = "MACD Confirmation";
  key = "macd";

  generateSignal(candles: MarketCandle[], index: number): StrategySignal {
    if (index < 35) {
      return { action: "HOLD", reason: "Not enough candles for MACD confirmation.", confidence: 0 };
    }

    const previous = calculateMacd(candles, index - 1);
    const current = calculateMacd(candles, index);

    if (!previous || !current) {
      return { action: "HOLD", reason: "MACD values are not ready.", confidence: 0 };
    }

    if (previous.macd <= previous.signal && current.macd > current.signal) {
      return {
        action: "BUY",
        reason: "MACD crossed above signal line.",
        confidence: macdConfidence(current.macd, current.signal),
      };
    }

    if (previous.macd >= previous.signal && current.macd < current.signal) {
      return {
        action: "SELL",
        reason: "MACD crossed below signal line.",
        confidence: macdConfidence(current.macd, current.signal),
      };
    }

    return { action: "HOLD", reason: "No MACD confirmation crossover.", confidence: 0.3 };
  }
}

function macdConfidence(macd: number, signal: number): number {
  const spread = Math.abs(macd - signal);
  return Number(Math.min(0.9, 0.55 + spread / 250).toFixed(2));
}
