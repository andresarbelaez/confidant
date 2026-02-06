/**
 * Knowledge Base Loader - Loads and processes knowledge base packages
 * Desktop version using Tauri commands
 */

import { invoke } from '@tauri-apps/api/core';

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
  embeddings: number[][];
}

export class KnowledgeBaseLoader {
  /**
   * Get manifest from knowledge base file
   */
  async getManifest(file: File): Promise<KnowledgeBaseManifest> {
    try {
      let data: any;
      
      // Check if file is ZSTD compressed
      if (file.name.endsWith('.zst')) {
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

  /**
   * Load knowledge base from file
   */
  async loadFromFile(file: File, onProgress?: (progress: number) => void): Promise<void> {
    try {
      onProgress?.(0.1);
      
      let data: any;
      
      // Check if file is ZSTD compressed
      if (file.name.endsWith('.zst')) {
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
      
      // Load into vector store via Tauri
      await this.loadIntoVectorStore(package_, (progress) => {
        onProgress?.(0.5 + progress * 0.5);
      });
      
      onProgress?.(1.0);
      
    } catch (error) {
      console.error('[Knowledge Loader] Failed to load knowledge base:', error);
      throw error;
    }
  }

  /**
   * Load knowledge base from URL
   */
  async loadFromURL(url: string, onProgress?: (progress: number) => void, collectionName?: string): Promise<void> {
    try {
      onProgress?.(0.1);
      
      // Fetch file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const blob = await response.blob();
      const text = await blob.text();
      const data = JSON.parse(text);

      onProgress?.(0.5);

      // Parse and load
      const package_ = this.parsePackage(data);
      await this.loadIntoVectorStore(package_, (progress) => {
        onProgress?.(0.5 + progress * 0.5);
      }, collectionName);

      onProgress?.(1.0);

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

    return {
      manifest,
      documents,
      embeddings
    };
  }

  /**
   * Load package into vector store via Tauri
   */
  private async loadIntoVectorStore(
    package_: KnowledgeBasePackage,
    onProgress?: (progress: number) => void,
    collectionName?: string
  ): Promise<void> {
    const { documents, embeddings } = package_;
    const batchSize = 50; // Smaller batches for Tauri IPC
    const totalBatches = Math.ceil(documents.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, documents.length);
      const batch = documents.slice(start, end);
      const batchEmbeddings = embeddings.slice(start, end);

      // Convert embeddings to Vec<f32> format for Rust
      const vectorDocs = batch.map((doc, idx) => ({
        id: doc.id,
        text: doc.text,
        embedding: batchEmbeddings[idx] || [],
        metadata: doc.metadata || {}
      }));

      // Add documents via Tauri command (use collection-specific command if provided)
      if (collectionName) {
        await invoke('add_documents_to_collection', { 
          collectionName, 
          documents: vectorDocs 
        });
      } else {
        await invoke('add_documents', { documents: vectorDocs });
      }

      onProgress?.((i + 1) / totalBatches);
    }
  }
}
