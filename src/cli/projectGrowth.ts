import { Command } from "commander";
import { z } from "zod";
import { projectGrowth, type GrowthProjectionResult } from "../backtesting/growthProjection";
import { writeAndLogJsonReports } from "./cliOutput";

const optionsSchema = z.object({
  capital: z.coerce.number().positive(),
  target: z.coerce.number().positive(),
  months: z.coerce.number().int().positive(),
});

const program = new Command();

program
  .name("growth:project")
  .description("Project required returns and risk constraints for a capital growth target.")
  .requiredOption("--capital <amount>", "Starting capital")
  .requiredOption("--target <amount>", "Target capital")
  .requiredOption("--months <count>", "Projection length in months")
  .action((rawOptions) => {
    const options = optionsSchema.parse(rawOptions);
    const result = projectGrowth(options.capital, options.target, options.months);

    writeAndLogJsonReports({
      jsonPath: "output/reports/growth-projection.json",
      markdownPath: "output/reports/growth-projection.md",
      data: result,
      markdown: growthMarkdown(result),
    });
  });

program.parse();

function growthMarkdown(result: GrowthProjectionResult): string {
  return `# Growth Projection

Mode: simulation only. Real trading is disabled.

## Inputs
- Capital: $${result.capital}
- Target: $${result.target}
- Months: ${result.months}

## Required Returns
- Required total return: ${result.requiredTotalReturnPercent}%
- Required monthly return: ${result.requiredMonthlyReturnPercent}%
- Required weekly return: ${result.requiredWeeklyReturnPercent}%
- Required daily return approximation: ${result.requiredDailyReturnPercent}%
- Feasibility category: ${result.feasibilityCategory}

## Risk Explanation
${result.riskExplanation}

## Safer Milestone Plan
${result.saferMilestonePlan.map((step) => `- ${step}`).join("\n")}
`;
}
