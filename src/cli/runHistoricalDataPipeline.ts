import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { Command } from "commander";
import { z } from "zod";
import { buildDatasetReadinessReport } from "../reports/datasetReadinessReport";
import { yahooSymbols } from "../data/yahooSymbolMap";
import { handleCliError, writeAndLogJsonReports } from "./cliOutput";

const optionsSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  interval: z.enum(["1d", "1wk", "1mo"]).default("1d"),
});

type PipelineStep = {
  name: string;
  success: boolean;
  output: string;
};

type PipelineReport = {
  mode: "simulation only";
  steps: PipelineStep[];
  availableSymbols: string[];
  readinessStatus: string;
  nextSteps: string[];
};

const program = new Command();

program
  .name("data:pipeline")
  .description("Run the full historical data pipeline for simulation-only research.")
  .option("--start <date>", "Start date YYYY-MM-DD")
  .option("--end <date>", "End date YYYY-MM-DD")
  .option("--interval <interval>", "Yahoo interval: 1d, 1wk, or 1mo", "1d")
  .action((rawOptions) => {
    try {
      const options = optionsSchema.parse(rawOptions);
      const steps: PipelineStep[] = [];
      const downloadArgs = ["run", "data:download:all", "--", "--interval", options.interval];
      if (options.start) downloadArgs.push("--start", options.start);
      if (options.end) downloadArgs.push("--end", options.end);

      steps.push(runNpm(downloadArgs, "Download all historical data"));
      steps.push(runNpm(["run", "data:validate:all"], "Validate all historical data"));

      const availableSymbols = yahooSymbols
        .map((symbol) => symbol.internalSymbol)
        .filter((symbol) => existsSync(join("data", "historical", `${symbol}.csv`)));

      for (const symbol of availableSymbols) {
        steps.push(runNpm(["run", "compare:strategies", "--", "--symbol", symbol, "--data", "csv"], `Compare strategies ${symbol}`));
      }

      if (availableSymbols.length > 0) {
        for (const strategy of ["rsi", "ema", "breakout"]) {
          steps.push(
            runNpm(
              ["run", "compare:symbols", "--", "--symbols", availableSymbols.join(","), "--strategy", strategy, "--data", "csv"],
              `Compare symbols ${strategy}`,
            ),
          );
        }
      }

      steps.push(runNpm(["run", "dataset:readiness"], "Dataset readiness"));
      const readiness = buildDatasetReadinessReport();
      const report: PipelineReport = {
        mode: "simulation only",
        steps,
        availableSymbols,
        readinessStatus: readiness.status,
        nextSteps: [readiness.nextRecommendedCommand],
      };

      writeAndLogJsonReports({
        jsonPath: "output/reports/historical-data-pipeline-report.json",
        markdownPath: "output/reports/historical-data-pipeline-report.md",
        data: report,
        markdown: pipelineMarkdown(report),
      });
    } catch (error) {
      handleCliError(error);
    }
  });

program.parse();

function runNpm(args: string[], name: string): PipelineStep {
  const result = spawnSync("npm", args, { encoding: "utf8" });
  const output = `${result.stdout}${result.stderr}`.trim();
  const success = result.status === 0;

  console.log(`${success ? "Completed" : "Failed"}: ${name}`);
  if (!success && output) console.log(output);

  return { name, success, output };
}

function pipelineMarkdown(report: PipelineReport): string {
  return `# Historical Data Pipeline Report

Mode: simulation only. Real trading is disabled.

- Available symbols: ${report.availableSymbols.join(", ") || "None"}
- Readiness status: ${report.readinessStatus}

## Steps
${report.steps.map((step) => `- ${step.success ? "PASS" : "FAIL"}: ${step.name}`).join("\n")}

## Next Steps
${report.nextSteps.map((step) => `- \`${step}\``).join("\n")}

Historical performance does not guarantee future results.
`;
}
