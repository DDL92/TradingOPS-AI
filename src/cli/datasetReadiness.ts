import { Command } from "commander";
import {
  buildDatasetReadinessMarkdown,
  buildDatasetReadinessReport,
} from "../reports/datasetReadinessReport";
import { handleCliError, writeAndLogJsonReports } from "./cliOutput";

const program = new Command();

program
  .name("dataset:readiness")
  .description("Summarize local historical dataset readiness for simulation-only research.")
  .action(() => {
    try {
      const result = buildDatasetReadinessReport();

      writeAndLogJsonReports({
        jsonPath: "output/reports/dataset-readiness.json",
        markdownPath: "output/reports/dataset-readiness.md",
        data: result,
        markdown: buildDatasetReadinessMarkdown(result),
      });
    } catch (error) {
      handleCliError(error);
    }
  });

program.parse();
