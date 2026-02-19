#!/usr/bin/env node
/**
 * Export the Confidant logo to PNG at standard sizes. Writes to landing/public/
 * and desktop/src-tauri/icons/.
 *
 * Source (one of the following):
 * - design/logo-512-source.png — if present, this 512×512 PNG is resized to all sizes.
 * - Otherwise: built-in SVG (C + lock symbol) is used.
 *
 * Run from repo root: npm run export-logo-png
 * Requires: sharp (devDependency at root).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const PNG_SOURCE = path.join(root, "design", "logo-512-source.png");

// Fallback: LogoIcon SVG (C + lock). Used when logo-512-source.png is not present.
const CONFIDANT_SYMBOL_PATH =
  "M17 12A10 10 0 0012 2A10 10 0 007 12H6A6 6 0 0112 18A6 6 0 0118 12H17z M15 12a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z";
const FILL = "#213547";
const VIEWBOX = "0 0 24 24";
const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="${VIEWBOX}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" d="${CONFIDANT_SYMBOL_PATH}" fill="${FILL}"/>
</svg>`;

const WEB_SIZES = [
  [16, "favicon-16x16.png"],
  [32, "favicon-32x32.png"],
  [192, "logo-192.png"],
  [512, "logo-512.png"],
];

const DESKTOP_SIZES = [
  [32, "32x32.png"],
  [128, "128x128.png"],
  [256, "128x128@2x.png"],
  [512, "icon.png"],
];

// Sidebar header logo for desktop React UI (128px for retina)
const DESKTOP_SIDEBAR_LOGO = path.join(root, "desktop", "src", "assets", "sidebar-logo.png");
const DESKTOP_SIDEBAR_SIZE = 128;

async function main() {
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch (e) {
    console.error("sharp is required. From repo root run: npm install");
    process.exit(1);
  }

  const publicDir = path.join(root, "landing", "public");
  const iconsDir = path.join(root, "desktop", "src-tauri", "icons");

  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(iconsDir, { recursive: true });

  const usePngSource = fs.existsSync(PNG_SOURCE);
  if (usePngSource) {
    console.log("Using source: design/logo-512-source.png");
  } else {
    console.log("Using source: built-in SVG (no design/logo-512-source.png)");
  }

  const input = usePngSource
    ? await sharp(PNG_SOURCE)
    : sharp(Buffer.from(SVG, "utf-8"));

  for (const [size, name] of WEB_SIZES) {
    const out = path.join(publicDir, name);
    await input.clone().resize(size, size).png().toFile(out);
    console.log("  %s", path.relative(root, out));
  }

  for (const [size, name] of DESKTOP_SIZES) {
    const out = path.join(iconsDir, name);
    await input.clone().resize(size, size).png().toFile(out);
    console.log("  %s", path.relative(root, out));
  }

  fs.mkdirSync(path.dirname(DESKTOP_SIDEBAR_LOGO), { recursive: true });
  await input.clone().resize(DESKTOP_SIDEBAR_SIZE, DESKTOP_SIDEBAR_SIZE).png().toFile(DESKTOP_SIDEBAR_LOGO);
  console.log("  %s", path.relative(root, DESKTOP_SIDEBAR_LOGO));

  console.log("Logo PNGs written to landing/public/, desktop/src-tauri/icons/, and desktop/src/assets/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
