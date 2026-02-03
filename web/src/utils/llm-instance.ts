/**
 * LLM Instance Manager - Singleton pattern for sharing LLM engine across components
 */

import { WASMLLMEngine } from '../llm/wasm-llm-engine';

let llmEngineInstance: WASMLLMEngine | null = null;

/**
 * Get or create LLM engine instance
 */
export function getLLMEngine(): WASMLLMEngine {
  if (!llmEngineInstance) {
    llmEngineInstance = new WASMLLMEngine();
  }
  return llmEngineInstance;
}

/**
 * Set LLM engine instance (for sharing from ModelDownloader)
 */
export function setLLMEngine(engine: WASMLLMEngine): void {
  llmEngineInstance = engine;
}

/**
 * Check if LLM engine is initialized
 */
export function isLLMInitialized(): boolean {
  return llmEngineInstance?.isModelLoaded() || false;
}
