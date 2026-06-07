import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const symbols = ["BTC", "ETH", "SPY", "QQQ", "NVDA", "TSLA"];
const normalizedDir = join(homedir(), "Downloads", "trading-data", "normalized");
const report = { mode: "simulation only", imported: [], skipped: [], failed: [] };

for (const symbol of symbols) {
  const filePath = join(normalizedDir, `${symbol}.csv`);
  if (!existsSync(filePath)) {
    const message = `Missing normalized file for ${symbol}: expected ${filePath}`;
    console.warn(message);
    report.skipped.push({ symbol, expectedPath: filePath });
    continue;
  }

  const result = spawnSync("npm", ["run", "data:import", "--", "--symbol", symbol, "--file", filePath], {
    encoding: "utf8",
  });

  if (result.status === 0) {
    report.imported.push({ symbol, filePath, output: result.stdout.trim() });
    console.log(`Imported ${symbol}`);
  } else {
    report.failed.push({ symbol, filePath, error: `${result.stderr}${result.stdout}`.trim() });
    console.error(`Failed ${symbol}`);
  }
}

writeReport("output/reports/normalized-import-report", report, buildMarkdown(report));

function writeReport(basePath, json, markdown) {
  mkdirSync(dirname(basePath), { recursive: true });
  writeFileSync(`${basePath}.json`, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  writeFileSync(`${basePath}.md`, markdown, "utf8");
}

function buildMarkdown(data) {
  return `# Normalized Import Report

Mode: simulation only. Real trading is disabled.

- Imported: ${data.imported.length}
- Skipped: ${data.skipped.length}
- Failed: ${data.failed.length}

## Imported
${data.imported.map((item) => `- ${item.symbol}: ${item.filePath}`).join("\n") || "- None"}

## Skipped
${data.skipped.map((item) => `- ${item.symbol}: ${item.expectedPath}`).join("\n") || "- None"}

## Failed
${data.failed.map((item) => `- ${item.symbol}: ${item.error}`).join("\n") || "- None"}
`;
}
