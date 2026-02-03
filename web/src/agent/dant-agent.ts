/**
 * Dant Agent - Main AI agent orchestrator
 * Combines LLM, RAG, and knowledge base for intelligent responses
 */

import { WASMLLMEngine } from '../llm/wasm-llm-engine';
import { RAGEngine } from '../knowledge/rag-engine';
import { IndexedDBVectorStore } from '../knowledge/indexeddb-vector-store';

export interface AgentConfig {
  useRAG?: boolean;
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  similarityThreshold?: number;
}

export interface AgentResponse {
  response: string;
  sources?: Array<{
    text: string;
    score: number;
    metadata?: any;
  }>;
  usedRAG?: boolean;
}

export class DantAgent {
  private llmEngine: WASMLLMEngine;
  private ragEngine: RAGEngine | null = null;
  private vectorStore: IndexedDBVectorStore | null = null;
  private config: Required<AgentConfig>;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private maxHistoryLength: number = 10;

  constructor(
    llmEngine: WASMLLMEngine,
    vectorStore?: IndexedDBVectorStore,
    config: AgentConfig = {}
  ) {
    this.llmEngine = llmEngine;
    this.vectorStore = vectorStore || null;
    
    this.config = {
      useRAG: config.useRAG ?? true,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 512,
      topK: config.topK ?? 3,
      similarityThreshold: config.similarityThreshold ?? 0.7
    };

    // Initialize RAG engine if vector store is available
    if (this.vectorStore && this.config.useRAG) {
      this.ragEngine = new RAGEngine(this.vectorStore, this.llmEngine, {
        topK: this.config.topK,
        similarityThreshold: this.config.similarityThreshold,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });
    }
  }

  /**
   * Process a query and generate a response
   */
  async processQuery(
    query: string,
    options: { stream?: boolean } = {}
  ): Promise<AgentResponse | AsyncGenerator<string, void, unknown>> {
    // Check if LLM is initialized
    if (!this.llmEngine.isModelLoaded()) {
      throw new Error('LLM model not initialized. Please initialize a model first in the Model Manager tab.');
    }

    // Use RAG if available and enabled
    if (this.ragEngine && this.config.useRAG) {
      if (options.stream) {
        // Return streaming generator
        return this.ragEngine.processQuery(query, { stream: true });
      } else {
        // Non-streaming RAG response
        const ragResponse = await this.ragEngine.processQuery(query, { stream: false });
        
        // Update conversation history
        this.addToHistory('user', query);
        this.addToHistory('assistant', ragResponse.response);

        return {
          response: ragResponse.response,
          sources: ragResponse.sources,
          usedRAG: true
        };
      }
    } else {
      // Fallback to LLM-only (no RAG)
      const prompt = this.buildPrompt(query);
      
      if (options.stream) {
        // Return streaming generator
        return this.llmEngine.generateStream(prompt, {
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        });
      } else {
        // Non-streaming response
        const response = await this.llmEngine.generate(prompt, {
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        });

        // Update conversation history
        this.addToHistory('user', query);
        this.addToHistory('assistant', response.text);

        return {
          response: response.text,
          usedRAG: false
        };
      }
    }
  }

  /**
   * Build prompt with conversation history
   */
  private buildPrompt(query: string): string {
    let prompt = `You are dant, a helpful and knowledgeable AI assistant focused on health consultation. You operate completely offline and have access to a local knowledge base.

When answering questions:
- Use information from your knowledge base when relevant
- Be concise but thorough
- If you don't know something, say so honestly
- Be friendly and conversational
- Remember that you operate completely offline and have no access to the internet
- For health questions, always remind users to consult with medical professionals for serious concerns

`;

    // Add conversation history
    if (this.conversationHistory.length > 0) {
      prompt += 'Previous conversation:\n';
      for (const msg of this.conversationHistory.slice(-this.maxHistoryLength)) {
        prompt += `${msg.role === 'user' ? 'User' : 'dant'}: ${msg.content}\n`;
      }
      prompt += '\n';
    }

    prompt += `User: ${query}\ndant:`;

    return prompt;
  }

  /**
   * Add message to conversation history
   */
  private addToHistory(role: 'user' | 'assistant', content: string): void {
    this.conversationHistory.push({ role, content });
    
    // Trim history if too long
    if (this.conversationHistory.length > this.maxHistoryLength * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Recreate RAG engine if config changed
    if (this.vectorStore && this.config.useRAG) {
      this.ragEngine = new RAGEngine(this.vectorStore, this.llmEngine, {
        topK: this.config.topK,
        similarityThreshold: this.config.similarityThreshold,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });
    }
  }

  /**
   * Set vector store (for dynamic loading)
   */
  setVectorStore(vectorStore: IndexedDBVectorStore): void {
    this.vectorStore = vectorStore;
    
    if (this.config.useRAG) {
      this.ragEngine = new RAGEngine(vectorStore, this.llmEngine, {
        topK: this.config.topK,
        similarityThreshold: this.config.similarityThreshold,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });
    }
  }
}
