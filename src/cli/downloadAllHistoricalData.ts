import { Command } from "commander";
import { z } from "zod";
import { downloadYahooHistoricalData } from "../data/yahooHistoricalDataDownloader";
import { yahooSymbols } from "../data/yahooSymbolMap";
import { writeHistoricalCsv } from "../data/writeHistoricalCsv";
import { handleCliError, writeAndLogJsonReports } from "./cliOutput";

const optionsSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  interval: z.enum(["1d", "1wk", "1mo"]).default("1d"),
});

type DownloadAllReport = {
  mode: "simulation only";
  downloaded: Array<{ symbol: string; yahooSymbol: string; candles: number; skippedRows: number; outputFile: string; warnings: string[] }>;
  failed: Array<{ symbol: string; yahooSymbol: string; error: string }>;
  totalSkippedRows: number;
  warnings: string[];
};

const program = new Command();

program
  .name("data:download:all")
  .description("Download all supported Yahoo historical datasets for simulation-only research.")
  .option("--start <date>", "Start date YYYY-MM-DD")
  .option("--end <date>", "End date YYYY-MM-DD")
  .option("--interval <interval>", "Yahoo interval: 1d, 1wk, or 1mo", "1d")
  .action(async (rawOptions) => {
    try {
      const options = optionsSchema.parse(rawOptions);
      const report: DownloadAllReport = {
        mode: "simulation only",
        downloaded: [],
        failed: [],
        totalSkippedRows: 0,
        warnings: [],
      };

      for (const symbol of yahooSymbols) {
        try {
          const result = await downloadYahooHistoricalData(symbol.internalSymbol, {
            ...(options.start !== undefined ? { startDate: options.start } : {}),
            ...(options.end !== undefined ? { endDate: options.end } : {}),
            interval: options.interval,
          });
          const outputFile = writeHistoricalCsv(result.symbol, result.candles);
          report.downloaded.push({
            symbol: result.symbol,
            yahooSymbol: result.yahooSymbol,
            candles: result.candles.length,
            skippedRows: result.skippedRows,
            outputFile,
            warnings: result.warnings,
          });
          report.totalSkippedRows += result.skippedRows;
          report.warnings.push(...result.warnings.map((warning) => `${result.symbol}: ${warning}`));
          console.log(`Downloaded ${result.symbol}: ${result.candles.length} candles`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown download error.";
          report.failed.push({ symbol: symbol.internalSymbol, yahooSymbol: symbol.yahooSymbol, error: message });
          console.error(`Failed ${symbol.internalSymbol}: ${message}`);
        }
      }

      writeAndLogJsonReports({
        jsonPath: "output/reports/historical-download-all-report.json",
        markdownPath: "output/reports/historical-download-all-report.md",
        data: report,
        markdown: downloadAllMarkdown(report),
      });
    } catch (error) {
      handleCliError(error);
    }
  });

program.parse();

function downloadAllMarkdown(report: DownloadAllReport): string {
  return `# Historical Download All Report

Mode: simulation only. Real trading is disabled.

- Downloaded symbols: ${report.downloaded.length}
- Failed symbols: ${report.failed.length}
- Total skipped rows: ${report.totalSkippedRows}

## Downloaded
${report.downloaded.map((item) => `- ${item.symbol} (${item.yahooSymbol}): ${item.candles} candles -> ${item.outputFile}`).join("\n") || "- None"}

## Failed
${report.failed.map((item) => `- ${item.symbol} (${item.yahooSymbol}): ${item.error}`).join("\n") || "- None"}

## Warnings
${report.warnings.map((warning) => `- ${warning}`).join("\n") || "- None"}

Historical performance does not guarantee future results.
`;
}
