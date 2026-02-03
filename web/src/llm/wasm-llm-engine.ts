/**
 * WASM LLM Engine - WebAssembly-based LLM inference using WebLLM
 */

import { CreateMLCEngine, MLCEngine, InitProgressCallback } from '@mlc-ai/web-llm';

export interface LLMConfig {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  text: string;
  finishReason?: string;
}

export class WASMLLMEngine {
  private engine: MLCEngine | null = null;
  private modelName: string | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the LLM engine with a model
   */
  async initialize(modelName: string, progressCallback?: (progress: number) => void): Promise<void> {
    if (this.isInitialized && this.modelName === modelName) {
      console.log('[LLM Engine] Model already initialized:', modelName);
      return;
    }

    console.log('[LLM Engine] Initializing model:', modelName);

    try {
      // Create progress callback
      const initProgressCallback: InitProgressCallback = (report) => {
        if (progressCallback) {
          // Calculate progress percentage
          const progress = report.progress / report.text.length;
          progressCallback(progress);
        }
        console.log('[LLM Engine] Init progress:', report);
      };

      // Create MLCEngine instance
      // WebLLM will download models from HuggingFace CDN and cache them
      console.log('[LLM Engine] Creating MLCEngine for model:', modelName);
      console.log('[LLM Engine] This will download from HuggingFace CDN');
      console.log('[LLM Engine] Model will be cached in browser Cache Storage');
      
      try {
        // Check for service worker before initializing
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          console.warn('[LLM Engine] ⚠️ Service worker is active - this may interfere with model downloads');
          console.warn('[LLM Engine] Unregister it in DevTools → Application → Service Workers');
        }
        
        this.engine = await CreateMLCEngine(modelName, {
          initProgressCallback
        });
        
        this.modelName = modelName;
        this.isInitialized = true;
        
        console.log('[LLM Engine] Model initialized successfully');
      } catch (createError: any) {
        // Provide more detailed error information
        console.error('[LLM Engine] CreateMLCEngine failed:', createError);
        console.error('[LLM Engine] Full error details:', {
          name: createError?.name,
          message: createError?.message,
          stack: createError?.stack
        });
        
        // Check for quota exceeded error
        if (createError?.name === 'QuotaExceededError' || createError?.message?.includes('Quota')) {
          console.error('[LLM Engine] ❌ Storage Quota Exceeded!');
          console.error('[LLM Engine] The model requires ~2GB of free browser storage.');
          console.error('[LLM Engine]');
          console.error('[LLM Engine] Solutions:');
          console.error('[LLM Engine] 1. Clear Cache Storage: DevTools → Application → Cache Storage → Delete all');
          console.error('[LLM Engine] 2. Clear site data: DevTools → Application → Storage → Clear site data');
          console.error('[LLM Engine] 3. If in incognito mode, try regular window (incognito has lower storage limits)');
          console.error('[LLM Engine] 4. Free up space by clearing other site data');
        }
        // Check if it's a Cache API error
        else if (createError?.message?.includes('Cache') || createError?.name === 'NetworkError') {
          console.error('[LLM Engine] Cache API error detected');
          console.error('[LLM Engine] Troubleshooting steps:');
          console.error('[LLM Engine] 1. Check Network tab - are requests to huggingface.co succeeding?');
          console.error('[LLM Engine] 2. Check for CORS errors in console');
          console.error('[LLM Engine] 3. Check browser storage (DevTools → Application → Storage)');
          console.error('[LLM Engine] 4. Ensure service worker is unregistered (DevTools → Application → Service Workers)');
          console.error('[LLM Engine] 5. Try in incognito/private window to rule out extensions');
          
          // Check if service worker is active
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              if (regs.length > 0 || navigator.serviceWorker.controller) {
                console.error('[LLM Engine] ❌ Service worker is still active! This is likely the cause.');
                console.error('[LLM Engine] Action: Go to DevTools → Application → Service Workers → Unregister');
                console.error('[LLM Engine] Then reload the page');
              }
            });
          }
        }
        
        throw createError;
      }
    } catch (error: any) {
      console.error('[LLM Engine] Initialization failed:', error);
      const errorMessage = error?.message || String(error);
      throw new Error(`Failed to initialize LLM model: ${errorMessage}`);
    }
  }

  /**
   * Generate a response from the LLM
   */
  async generate(
    prompt: string,
    config: LLMConfig = {}
  ): Promise<LLMResponse> {
    if (!this.isInitialized || !this.engine) {
      throw new Error('LLM engine not initialized. Call initialize() first.');
    }

    const {
      temperature = 0.7,
      top_p = 0.9,
      max_tokens = 512,
      stream = false
    } = config;

    try {
      // Ensure we're in offline mode (safety check)
      if (navigator.onLine) {
        console.warn('[LLM Engine] Network is online, but processing locally');
      }

      if (stream) {
        // Streaming generation
        const chunks: string[] = [];
        const response = await this.engine.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature,
          top_p,
          max_gen_len: max_tokens,
          stream: true
        });

        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            chunks.push(content);
          }
        }

        return {
          text: chunks.join(''),
          finishReason: 'stop'
        };
      } else {
        // Non-streaming generation
        const response = await this.engine.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature,
          top_p,
          max_gen_len: max_tokens
        });

        return {
          text: response.choices[0]?.message?.content || '',
          finishReason: response.choices[0]?.finish_reason
        };
      }
    } catch (error) {
      console.error('[LLM Engine] Generation failed:', error);
      throw new Error(`Failed to generate response: ${error}`);
    }
  }

  /**
   * Generate a streaming response
   */
  async *generateStream(
    prompt: string,
    config: LLMConfig = {}
  ): AsyncGenerator<string, void, unknown> {
    if (!this.isInitialized || !this.engine) {
      throw new Error('LLM engine not initialized. Call initialize() first.');
    }

    const {
      temperature = 0.7,
      top_p = 0.9,
      max_tokens = 512
    } = config;

    try {
      const response = await this.engine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        temperature,
        top_p,
        max_gen_len: max_tokens,
        stream: true
      });

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('[LLM Engine] Streaming generation failed:', error);
      throw new Error(`Failed to generate streaming response: ${error}`);
    }
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(): boolean {
    return this.isInitialized && this.engine !== null;
  }

  /**
   * Get current model name
   */
  getModelName(): string | null {
    return this.modelName;
  }

  /**
   * Unload the current model
   */
  async unload(): Promise<void> {
    if (this.engine) {
      // WebLLM doesn't have explicit unload, but we can clear the reference
      this.engine = null;
      this.modelName = null;
      this.isInitialized = false;
      console.log('[LLM Engine] Model unloaded');
    }
  }
}
