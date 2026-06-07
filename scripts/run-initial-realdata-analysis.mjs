import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";

const symbols = ["BTC", "ETH", "SPY", "QQQ", "NVDA", "TSLA"];
const availableSymbols = symbols.filter((symbol) => existsSync(join("data", "historical", `${symbol}.csv`)));
const report = { mode: "simulation only", availableSymbols, strategyComparisons: [], symbolComparisons: [], failed: [] };

for (const symbol of availableSymbols) {
  runCommand(["run", "compare:strategies", "--", "--symbol", symbol, "--data", "csv"], `compare strategies ${symbol}`, (output) => {
    report.strategyComparisons.push({ symbol, output });
  });
}

if (availableSymbols.length > 0) {
  for (const strategy of ["rsi", "breakout", "ema"]) {
    runCommand(
      ["run", "compare:symbols", "--", "--symbols", availableSymbols.join(","), "--strategy", strategy, "--data", "csv"],
      `compare symbols ${strategy}`,
      (output) => {
        report.symbolComparisons.push({ strategy, output });
      },
    );
  }
} else {
  console.warn("No historical CSV files available. Import data before running initial real-data analysis.");
}

writeReport("output/reports/initial-realdata-analysis-summary", report, buildMarkdown(report));

function runCommand(args, label, onSuccess) {
  const result = spawnSync("npm", args, { encoding: "utf8" });
  if (result.status === 0) {
    console.log(`Completed: ${label}`);
    onSuccess(result.stdout.trim());
  } else {
    const error = `${result.stderr}${result.stdout}`.trim();
    console.error(`Failed: ${label}`);
    report.failed.push({ label, error });
  }
}

function writeReport(basePath, json, markdown) {
  mkdirSync(dirname(basePath), { recursive: true });
  writeFileSync(`${basePath}.json`, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  writeFileSync(`${basePath}.md`, markdown, "utf8");
}

function buildMarkdown(data) {
  return `# Initial Real-Data Analysis Summary

Mode: simulation only. Real trading is disabled.

- Available symbols: ${data.availableSymbols.join(", ") || "None"}
- Strategy comparisons: ${data.strategyComparisons.length}
- Symbol comparisons: ${data.symbolComparisons.length}
- Failed commands: ${data.failed.length}

## Failed
${data.failed.map((item) => `- ${item.label}: ${item.error}`).join("\n") || "- None"}

Historical performance does not guarantee future results.
`;
}
