import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const sourcePath = resolve(root, ".dev.vars.example");
const targetPath = resolve(root, ".dev.vars");
const force = process.argv.includes("--force");

if (!existsSync(sourcePath)) {
  console.error("Missing .dev.vars.example. Cannot continue.");
  process.exit(1);
}

if (existsSync(targetPath) && !force) {
  console.log(".dev.vars already exists. No changes made.");
  console.log("Use npm run setup:local -- --force to overwrite from template.");
  process.exit(0);
}

copyFileSync(sourcePath, targetPath);
console.log("Created .dev.vars from .dev.vars.example.");
console.log("Next steps:");
console.log("1. Update .dev.vars with your real values.");
console.log("2. Run npm install");
console.log("3. Run npm run doctor");
console.log("4. Run npm run dev");
