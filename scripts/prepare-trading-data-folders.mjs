import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const downloadsRoot = join(homedir(), "Downloads", "trading-data");
const folders = [
  join(downloadsRoot, "raw"),
  join(downloadsRoot, "normalized"),
  "data/historical",
  "output/reports",
  "output/leaderboards",
];

for (const folder of folders) {
  mkdirSync(folder, { recursive: true });
  console.log(`Created or verified: ${folder}`);
}

console.log("\nNext steps:");
console.log("1. Download Yahoo Finance daily historical CSVs manually.");
console.log(`2. Save them into: ${join(downloadsRoot, "raw")}`);
console.log("3. Expected filenames:");
for (const fileName of ["BTC-USD.csv", "ETH-USD.csv", "SPY.csv", "QQQ.csv", "NVDA.csv", "TSLA.csv"]) {
  console.log(`- ${fileName}`);
}
console.log("4. Run: npm run data:normalize:yahoo");
