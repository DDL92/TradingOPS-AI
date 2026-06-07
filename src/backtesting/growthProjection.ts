import { checkGoalFeasibility, type FeasibilityCategory } from "../risk/goalFeasibility";

export type GrowthProjectionResult = {
  capital: number;
  target: number;
  months: number;
  requiredTotalReturnPercent: number;
  requiredMonthlyReturnPercent: number;
  requiredWeeklyReturnPercent: number;
  requiredDailyReturnPercent: number;
  feasibilityCategory: FeasibilityCategory;
  riskExplanation: string;
  saferMilestonePlan: string[];
  mode: "simulation only";
};

export function projectGrowth(capital: number, target: number, months: number): GrowthProjectionResult {
  if (capital <= 0) throw new Error("Capital must be greater than 0.");
  if (target <= capital) throw new Error("Target must be greater than capital.");
  if (months <= 0) throw new Error("Months must be greater than 0.");

  const requiredTotalReturnPercent = ((target - capital) / capital) * 100;
  const requiredMonthlyReturnPercent = (Math.pow(target / capital, 1 / months) - 1) * 100;
  const requiredWeeklyReturnPercent = (Math.pow(target / capital, 1 / (months * 4.345)) - 1) * 100;
  const requiredDailyReturnPercent = (Math.pow(target / capital, 1 / (months * 21)) - 1) * 100;
  const goalFeasibility = checkGoalFeasibility(capital, target - capital);

  return {
    capital,
    target,
    months,
    requiredTotalReturnPercent: round(requiredTotalReturnPercent),
    requiredMonthlyReturnPercent: round(requiredMonthlyReturnPercent),
    requiredWeeklyReturnPercent: round(requiredWeeklyReturnPercent),
    requiredDailyReturnPercent: round(requiredDailyReturnPercent),
    feasibilityCategory: goalFeasibility.feasibilityCategory,
    riskExplanation: buildRiskExplanation(requiredTotalReturnPercent),
    saferMilestonePlan: [
      "Month 1: validate system, no real money.",
      "Month 2: persistent paper simulation only.",
      "Month 3: continue forward paper validation. Real-money trading remains disabled.",
      "Month 4-6: review drawdown, expectancy, and journal quality in simulation only.",
    ],
    mode: "simulation only",
  };
}

function buildRiskExplanation(requiredTotalReturnPercent: number): string {
  if (requiredTotalReturnPercent >= 900) {
    return "This requires at least 900% total return and is highly unrealistic without extreme risk.";
  }

  if (requiredTotalReturnPercent > 100) {
    return "This requires more than doubling capital and should be treated as extreme until validated by data.";
  }

  return "This still requires positive expectancy, drawdown control, and repeated validation. Profit is not guaranteed.";
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
