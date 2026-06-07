export type DrawdownGuardResult = {
  allowedToContinue: boolean;
  currentDrawdownPercent: number;
  maxAllowedDrawdownPercent: number;
  message: string;
};

export function evaluateDrawdownGuard(
  currentEquity: number,
  peakEquity: number,
  maxAllowedDrawdownPercent = 15,
): DrawdownGuardResult {
  const currentDrawdownPercent = peakEquity <= 0 ? 0 : ((peakEquity - currentEquity) / peakEquity) * 100;
  const allowedToContinue = currentDrawdownPercent < maxAllowedDrawdownPercent;

  return {
    allowedToContinue,
    currentDrawdownPercent: Number(currentDrawdownPercent.toFixed(2)),
    maxAllowedDrawdownPercent,
    message: allowedToContinue
      ? "Drawdown is inside simulation guardrails."
      : "Stop system: drawdown protection threshold reached.",
  };
}
