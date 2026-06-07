import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { Command } from "commander";
import { z } from "zod";
import { validateHistoricalCsvFile } from "../data/historicalDataValidator";
import { buildHistoricalDataValidationMarkdown } from "../reports/historicalDataReportBuilder";
import { handleCliError, writeAndLogJsonReports } from "./cliOutput";

const optionsSchema = z.object({
  symbol: z.string(),
  file: z.string(),
});

const program = new Command();

program
  .name("data:import")
  .description("Import a local CSV file into data/historical for simulation-only research.")
  .requiredOption("--symbol <symbol>", "Symbol to import")
  .requiredOption("--file <path>", "Source CSV file path")
  .action((rawOptions) => {
    try {
      const options = optionsSchema.parse(rawOptions);
      const symbol = options.symbol.toUpperCase();

      if (!existsSync(options.file)) {
        throw new Error(`Source CSV file does not exist: ${options.file}`);
      }

      const destination = join("data", "historical", `${symbol}.csv`);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(options.file, destination);

      const result = validateHistoricalCsvFile(destination, symbol);
      const basePath = `output/reports/${symbol}-data-validation`;

      writeAndLogJsonReports({
        jsonPath: `${basePath}.json`,
        markdownPath: `${basePath}.md`,
        data: result,
        markdown: buildHistoricalDataValidationMarkdown(result),
      });

      console.log(`Next: npm run backtest -- --symbol ${symbol} --strategy rsi --data csv`);
    } catch (error) {
      handleCliError(error);
    }
  });

program.parse();
