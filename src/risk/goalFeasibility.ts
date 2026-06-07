export type FeasibilityCategory =
  | "POSSIBLE_BUT_NOT_GUARANTEED"
  | "AGGRESSIVE"
  | "VERY_AGGRESSIVE"
  | "EXTREME"
  | "NEARLY_IMPOSSIBLE_WITHOUT_EXTREME_RISK";

export type GoalFeasibilityResult = {
  capital: number;
  monthlyTarget: number;
  requiredMonthlyReturnPercent: number;
  feasibilityCategory: FeasibilityCategory;
  riskWarning: string;
  recommendedNextStep: string;
};

export function checkGoalFeasibility(capital: number, monthlyTarget: number): GoalFeasibilityResult {
  if (capital <= 0) {
    throw new Error("Capital must be greater than 0.");
  }

  if (monthlyTarget <= 0) {
    throw new Error("Monthly target must be greater than 0.");
  }

  const requiredMonthlyReturnPercent = (monthlyTarget / capital) * 100;
  const feasibilityCategory = classifyFeasibility(requiredMonthlyReturnPercent);
  const isExtreme = requiredMonthlyReturnPercent > 25;

  return {
    capital,
    monthlyTarget,
    requiredMonthlyReturnPercent: round(requiredMonthlyReturnPercent),
    feasibilityCategory,
    riskWarning: getRiskWarning(feasibilityCategory),
    recommendedNextStep: isExtreme
      ? "Run simulations, backtesting, trade-history analysis, and risk audits only. Do not use real money for this target."
      : "Validate with backtesting, persistent paper simulation, and risk audits only. Real-money trading remains disabled.",
  };
}

function classifyFeasibility(requiredMonthlyReturnPercent: number): FeasibilityCategory {
  if (requiredMonthlyReturnPercent <= 3) return "POSSIBLE_BUT_NOT_GUARANTEED";
  if (requiredMonthlyReturnPercent <= 10) return "AGGRESSIVE";
  if (requiredMonthlyReturnPercent <= 25) return "VERY_AGGRESSIVE";
  if (requiredMonthlyReturnPercent <= 100) return "EXTREME";
  return "NEARLY_IMPOSSIBLE_WITHOUT_EXTREME_RISK";
}

function getRiskWarning(category: FeasibilityCategory): string {
  switch (category) {
    case "POSSIBLE_BUT_NOT_GUARANTEED":
      return "Potentially realistic only with verified edge, risk control, and no profit guarantee.";
    case "AGGRESSIVE":
      return "Aggressive target that requires strong evidence and disciplined risk limits.";
    case "VERY_AGGRESSIVE":
      return "Very aggressive target with high chance of unacceptable drawdown.";
    case "EXTREME":
      return "Extreme target. Simulation-only research is recommended.";
    case "NEARLY_IMPOSSIBLE_WITHOUT_EXTREME_RISK":
      return "Nearly impossible without extreme risk. This project must not promise profit or execute real trades.";
  }
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
