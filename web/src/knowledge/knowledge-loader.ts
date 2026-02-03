/**
 * Knowledge Base Loader - Loads and processes knowledge base packages
 */

import { IndexedDBVectorStore } from './indexeddb-vector-store';
import { PrecomputedEmbeddingLoader } from './browser-embeddings';

export interface KnowledgeBaseManifest {
  version: string;
  name: string;
  description: string;
  documentCount: number;
  embeddingDimension: number;
  createdAt: string;
  sources: string[];
}

export interface KnowledgeBasePackage {
  manifest: KnowledgeBaseManifest;
  documents: Array<{ id: string; text: string; metadata: any }>;
  embeddings: Float32Array[];
}

export class KnowledgeBaseLoader {
  private vectorStore: IndexedDBVectorStore;

  constructor(vectorStore: IndexedDBVectorStore) {
    this.vectorStore = vectorStore;
  }

  /**
   * Load knowledge base from a File (user upload)
   */
  async loadFromFile(file: File, onProgress?: (progress: number) => void): Promise<void> {
    try {
      onProgress?.(0.1);
      
      let data: any;
      
      // Check if file is ZSTD compressed
      if (file.name.endsWith('.zst')) {
        // TODO: Implement ZSTD decompression
        // For now, throw error asking for uncompressed file
        throw new Error('ZSTD compression not yet supported. Please use an uncompressed JSON file for now.');
      } else {
        // Read JSON file
        const text = await file.text();
        data = JSON.parse(text);
      }
      
      onProgress?.(0.3);
      
      // Parse package
      const package_ = this.parsePackage(data);
      
      onProgress?.(0.5);
      
      // Load into vector store
      await this.loadIntoVectorStore(package_, (progress) => {
        onProgress?.(0.5 + progress * 0.5);
      });
      
      onProgress?.(1.0);
      
      console.log('[Knowledge Loader] Loaded knowledge base:', package_.manifest.name);
    } catch (error) {
      console.error('[Knowledge Loader] Failed to load knowledge base:', error);
      throw error;
    }
  }

  /**
   * Load knowledge base from URL (download)
   */
  async loadFromURL(
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      onProgress?.(0.1);
      
      // Fetch file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      // Read with progress tracking
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        received += value.length;

        if (total > 0) {
          onProgress?.(0.1 + (received / total) * 0.4);
        }
      }

      // Combine chunks
      const blob = new Blob(chunks);
      const text = await blob.text();
      const data = JSON.parse(text);

      onProgress?.(0.5);

      // Parse and load
      const package_ = this.parsePackage(data);
      await this.loadIntoVectorStore(package_, (progress) => {
        onProgress?.(0.5 + progress * 0.5);
      });

      onProgress?.(1.0);

      console.log('[Knowledge Loader] Loaded knowledge base from URL:', package_.manifest.name);
    } catch (error) {
      console.error('[Knowledge Loader] Failed to load from URL:', error);
      throw error;
    }
  }

  /**
   * Parse knowledge base package
   */
  private parsePackage(data: any): KnowledgeBasePackage {
    const manifest: KnowledgeBaseManifest = data.manifest;
    const documents = data.documents || [];
    const embeddings = data.embeddings || [];

    // Convert embeddings to Float32Array if needed
    const embeddingsArray = embeddings.map((emb: number[] | Float32Array) => {
      if (emb instanceof Float32Array) {
        return emb;
      }
      return new Float32Array(emb);
    });

    return {
      manifest,
      documents,
      embeddings: embeddingsArray
    };
  }

  /**
   * Load package into vector store
   */
  private async loadIntoVectorStore(
    package_: KnowledgeBasePackage,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const { documents, embeddings } = package_;
    const batchSize = 100;
    const totalBatches = Math.ceil(documents.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, documents.length);
      const batch = documents.slice(start, end);
      const batchEmbeddings = embeddings.slice(start, end);

      const vectorDocs = batch.map((doc, idx) => ({
        text: doc.text,
        embedding: batchEmbeddings[start + idx],
        metadata: doc.metadata || {}
      }));

      const ids = batch.map(doc => doc.id);

      await this.vectorStore.addDocuments(vectorDocs, ids);

      onProgress?.((i + 1) / totalBatches);
    }
  }

  /**
   * Get knowledge base manifest from file
   */
  async getManifest(file: File): Promise<KnowledgeBaseManifest> {
    try {
      let data: any;
      
      // Check if file is ZSTD compressed
      if (file.name.endsWith('.zst')) {
        // TODO: Implement ZSTD decompression for manifest reading
        throw new Error('ZSTD compression not yet supported. Please use an uncompressed JSON file for now.');
      } else {
        // Read JSON file (just first part to get manifest)
        const text = await file.text();
        data = JSON.parse(text);
      }
      
      if (!data.manifest) {
        throw new Error('Invalid knowledge base format: missing manifest');
      }
      
      return data.manifest;
    } catch (error) {
      console.error('[Knowledge Loader] Failed to read manifest:', error);
      throw error;
    }
  }
}
