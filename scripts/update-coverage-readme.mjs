import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const readmePath = resolve(root, "README.md");
const summaryPath = resolve(root, "coverage", "coverage-summary.json");

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function row(label, block) {
  return `| ${label} | ${formatPercent(block.pct)} | ${block.covered} | ${block.total} |`;
}

const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const total = summary.total;

const updatedAt = new Date().toISOString();
const table = [
  "| Metric | Coverage | Covered | Total |",
  "| --- | ---: | ---: | ---: |",
  row("Statements", total.statements),
  row("Branches", total.branches),
  row("Functions", total.functions),
  row("Lines", total.lines)
].join("\n");

const block = [
  "<!-- coverage-report:start -->",
  `Last updated: ${updatedAt}`,
  "",
  table,
  "",
  "Refresh with: `npm run coverage:update`",
  "<!-- coverage-report:end -->"
].join("\n");

const readme = readFileSync(readmePath, "utf8");
const pattern = /<!-- coverage-report:start -->[\s\S]*<!-- coverage-report:end -->/m;

if (!pattern.test(readme)) {
  throw new Error("README is missing coverage markers.");
}

const next = readme.replace(pattern, block);
writeFileSync(readmePath, next);

console.log("README coverage section updated.");
