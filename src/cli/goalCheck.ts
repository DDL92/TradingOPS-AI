import { Command } from "commander";
import { z } from "zod";
import { checkGoalFeasibility } from "../risk/goalFeasibility";
import { writeJsonReport, writeMarkdownReport } from "../reports/reportBuilder";

const optionsSchema = z.object({
  capital: z.coerce.number().positive(),
  target: z.coerce.number().positive(),
});

const program = new Command();

program
  .name("goal:check")
  .description("Check whether a monthly profit target is mathematically feasible for the available capital.")
  .requiredOption("--capital <amount>", "Starting capital in USD")
  .requiredOption("--target <amount>", "Monthly profit target in USD")
  .action((rawOptions) => {
    const options = optionsSchema.parse(rawOptions);
    const result = checkGoalFeasibility(options.capital, options.target);

    writeJsonReport("output/reports/goal-feasibility.json", result);
    writeMarkdownReport("output/reports/goal-feasibility.md", goalMarkdown(result));

    console.log(JSON.stringify(result, null, 2));
    console.log("Reports written to output/reports/goal-feasibility.json and output/reports/goal-feasibility.md");
  });

program.parse();

function goalMarkdown(result: ReturnType<typeof checkGoalFeasibility>): string {
  return `# Goal Feasibility Report

## Inputs
- Capital: $${result.capital}
- Monthly target: $${result.monthlyTarget}
- Required monthly return: ${result.requiredMonthlyReturnPercent}%

## Feasibility
- Category: ${result.feasibilityCategory}
- Risk warning: ${result.riskWarning}
- Recommended next step: ${result.recommendedNextStep}

## Safety
This project is for simulation, backtesting, and research only. It does not guarantee profit and must not execute real trades.
`;
}
