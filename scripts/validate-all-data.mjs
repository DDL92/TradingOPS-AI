import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";

const symbols = ["BTC", "ETH", "SPY", "QQQ", "NVDA", "TSLA"];
const report = { mode: "simulation only", validated: [], missing: [], failed: [] };

for (const symbol of symbols) {
  const filePath = join("data", "historical", `${symbol}.csv`);
  if (!existsSync(filePath)) {
    console.warn(`Missing historical CSV for ${symbol}: ${filePath}`);
    report.missing.push({ symbol, expectedPath: filePath });
    continue;
  }

  const result = spawnSync("npm", ["run", "data:validate", "--", "--symbol", symbol, "--data", "csv"], {
    encoding: "utf8",
  });

  if (result.status === 0) {
    report.validated.push({ symbol, output: result.stdout.trim() });
    console.log(`Validated ${symbol}`);
  } else {
    report.failed.push({ symbol, error: `${result.stderr}${result.stdout}`.trim() });
    console.error(`Failed validation for ${symbol}`);
  }
}

writeReport("output/reports/all-data-validation-summary", report, buildMarkdown(report));

function writeReport(basePath, json, markdown) {
  mkdirSync(dirname(basePath), { recursive: true });
  writeFileSync(`${basePath}.json`, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  writeFileSync(`${basePath}.md`, markdown, "utf8");
}

function buildMarkdown(data) {
  return `# All Data Validation Summary

Mode: simulation only. Real trading is disabled.

- Validated: ${data.validated.length}
- Missing: ${data.missing.length}
- Failed: ${data.failed.length}

## Validated
${data.validated.map((item) => `- ${item.symbol}`).join("\n") || "- None"}

## Missing
${data.missing.map((item) => `- ${item.symbol}: ${item.expectedPath}`).join("\n") || "- None"}

## Failed
${data.failed.map((item) => `- ${item.symbol}: ${item.error}`).join("\n") || "- None"}
`;
}
