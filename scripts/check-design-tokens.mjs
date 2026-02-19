#!/usr/bin/env node
/**
 * Advisory check: find hardcoded colors in desktop and landing UI code.
 * Suggests using design tokens (var(--color-*)) instead.
 * Exit 0 always; use in CI as a non-blocking report or locally before PRs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const dirs = [
  path.join(root, "desktop", "src"),
  path.join(root, "landing", "src"),
];

// Match hex (#fff, #ffffff) and rgb/rgba( ... ) in CSS and TSX/JSX (create new regex each time to avoid lastIndex)
const hexRe = () => /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const rgbRe = () => /\brgba?\s*\(/g;

// Exclude tokens and theme files that define variables (canonical token definitions).
// rel is path from repo root (e.g. desktop/src/index.css).
const exclude = (rel) =>
  /node_modules|\.test\.|\.spec\.|tokens\.(ts|css)|design-system\.css|globals\.css|^desktop\/src\/index\.css$|^desktop\/src\/themes\/[^/]+\.css$/.test(rel);

function* walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const relFromBase = path.relative(base, full);
    if (e.isDirectory() && e.name !== "node_modules") {
      yield* walk(full, base);
    } else if (e.isFile() && /\.(css|tsx|jsx|ts|js)$/.test(e.name)) {
      const relFromRoot = path.relative(root, full).replace(/\\/g, "/");
      if (!exclude(relFromRoot)) yield full;
    }
  }
}

let total = 0;
const byFile = new Map();

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const content = fs.readFileSync(file, "utf-8");
    const rel = path.relative(root, file);
    const hexMatches = content.match(hexRe()) || [];
    const rgbMatches = content.match(rgbRe()) || [];
    const count = hexMatches.length + rgbMatches.length;
    if (count > 0) {
      total += count;
      byFile.set(rel, { hex: hexMatches.length, rgb: rgbMatches.length });
    }
  }
}

if (total === 0) {
  console.log("check:design-tokens — No hardcoded colors found in desktop/landing UI.");
  process.exit(0);
}

console.log("check:design-tokens — Possible hardcoded colors (consider var(--color-*) or tokens):\n");
for (const [rel, counts] of [...byFile.entries()].sort()) {
  const parts = [];
  if (counts.hex) parts.push(`${counts.hex} hex`);
  if (counts.rgb) parts.push(`${counts.rgb} rgb/a`);
  console.log(`  ${rel}: ${parts.join(", ")}`);
}
console.log(`\nTotal: ${total} occurrences. See docs/DESIGN_SYSTEM_ADHERENCE.md.`);
process.exit(0);
