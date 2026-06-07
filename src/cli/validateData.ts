import { Command } from "commander";
import { z } from "zod";
import { CsvMarketDataProvider } from "../data/csvMarketDataProvider";
import { createMarketDataProvider, parseMarketDataSource } from "../data/marketDataProviderFactory";
import { validateCandles, validateHistoricalCsvFile } from "../data/historicalDataValidator";
import { buildHistoricalDataValidationMarkdown } from "../reports/historicalDataReportBuilder";
import { handleCliError, writeAndLogJsonReports } from "./cliOutput";

const optionsSchema = z.object({
  symbol: z.string().default("BTC"),
  data: z.string().default("sample"),
});

const program = new Command();

program
  .name("data:validate")
  .description("Validate local historical market data for simulation-only backtesting.")
  .option("--symbol <symbol>", "Symbol to validate", "BTC")
  .option("--data <source>", "Market data source: sample or csv", "sample")
  .action((rawOptions) => {
    try {
      const options = optionsSchema.parse(rawOptions);
      const symbol = options.symbol.toUpperCase();
      const source = parseMarketDataSource(options.data);
      const result =
        source === "csv"
          ? validateHistoricalCsvFile(new CsvMarketDataProvider().getFilePath(symbol), symbol)
          : validateCandles(createMarketDataProvider("sample").getCandles(symbol), symbol, "sample");
      const basePath = `output/reports/${symbol}-data-validation`;

      writeAndLogJsonReports({
        jsonPath: `${basePath}.json`,
        markdownPath: `${basePath}.md`,
        data: result,
        markdown: buildHistoricalDataValidationMarkdown(result),
      });
    } catch (error) {
      handleCliError(error);
    }
  });

program.parse();
