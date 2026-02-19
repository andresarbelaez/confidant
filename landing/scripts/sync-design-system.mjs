#!/usr/bin/env node
/**
 * Copies docs/confidant-design-system.md to landing/src/content/design-system.md
 * so the design-system page and the canonical spec stay in sync.
 *
 * Usage:
 *   npm run sync:design-system     Run once (from landing).
 *   npm run sync:watch             Watch docs/confidant-design-system.md and sync on change.
 *
 * Pre-commit: when docs/confidant-design-system.md is staged, the root script
 * scripts/ensure-design-system-synced.mjs runs this sync and stages the result.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const landingRoot = path.join(__dirname, "..");
const repoRoot = path.join(landingRoot, "..");
const source = path.join(repoRoot, "docs", "confidant-design-system.md");
const dest = path.join(landingRoot, "src", "content", "design-system.md");

function sync() {
  fs.copyFileSync(source, dest);
  console.log("Synced docs/confidant-design-system.md -> landing/src/content/design-system.md");
}

const watch = process.argv.includes("--watch");
if (watch) {
  if (!fs.existsSync(source)) {
    console.error("Source not found:", source);
    process.exit(1);
  }
  sync();
  fs.watch(source, (eventType) => {
    if (eventType === "change") {
      sync();
    }
  });
  console.log("Watching docs/confidant-design-system.md (Ctrl+C to stop).");
} else {
  sync();
}
