/**
 * Model Loader - Handles loading LLM models from Cache Storage
 */

export interface ModelInfo {
  url: string;
  name: string;
  size: number; // in bytes
  description: string;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    url: 'https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC/resolve/main/',
    name: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    size: 2 * 1024 * 1024 * 1024, // ~2GB
    description: 'Llama 3.2 3B Instruct (Q4 quantized) - Recommended for best quality'
  },
  {
    url: 'https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC/resolve/main/',
    name: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    size: 800 * 1024 * 1024, // ~800MB
    description: 'Llama 3.2 1B Instruct (Q4 quantized) - Faster, smaller, good quality'
  }
];

export const DEFAULT_MODEL = AVAILABLE_MODELS[0]; // 3B model

export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Check if model is already downloaded
 */
export async function isModelDownloaded(modelName: string): Promise<boolean> {
  try {
    const cache = await caches.open('dant-models');
    const keys = await cache.keys();
    return keys.some(key => key.url.includes(modelName));
  } catch (error) {
    console.error('Error checking model cache:', error);
    return false;
  }
}

/**
 * Get downloaded model size
 */
export async function getModelSize(modelName: string): Promise<number> {
  try {
    const cache = await caches.open('dant-models');
    const keys = await cache.keys();
    const modelKeys = keys.filter(key => key.url.includes(modelName));
    
    let totalSize = 0;
    for (const key of modelKeys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    return totalSize;
  } catch (error) {
    console.error('Error getting model size:', error);
    return 0;
  }
}

/**
 * Delete downloaded model
 */
export async function deleteModel(modelName: string): Promise<void> {
  try {
    const cache = await caches.open('dant-models');
    const keys = await cache.keys();
    const modelKeys = keys.filter(key => key.url.includes(modelName));
    
    await Promise.all(modelKeys.map(key => cache.delete(key)));
  } catch (error) {
    console.error('Error deleting model:', error);
    throw error;
  }
}

/**
 * List all downloaded models
 */
export async function listDownloadedModels(): Promise<string[]> {
  try {
    const cache = await caches.open('dant-models');
    const keys = await cache.keys();
    const modelNames = new Set<string>();
    
    for (const key of keys) {
      // Extract model name from URL
      const url = new URL(key.url);
      const pathParts = url.pathname.split('/');
      const modelName = pathParts.find(part => part.includes('Llama'));
      if (modelName) {
        modelNames.add(modelName);
      }
    }
    
    return Array.from(modelNames);
  } catch (error) {
    console.error('Error listing models:', error);
    return [];
  }
}
