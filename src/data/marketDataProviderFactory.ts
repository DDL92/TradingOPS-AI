import { CsvMarketDataProvider } from "./csvMarketDataProvider";
import type { MarketDataProvider } from "./marketDataProvider.interface";
import { SampleMarketDataProvider } from "./sampleMarketDataProvider";

export type MarketDataSource = "sample" | "csv";

export function createMarketDataProvider(source: MarketDataSource = "sample"): MarketDataProvider {
  if (source === "csv") {
    return new CsvMarketDataProvider();
  }

  return new SampleMarketDataProvider();
}

export function parseMarketDataSource(value: string | undefined): MarketDataSource {
  if (value === undefined || value === "sample") return "sample";
  if (value === "csv") return "csv";
  throw new Error(`Unsupported data source "${value}". Use "sample" or "csv".`);
}
