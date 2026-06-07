import { BreakoutStrategy } from "./breakout.strategy";
import { EmaCrossoverStrategy } from "./emaCrossover.strategy";
import { RsiMeanReversionStrategy } from "./rsiMeanReversion.strategy";
import type { Strategy } from "../types/strategy.types";

export const strategies: Strategy[] = [
  new RsiMeanReversionStrategy(),
  new EmaCrossoverStrategy(),
  new BreakoutStrategy(),
];

export function getStrategyByKey(key: string): Strategy {
  const strategy = strategies.find((candidate) => candidate.key === key.toLowerCase());

  if (!strategy) {
    throw new Error(`Unknown strategy "${key}". Available strategies: ${strategies.map((item) => item.key).join(", ")}`);
  }

  return strategy;
}
