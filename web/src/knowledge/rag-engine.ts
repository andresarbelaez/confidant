/**
 * RAG Engine - Retrieval Augmented Generation
 * Combines vector search with LLM to provide context-aware responses
 */

import { IndexedDBVectorStore } from './indexeddb-vector-store';
import { WASMLLMEngine } from '../llm/wasm-llm-engine';
import { BrowserEmbeddingGenerator } from './browser-embeddings';

export interface RAGConfig {
  topK?: number;
  similarityThreshold?: number;
  maxContextLength?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface RAGResponse {
  response: string;
  sources: Array<{
    text: string;
    score: number;
    metadata?: any;
  }>;
  contextUsed: string;
}

export class RAGEngine {
  private vectorStore: IndexedDBVectorStore;
  private llmEngine: WASMLLMEngine;
  private embeddingGenerator: BrowserEmbeddingGenerator;
  private config: Required<RAGConfig>;

  constructor(
    vectorStore: IndexedDBVectorStore,
    llmEngine: WASMLLMEngine,
    config: RAGConfig = {}
  ) {
    this.vectorStore = vectorStore;
    this.llmEngine = llmEngine;
    this.embeddingGenerator = new BrowserEmbeddingGenerator(384); // Default dimension
    
    this.config = {
      topK: config.topK ?? 3,
      similarityThreshold: config.similarityThreshold ?? 0.7,
      maxContextLength: config.maxContextLength ?? 2000,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 512
    };
  }

  /**
   * Process a query using RAG
   */
  async processQuery(
    query: string,
    options: { stream?: boolean; filter?: { source?: string; category?: string } } = {}
  ): Promise<RAGResponse | AsyncGenerator<string, void, unknown>> {
    // For MVP: Use placeholder embedding (will be replaced with actual embedding model)
    // TODO: Implement actual embedding generation or use pre-computed query embeddings
    const queryEmbedding = await this.embeddingGenerator.generate(query);

    // Search for relevant documents
    const searchResults = await this.vectorStore.search(
      queryEmbedding,
      this.config.topK,
      options.filter
    );

    // Filter by similarity threshold
    const relevantDocs = searchResults.filter(
      result => result.score >= this.config.similarityThreshold
    );

    if (relevantDocs.length === 0) {
      // No relevant context found, use LLM without context
      return this.generateWithoutContext(query, options.stream || false);
    }

    // Build context from retrieved documents
    const context = this.buildContext(relevantDocs);

    // Generate response with context
    if (options.stream) {
      return this.generateStreaming(query, context);
    } else {
      return this.generate(query, context, relevantDocs);
    }
  }

  /**
   * Build context string from retrieved documents
   */
  private buildContext(docs: Array<{ document: any; score: number }>): string {
    let context = '';
    let totalLength = 0;

    for (const result of docs) {
      const docText = result.document.text;
      const docLength = docText.length;

      if (totalLength + docLength > this.config.maxContextLength) {
        // Truncate if needed
        const remaining = this.config.maxContextLength - totalLength;
        context += docText.substring(0, remaining) + '\n\n';
        break;
      }

      context += docText + '\n\n';
      totalLength += docLength;
    }

    return context.trim();
  }

  /**
   * Generate response with context
   */
  private async generate(
    query: string,
    context: string,
    sources: Array<{ document: any; score: number }>
  ): Promise<RAGResponse> {
    const prompt = this.buildPrompt(query, context);

    const llmResponse = await this.llmEngine.generate(prompt, {
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens
    });

    return {
      response: llmResponse.text,
      sources: sources.map(s => ({
        text: s.document.text.substring(0, 200) + '...', // Preview
        score: s.score,
        metadata: s.document.metadata
      })),
      contextUsed: context
    };
  }

  /**
   * Generate streaming response with context
   */
  private async *generateStreaming(
    query: string,
    context: string
  ): AsyncGenerator<string, void, unknown> {
    const prompt = this.buildPrompt(query, context);

    for await (const chunk of this.llmEngine.generateStream(prompt, {
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens
    })) {
      yield chunk;
    }
  }

  /**
   * Generate response without context (fallback)
   */
  private async generateWithoutContext(
    query: string,
    stream: boolean
  ): Promise<RAGResponse | AsyncGenerator<string, void, unknown>> {
    const prompt = `You are dant, a helpful AI assistant. Answer the following question based on your training data:\n\nQuestion: ${query}\n\nAnswer:`;

    if (stream) {
      return this.llmEngine.generateStream(prompt, {
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });
    } else {
      const response = await this.llmEngine.generate(prompt, {
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      return {
        response: response.text,
        sources: [],
        contextUsed: ''
      };
    }
  }

  /**
   * Build prompt with context
   */
  private buildPrompt(query: string, context: string): string {
    return `You are dant, a helpful AI assistant with access to a knowledge base. Use the following context to answer the question. If the context doesn't contain relevant information, use your general knowledge.

Context from knowledge base:
${context}

Question: ${query}

Answer based on the context above:`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
