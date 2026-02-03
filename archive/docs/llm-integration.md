# LLM Integration Guide

## Overview

dant uses WebLLM for browser-based LLM inference. The LLM engine runs completely offline in the browser using WebAssembly.

## Architecture

### Components

1. **WASMLLMEngine** (`src/llm/wasm-llm-engine.ts`)
   - Wrapper around WebLLM's MLCEngine
   - Handles model initialization
   - Provides generate() and generateStream() methods

2. **Model Loader** (`src/llm/model-loader.ts`)
   - Manages available models
   - Checks if models are downloaded
   - Handles model deletion

3. **Model Downloader Component** (`src/components/ModelDownloader.tsx`)
   - UI for selecting and managing models
   - Shows download progress
   - Lists downloaded models

## Available Models

- **Llama-3.2-3B-Instruct-q4f16_1-MLC** (~2GB)
  - Recommended for best quality
  - Good balance of performance and quality

- **Llama-3.2-1B-Instruct-q4f16_1-MLC** (~800MB)
  - Faster inference
  - Smaller download
  - Good quality for simpler queries

## Usage

### Initialize LLM Engine

```typescript
import { WASMLLMEngine } from './llm/wasm-llm-engine';

const engine = new WASMLLMEngine();

// Initialize with progress callback
await engine.initialize('Llama-3.2-3B-Instruct-q4f16_1-MLC', (progress) => {
  console.log(`Loading: ${(progress * 100).toFixed(1)}%`);
});
```

### Generate Response

```typescript
// Non-streaming
const response = await engine.generate('What is health?', {
  temperature: 0.7,
  max_tokens: 512
});

console.log(response.text);
```

### Streaming Response

```typescript
// Streaming
for await (const chunk of engine.generateStream('What is health?', {
  temperature: 0.7,
  max_tokens: 512
})) {
  process.stdout.write(chunk);
}
```

## Model Download

WebLLM automatically downloads and caches models when you first initialize them. The model is stored in the browser's cache storage.

### Check if Model is Downloaded

```typescript
import { isModelDownloaded } from './llm/model-loader';

const downloaded = await isModelDownloaded('Llama-3.2-3B-Instruct-q4f16_1-MLC');
```

### Delete Model

```typescript
import { deleteModel } from './llm/model-loader';

await deleteModel('Llama-3.2-3B-Instruct-q4f16_1-MLC');
```

## Configuration

### LLM Config Options

- `temperature`: 0.0-1.0 (default: 0.7) - Controls randomness
- `top_p`: 0.0-1.0 (default: 0.9) - Nucleus sampling
- `max_tokens`: number (default: 512) - Maximum tokens to generate
- `stream`: boolean (default: false) - Enable streaming

## Privacy

- All processing happens client-side
- Models are cached locally
- No network requests during inference
- Service Worker blocks any query-related network requests

## Performance

- First initialization: Downloads model (~2GB for 3B model)
- Subsequent initializations: Loads from cache (faster)
- Inference speed: Depends on device (WebGPU acceleration if available)
- Memory usage: ~3-4GB RAM for 3B model

## Troubleshooting

### Model Not Loading

- Check browser console for errors
- Verify model name is correct
- Check available storage space
- Ensure WebGPU/WebGL is available

### Slow Inference

- Use smaller model (1B instead of 3B)
- Reduce max_tokens
- Check if WebGPU is enabled
- Close other browser tabs

### Out of Memory

- Use smaller model
- Reduce context window
- Close other applications
- Restart browser
