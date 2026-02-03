/**
 * Browser Embeddings - Generate embeddings in the browser for user documents
 * Note: Knowledge base embeddings are pre-computed and included in the download package
 */

// For now, we'll use a placeholder implementation
// In the future, this could use ONNX.js or TensorFlow.js to run sentence-transformers in browser

export interface EmbeddingGenerator {
  generate(text: string): Promise<Float32Array>;
  generateBatch(texts: string[]): Promise<Float32Array[]>;
}

/**
 * Placeholder embedding generator
 * TODO: Implement actual embedding generation using ONNX.js or TensorFlow.js
 */
export class BrowserEmbeddingGenerator implements EmbeddingGenerator {
  private dimension: number;

  constructor(dimension: number = 384) {
    this.dimension = dimension;
  }

  /**
   * Generate embedding for a single text
   * TODO: Implement actual embedding model using ONNX.js or TensorFlow.js
   * 
   * For MVP: This is a placeholder. In production, this should:
   * 1. Load sentence-transformers model (e.g., all-MiniLM-L6-v2)
   * 2. Run inference in browser
   * 3. Return actual embeddings
   * 
   * For now, returns a simple hash-based embedding as a workaround
   */
  async generate(text: string): Promise<Float32Array> {
    // Placeholder: Create a simple hash-based embedding
    // This is NOT a real embedding, but allows RAG to work for testing
    // In production, replace with actual embedding model
    console.warn('[Embeddings] Using placeholder embedding - replace with actual model for production');
    
    // Simple hash-based embedding (not semantic, but allows testing)
    const embedding = new Float32Array(this.dimension);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    
    // Fill embedding with hash-based values
    for (let i = 0; i < this.dimension; i++) {
      embedding[i] = Math.sin((hash + i) * 0.01) * 0.1;
    }
    
    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) {
        embedding[i] = embedding[i] / norm;
      }
    }
    
    return embedding;
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateBatch(texts: string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map(text => this.generate(text)));
  }
}

/**
 * Pre-computed embeddings loader
 * Used for knowledge base embeddings that are included in the download package
 */
export class PrecomputedEmbeddingLoader {
  /**
   * Load embeddings from binary format
   */
  static async loadFromBinary(data: ArrayBuffer, count: number, dimension: number): Promise<Float32Array[]> {
    const embeddings: Float32Array[] = [];
    const view = new DataView(data);
    const floatSize = 4; // 4 bytes per float32

    for (let i = 0; i < count; i++) {
      const embedding = new Float32Array(dimension);
      const offset = i * dimension * floatSize;

      for (let j = 0; j < dimension; j++) {
        embedding[j] = view.getFloat32(offset + j * floatSize, true); // little-endian
      }

      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Load embeddings from JSON format
   */
  static async loadFromJSON(data: number[][]): Promise<Float32Array[]> {
    return data.map(arr => new Float32Array(arr));
  }
}
