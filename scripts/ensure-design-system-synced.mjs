#!/usr/bin/env node
/**
 * Pre-commit helper: if docs/confidant-design-system.md is staged, run the
 * design-system sync (landing) and stage the updated landing content so both
 * files are committed together.
 *
 * Run from repo root. Used by .husky/pre-commit.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const staged = execSync("git diff --cached --name-only", {
  encoding: "utf-8",
  cwd: root,
})
  .trim()
  .split("\n")
  .filter(Boolean);

if (!staged.includes("docs/confidant-design-system.md")) {
  process.exit(0);
}

console.log("Design system doc is staged; syncing to landing...");
execSync("npm run sync:design-system", {
  cwd: path.join(root, "landing"),
  stdio: "inherit",
});
execSync("git add landing/src/content/design-system.md", {
  cwd: root,
  stdio: "inherit",
});
console.log("Staged landing/src/content/design-system.md");
