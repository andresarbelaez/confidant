#!/usr/bin/env node
/**
 * Download the lightweight/default model for testing (~2.5 GB).
 * Run from desktop/: npm run seed-defaults-lite
 *
 * Uses the "Standard Model" (Llama 3.2 3B) from config - smaller and faster than the
 * full default. The app finds any .gguf in data/models/, so this works the same way.
 */

import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs';
import { get } from 'https';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const LITE_MODEL_URL =
  'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf';
const MODEL_FILENAME = 'Llama-3.2-3B-Instruct-Q4_K_M.gguf';

function findDataDir() {
  const desktopDir = join(__dirname, '..');
  const repoRoot = join(desktopDir, '..');
  const dataDir = join(repoRoot, 'data');
  const modelsDir = join(dataDir, 'models');
  return { dataDir, modelsDir, modelPath: join(modelsDir, MODEL_FILENAME) };
}

function download(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath, { flags: 'wx' });
    let total = 0;
    let received = 0;

    const request = get(url, { headers: { 'User-Agent': 'Confidant-Desktop' } }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirect = response.headers.location;
        file.close();
        request.destroy();
        try {
          unlinkSync(destPath);
        } catch (_) {}
        return download(redirect, destPath, onProgress).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        request.destroy();
        try {
          unlinkSync(destPath);
        } catch (_) {}
        reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        return;
      }
      total = parseInt(response.headers['content-length'] || '0', 10) || 0;
      response.pipe(file);
      response.on('data', (chunk) => {
        received += chunk.length;
        if (onProgress && total > 0) onProgress(received, total);
      });
      file.on('finish', () => {
        file.close(() => {
          request.destroy();
          resolve();
        });
      });
    });

    request.on('error', (err) => {
      file.close();
      request.destroy();
      try {
        unlinkSync(destPath);
      } catch (_) {}
      reject(err);
    });
    file.on('error', (err) => {
      file.close();
      request.destroy();
      try {
        unlinkSync(destPath);
      } catch (_) {}
      reject(err);
    });
  });
}

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

async function main() {
  const { modelsDir, modelPath } = findDataDir();

  if (existsSync(modelPath)) {
    console.log('Lightweight model already present at:', modelPath);
    console.log('You can run the app with: npm run dev');
    return;
  }

  if (!existsSync(modelsDir)) {
    mkdirSync(modelsDir, { recursive: true });
    console.log('Created', modelsDir);
  }

  console.log('Downloading lightweight model (~2.5 GB) to', modelPath);
  console.log('This may take a while depending on your connection.\n');

  try {
    await download(LITE_MODEL_URL, modelPath, (received, total) => {
      if (total > 0 && received % (25 * 1024 * 1024) < 1024 * 1024) {
        const pct = Math.round((received / total) * 100);
        process.stdout.write(`\r  ${formatMB(received)} / ${formatMB(total)} MB (${pct}%)`);
      }
    });
    console.log('\n\nLightweight model downloaded successfully.');
  } catch (err) {
    console.error('\nDownload failed:', err.message);
    if (existsSync(modelPath)) try { unlinkSync(modelPath); } catch (_) {}
    process.exit(1);
  }

  console.log('\nKnowledge base: the app will use desktop/test_knowledge_base.json on first run.');
  console.log('Run the app with: npm run dev');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
