import { Command } from "commander";
import { z } from "zod";
import { downloadYahooHistoricalData, type YahooDownloadResult } from "../data/yahooHistoricalDataDownloader";
import { validateCandles } from "../data/historicalDataValidator";
import { writeHistoricalCsv } from "../data/writeHistoricalCsv";
import { handleCliError, logJsonResult, logReportPaths, writeCliReports } from "./cliOutput";

const optionsSchema = z.object({
  symbol: z.string(),
  start: z.string().optional(),
  end: z.string().optional(),
  interval: z.enum(["1d", "1wk", "1mo"]).default("1d"),
});

const program = new Command();

program
  .name("data:download")
  .description("Download Yahoo historical data into normalized local CSV format for simulation-only research.")
  .requiredOption("--symbol <symbol>", "Internal symbol, e.g. BTC")
  .option("--start <date>", "Start date YYYY-MM-DD")
  .option("--end <date>", "End date YYYY-MM-DD")
  .option("--interval <interval>", "Yahoo interval: 1d, 1wk, or 1mo", "1d")
  .action(async (rawOptions) => {
    try {
      const options = optionsSchema.parse(rawOptions);
      const result = await downloadYahooHistoricalData(options.symbol, {
        ...(options.start !== undefined ? { startDate: options.start } : {}),
        ...(options.end !== undefined ? { endDate: options.end } : {}),
        interval: options.interval,
      });
      const outputFile = writeHistoricalCsv(result.symbol, result.candles);
      const validation = validateCandles(result.candles, result.symbol, outputFile);
      const report = toDownloadReport(result, outputFile, validation);
      const basePath = `output/reports/${result.symbol}-download-report`;

      writeCliReports({
        jsonPath: `${basePath}.json`,
        markdownPath: `${basePath}.md`,
        data: report,
        markdown: downloadMarkdown(report),
      });
      logJsonResult(report);
      logReportPaths(`${basePath}.json`, `${basePath}.md`);
    } catch (error) {
      handleCliError(error);
    }
  });

program.parse();

function nextCommands(symbol: string): string[] {
  return [
    `npm run data:validate -- --symbol ${symbol} --data csv`,
    `npm run compare:strategies -- --symbol ${symbol} --data csv`,
  ];
}

type DownloadReport = {
  symbol: string;
  yahooSymbol: string;
  candlesDownloaded: number;
  dateRange: { start: string; end: string };
  skippedRows: number;
  warnings: string[];
  outputFile: string;
  validation: unknown;
  nextCommands: string[];
};

function toDownloadReport(result: YahooDownloadResult, outputFile: string, validation: unknown): DownloadReport {
  return {
    symbol: result.symbol,
    yahooSymbol: result.yahooSymbol,
    candlesDownloaded: result.candles.length,
    dateRange: {
      start: result.candles[0]?.date ?? "N/A",
      end: result.candles[result.candles.length - 1]?.date ?? "N/A",
    },
    skippedRows: result.skippedRows,
    warnings: result.warnings,
    outputFile,
    validation,
    nextCommands: nextCommands(result.symbol),
  };
}

function downloadMarkdown(report: DownloadReport): string {
  const warnings = report.warnings.length === 0 ? "- None" : report.warnings.map((warning) => `- ${warning}`).join("\n");

  return `# Historical Download Report: ${report.symbol}

Mode: simulation only. Real trading is disabled.

- Internal symbol: ${report.symbol}
- Yahoo symbol: ${report.yahooSymbol}
- Candles downloaded: ${report.candlesDownloaded}
- Date range: ${report.dateRange.start} to ${report.dateRange.end}
- Skipped rows: ${report.skippedRows}
- Output file: ${report.outputFile}

## Warnings
${warnings}

## Next Commands
${report.nextCommands.map((command) => `- \`${command}\``).join("\n")}

Historical performance does not guarantee future results.
`;
}
