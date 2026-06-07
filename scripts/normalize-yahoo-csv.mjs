import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parse } from "csv-parse/sync";

const symbolMap = [
  { internalSymbol: "BTC", rawFileName: "BTC-USD.csv", normalizedFileName: "BTC.csv" },
  { internalSymbol: "ETH", rawFileName: "ETH-USD.csv", normalizedFileName: "ETH.csv" },
  { internalSymbol: "SPY", rawFileName: "SPY.csv", normalizedFileName: "SPY.csv" },
  { internalSymbol: "QQQ", rawFileName: "QQQ.csv", normalizedFileName: "QQQ.csv" },
  { internalSymbol: "NVDA", rawFileName: "NVDA.csv", normalizedFileName: "NVDA.csv" },
  { internalSymbol: "TSLA", rawFileName: "TSLA.csv", normalizedFileName: "TSLA.csv" },
];

const downloadsRoot = join(homedir(), "Downloads", "trading-data");
const rawDir = join(downloadsRoot, "raw");
const normalizedDir = join(downloadsRoot, "normalized");
const report = {
  mode: "simulation only",
  rawDir,
  normalizedDir,
  normalized: [],
  missing: [],
  failed: [],
};

mkdirSync(normalizedDir, { recursive: true });
mkdirSync("output/reports", { recursive: true });

for (const mapping of symbolMap) {
  const inputPath = join(rawDir, mapping.rawFileName);
  const outputPath = join(normalizedDir, mapping.normalizedFileName);

  if (!existsSync(inputPath)) {
    const message = `Missing raw file for ${mapping.internalSymbol}: expected ${inputPath}`;
    console.warn(message);
    report.missing.push({ symbol: mapping.internalSymbol, expectedPath: inputPath });
    continue;
  }

  try {
    const raw = readFileSync(inputPath, "utf8");
    const records = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
    const normalizedRows = [];
    let skippedRows = 0;

    for (const record of records) {
      const normalized = normalizeYahooRecord(record);
      if (!normalized) {
        skippedRows += 1;
        continue;
      }
      normalizedRows.push(normalized);
    }

    normalizedRows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const csv = [
      "date,open,high,low,close,volume",
      ...normalizedRows.map((row) => `${row.date},${row.open},${row.high},${row.low},${row.close},${row.volume}`),
    ].join("\n");

    writeFileSync(outputPath, `${csv}\n`, "utf8");
    const summary = {
      symbol: mapping.internalSymbol,
      inputRows: records.length,
      outputRows: normalizedRows.length,
      skippedRows,
      outputPath,
    };
    report.normalized.push(summary);
    console.log(`${mapping.internalSymbol}: input=${records.length} output=${normalizedRows.length} skipped=${skippedRows}`);
    console.log(`Output: ${outputPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown normalization error.";
    console.error(`${mapping.internalSymbol}: ${message}`);
    report.failed.push({ symbol: mapping.internalSymbol, error: message });
  }
}

writeReport("output/reports/yahoo-normalization-report", report, buildMarkdown(report));

function normalizeYahooRecord(record) {
  const row = lowerCaseKeys(record);
  const date = row.date;
  const open = row.open;
  const high = row.high;
  const low = row.low;
  const close = row.close;
  const volume = row.volume;

  if ([date, open, high, low, close, volume].some((value) => value === undefined || value === "" || value === "null")) {
    return null;
  }

  const numeric = {
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
  };

  if (Object.values(numeric).some((value) => !Number.isFinite(value))) return null;
  if (numeric.high < numeric.open || numeric.high < numeric.close || numeric.high < numeric.low) return null;
  if (numeric.low > numeric.open || numeric.low > numeric.close || numeric.low > numeric.high) return null;
  if (numeric.volume < 0) return null;

  return {
    date: normalizeDate(date),
    open,
    high,
    low,
    close,
    volume,
  };
}

function lowerCaseKeys(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key.trim().toLowerCase(), String(value).trim()]));
}

function normalizeDate(value) {
  return value.length >= 10 ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
}

function writeReport(basePath, json, markdown) {
  mkdirSync(dirname(basePath), { recursive: true });
  writeFileSync(`${basePath}.json`, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  writeFileSync(`${basePath}.md`, markdown, "utf8");
}

function buildMarkdown(data) {
  return `# Yahoo Normalization Report

Mode: simulation only. Real trading is disabled.

- Raw directory: ${data.rawDir}
- Normalized directory: ${data.normalizedDir}
- Normalized symbols: ${data.normalized.length}
- Missing symbols: ${data.missing.length}
- Failed symbols: ${data.failed.length}

## Normalized
${data.normalized.map((item) => `- ${item.symbol}: ${item.outputRows}/${item.inputRows} rows, skipped ${item.skippedRows}`).join("\n") || "- None"}

## Missing
${data.missing.map((item) => `- ${item.symbol}: ${item.expectedPath}`).join("\n") || "- None"}

## Failed
${data.failed.map((item) => `- ${item.symbol}: ${item.error}`).join("\n") || "- None"}

Yahoo adjusted close is ignored in Sprint 3.5; normalized data uses Close.
`;
}
