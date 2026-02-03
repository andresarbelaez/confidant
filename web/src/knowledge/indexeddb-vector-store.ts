/**
 * IndexedDB Vector Store - Browser-based vector database using IndexedDB and HNSW
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { loadHNSWLib } from './hnsw-loader';

interface VectorDocument {
  id: string;
  text: string;
  embedding: Float32Array;
  metadata: {
    source?: string;
    category?: string;
    [key: string]: any;
  };
}

interface VectorStoreSchema extends DBSchema {
  documents: {
    key: string;
    value: VectorDocument;
    indexes: { 'by-source': string; 'by-category': string };
  };
  embeddings: {
    key: string;
    value: {
      id: string;
      embedding: Float32Array;
    };
  };
}

export class IndexedDBVectorStore {
  private db: IDBPDatabase<VectorStoreSchema> | null = null;
  private dbName: string;
  private collectionName: string;
  private hnswIndex: any = null; // HNSW index instance
  private dimension: number;
  private isIndexLoaded: boolean = false;
  private labelToDocId: Map<number, string> = new Map(); // Map HNSW label IDs to document IDs
  private docIdToLabel: Map<string, number> = new Map(); // Map document IDs to HNSW label IDs
  private nextLabelId: number = 0;

  constructor(collectionName: string = 'dant_knowledge', dimension: number = 384) {
    this.dbName = 'dant_vector_store';
    this.collectionName = collectionName;
    this.dimension = dimension;
  }

  /**
   * Initialize the database and HNSW index
   */
  async initialize(): Promise<void> {
    try {
      // Open IndexedDB
      this.db = await openDB<VectorStoreSchema>(this.dbName, 1, {
        upgrade(db) {
          // Create documents object store
          if (!db.objectStoreNames.contains('documents')) {
            const docStore = db.createObjectStore('documents', { keyPath: 'id' });
            docStore.createIndex('by-source', 'metadata.source');
            docStore.createIndex('by-category', 'metadata.category');
          }

          // Create embeddings object store
          if (!db.objectStoreNames.contains('embeddings')) {
            db.createObjectStore('embeddings', { keyPath: 'id' });
          }
        },
      });

      // Initialize HNSW index
      await this.loadHNSWIndex();

      console.log('[Vector Store] Initialized successfully');
    } catch (error) {
      console.error('[Vector Store] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load or create HNSW index
   * Falls back to simple linear search if hnswlib-wasm is not available
   */
  private async loadHNSWIndex(): Promise<void> {
    try {
      // Try to import and load HNSW library
      let loadHnswlib: any;
      let useHNSW = false;
      
      // Try to load HNSW library (may fail if package not installed)
      const lib = await loadHNSWLib();
      
      if (lib) {
        // Create new HNSW index
        // Parameters: distance metric, dimension, maxElements, M, efConstruction, randomSeed
        this.hnswIndex = new lib.HierarchicalNSW('cosine', this.dimension);
        this.hnswIndex.initIndex(1000, 16, 200, 100); // maxElements, M, efConstruction, randomSeed
        useHNSW = true;
        console.log('[Vector Store] HNSW index initialized');
      } else {
        console.warn(
          '[Vector Store] hnswlib-wasm not available. Falling back to linear search. ' +
          'Install with: npm install hnswlib-wasm for better performance.'
        );
        // Set flag to use fallback
        this.hnswIndex = null;
        useHNSW = false;
      }
      
      if (!useHNSW) {
        // Fallback: we'll use linear search in the search method
        this.hnswIndex = null;
        console.log('[Vector Store] Using linear search fallback');
      } else {
        // Only set search parameter if HNSW is available
        this.hnswIndex.setEfSearch(32); // Set search parameter

        // Load existing vectors into index
        await this.rebuildIndex();
      }

      this.isIndexLoaded = true;
      console.log('[Vector Store] Index loaded');
    } catch (error) {
      console.error('[Vector Store] Failed to load HNSW index:', error);
      throw error;
    }
  }

  /**
   * Rebuild HNSW index from stored documents
   */
  private async rebuildIndex(): Promise<void> {
    if (!this.db || !this.hnswIndex) return;

    try {
      const documents = await this.db.getAll('documents');
      
      if (documents.length === 0) {
        return; // No documents to index
      }

      // Resize index if needed
      const maxElements = this.hnswIndex.getMaxElements();
      if (documents.length > maxElements) {
        this.hnswIndex.resizeIndex(documents.length);
      }

      // Add all vectors to index
      for (const doc of documents) {
        // Get or create label ID for this document
        let labelId = this.docIdToLabel.get(doc.id);
        if (labelId === undefined) {
          labelId = this.nextLabelId++;
          this.labelToDocId.set(labelId, doc.id);
          this.docIdToLabel.set(doc.id, labelId);
        }
        
        // Convert Float32Array to regular array for HNSW
        const embeddingArray = Array.from(doc.embedding);
        this.hnswIndex.addPoint(embeddingArray, labelId);
      }

      console.log(`[Vector Store] Rebuilt index with ${documents.length} vectors`);
    } catch (error) {
      console.error('[Vector Store] Failed to rebuild index:', error);
      throw error;
    }
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(
    documents: Array<{ text: string; embedding: Float32Array; metadata?: any }>,
    ids?: string[]
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    try {
      const tx = this.db.transaction(['documents', 'embeddings'], 'readwrite');
      
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const id = ids?.[i] || `doc_${Date.now()}_${i}`;

        // Validate embedding dimension
        if (doc.embedding.length !== this.dimension) {
          throw new Error(
            `Embedding dimension mismatch: expected ${this.dimension}, got ${doc.embedding.length}`
          );
        }

        const vectorDoc: VectorDocument = {
          id,
          text: doc.text,
          embedding: doc.embedding,
          metadata: doc.metadata || {}
        };

        // Store document
        await tx.store.put(vectorDoc);

        // Add to HNSW index if available
        if (this.hnswIndex) {
          const maxElements = this.hnswIndex.getMaxElements();
          if (this.hnswIndex.getCurrentCount() >= maxElements) {
            this.hnswIndex.resizeIndex(maxElements * 2);
          }
          
          // Get or create label ID for this document
          let labelId = this.docIdToLabel.get(id);
          if (labelId === undefined) {
            labelId = this.nextLabelId++;
            this.labelToDocId.set(labelId, id);
            this.docIdToLabel.set(id, labelId);
          }
          
          // Convert Float32Array to regular array for HNSW
          const embeddingArray = Array.from(doc.embedding);
          this.hnswIndex.addPoint(embeddingArray, labelId);
        }
      }

      await tx.done;
      console.log(`[Vector Store] Added ${documents.length} documents`);
    } catch (error) {
      console.error('[Vector Store] Failed to add documents:', error);
      throw error;
    }
  }

  /**
   * Search for similar documents
   */
  async search(
    queryEmbedding: Float32Array,
    topK: number = 5,
    filter?: { source?: string; category?: string }
  ): Promise<Array<{ document: VectorDocument; score: number }>> {
    if (!this.db) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    if (!this.isIndexLoaded) {
      await this.loadHNSWIndex();
    }

    try {
      // Validate embedding dimension
      if (queryEmbedding.length !== this.dimension) {
        throw new Error(
          `Query embedding dimension mismatch: expected ${this.dimension}, got ${queryEmbedding.length}`
        );
      }

      // Use HNSW if available, otherwise fallback to linear search
      if (this.hnswIndex) {
        // Convert query embedding to array for HNSW
        const queryArray = Array.from(queryEmbedding);
        
        // Search HNSW index
        // HNSW searchKnn returns array of [label, distance] pairs
        const searchResults = this.hnswIndex.searchKnn(queryArray, topK);
        
        // Convert results to our format
        const results = searchResults.map((result: any) => {
          let labelId: number;
          let distance: number;
          
          if (Array.isArray(result)) {
            // [label, distance] format
            labelId = result[0];
            distance = result[1];
          } else if (result && typeof result === 'object') {
            // Object format {label, distance}
            labelId = result.label || result.id;
            distance = result.distance || 0;
          } else {
            // Fallback
            labelId = result;
            distance = 0;
          }
          
          const docId = this.labelToDocId.get(labelId);
          if (!docId) {
            console.warn(`[Vector Store] No document ID found for label ${labelId}`);
            return null;
          }
          
          return {
            id: docId,
            distance: distance
          };
        }).filter((r): r is { id: string; distance: number } => r !== null);

        // Retrieve full documents
        const documents: Array<{ document: VectorDocument; score: number }> = [];
        
        for (const result of results) {
          // Get document by ID
          const doc = await this.db.get('documents', result.id);
          
          if (doc) {
            // Apply metadata filters if provided
            if (filter) {
              if (filter.source && doc.metadata.source !== filter.source) continue;
              if (filter.category && doc.metadata.category !== filter.category) continue;
            }
            
            documents.push({
              document: doc,
              score: 1 - result.distance // Convert distance to similarity (cosine)
            });
          }
        }

        return documents;
      } else {
        // Fallback: Linear search (slower but works without HNSW)
        console.log('[Vector Store] Using linear search (HNSW not available)');
        
        // Get all documents
        const allDocs = await this.db.getAll('documents');
        
        // Calculate cosine similarity for each document
        const similarities: Array<{ document: VectorDocument; score: number }> = [];
        
        for (const doc of allDocs) {
          // Apply filters if provided
          if (filter) {
            if (filter.source && doc.metadata.source !== filter.source) continue;
            if (filter.category && doc.metadata.category !== filter.category) continue;
          }
          
          // Calculate cosine similarity
          const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
          similarities.push({
            document: doc,
            score: score
          });
        }
        
        // Sort by score descending and return top K
        return similarities.sort((a, b) => b.score - a.score).slice(0, topK);
      }
    } catch (error) {
      console.error('[Vector Store] Search failed:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * Used for linear search fallback
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    
    return dotProduct / denominator;
  }

  /**
   * Get document by ID
   */
  async getById(id: string): Promise<VectorDocument | undefined> {
    if (!this.db) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    return await this.db.get('documents', id);
  }

  /**
   * Get multiple documents by IDs
   */
  async getByIds(ids: string[]): Promise<VectorDocument[]> {
    if (!this.db) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    const documents: VectorDocument[] = [];
    for (const id of ids) {
      const doc = await this.db.get('documents', id);
      if (doc) {
        documents.push(doc);
      }
    }
    return documents;
  }

  /**
   * Delete document by ID
   */
  async delete(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    try {
      await this.db.delete('documents', id);
      
      // Remove from ID mappings
      const labelId = this.docIdToLabel.get(id);
      if (labelId !== undefined) {
        this.labelToDocId.delete(labelId);
        this.docIdToLabel.delete(id);
      }
      
      // Note: HNSW doesn't support deletion, so we'll need to rebuild index
      // For now, we'll mark it for rebuild on next search
      this.isIndexLoaded = false;
      console.log(`[Vector Store] Deleted document: ${id}`);
    } catch (error) {
      console.error('[Vector Store] Failed to delete document:', error);
      throw error;
    }
  }

  /**
   * Get total number of documents
   */
  async count(): Promise<number> {
    if (!this.db) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    return await this.db.count('documents');
  }

  /**
   * Clear all documents
   */
  async clear(): Promise<void> {
    if (!this.db) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    try {
      await this.db.clear('documents');
      await this.db.clear('embeddings');
      
      // Clear ID mappings
      this.labelToDocId.clear();
      this.docIdToLabel.clear();
      this.nextLabelId = 0;
      
      // Recreate HNSW index
      this.hnswIndex = null;
      await this.loadHNSWIndex();
      
      console.log('[Vector Store] Cleared all documents');
    } catch (error) {
      console.error('[Vector Store] Failed to clear:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    documentCount: number;
    indexSize: number;
    storageSize: number;
  }> {
    if (!this.db) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    const documentCount = await this.count();
    const indexSize = this.hnswIndex ? this.hnswIndex.getCurrentCount() : 0;
    
    // Estimate storage size (rough calculation)
    const storageSize = documentCount * (this.dimension * 4 + 1000); // 4 bytes per float + text/metadata overhead

    return {
      documentCount,
      indexSize,
      storageSize
    };
  }
}
