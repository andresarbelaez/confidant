/**
 * RunAnywhere LLM: init, model registration, download, load, and streaming generate.
 * Uses a small GGUF model (SmolLM2 360M) for on-device PoC.
 */

import { RunAnywhere, SDKEnvironment } from '@runanywhere/core';
import { LlamaCPP } from '@runanywhere/llamacpp';

export const LLM_MODEL_ID = 'smollm2-360m-q8_0';

let sdkInitialized = false;

export async function initRunAnywhere(): Promise<void> {
  if (sdkInitialized) return;

  await RunAnywhere.initialize({
    environment: SDKEnvironment.Development,
  });

  LlamaCPP.register();

  await LlamaCPP.addModel({
    id: LLM_MODEL_ID,
    name: 'SmolLM2 360M Q8',
    url: 'https://huggingface.co/prithivMLmods/SmolLM2-360M-GGUF/resolve/main/SmolLM2-360M.Q8_0.gguf',
    memoryRequirement: 500_000_000,
  });

  sdkInitialized = true;
}

export async function isModelDownloaded(): Promise<boolean> {
  const info = await RunAnywhere.getModelInfo(LLM_MODEL_ID);
  return Boolean(info?.localPath);
}

export async function downloadModel(
  onProgress: (progress: number) => void
): Promise<void> {
  await RunAnywhere.downloadModel(LLM_MODEL_ID, (p) => {
    onProgress(p.progress);
  });
}

export async function loadModel(): Promise<void> {
  const info = await RunAnywhere.getModelInfo(LLM_MODEL_ID);
  if (!info?.localPath) {
    throw new Error('Model not downloaded. Call downloadModel first.');
  }
  await RunAnywhere.loadModel(info.localPath);
}

export async function downloadAndLoadModel(
  onProgress: (progress: number) => void
): Promise<void> {
  if (!(await isModelDownloaded())) {
    await downloadModel(onProgress);
  }
  await loadModel();
}

export type StreamResult = Awaited<ReturnType<typeof RunAnywhere.generateStream>>;

export function generateStream(
  prompt: string,
  options?: { maxTokens?: number; temperature?: number }
): StreamResult {
  return RunAnywhere.generateStream(prompt, {
    maxTokens: options?.maxTokens ?? 256,
    temperature: options?.temperature ?? 0.7,
  });
}
