# Vector Database Guide

## Overview

dant uses IndexedDB for storing vector embeddings and documents, with HNSW (Hierarchical Navigable Small World) for fast approximate nearest neighbor search.

## Architecture

### Components

1. **IndexedDBVectorStore** (`src/knowledge/indexeddb-vector-store.ts`)
   - IndexedDB for persistent storage
   - HNSW index for fast similarity search
   - Document and embedding storage

2. **RAGEngine** (`src/knowledge/rag-engine.ts`)
   - Retrieval Augmented Generation
   - Combines vector search with LLM
   - Context-aware response generation

3. **KnowledgeBaseLoader** (`src/knowledge/knowledge-loader.ts`)
   - Loads knowledge base packages
   - Handles file uploads and URL downloads
   - Processes compressed packages

## Usage

### Initialize Vector Store

```typescript
import { IndexedDBVectorStore } from './knowledge/indexeddb-vector-store';

const vectorStore = new IndexedDBVectorStore('dant_knowledge', 384);
await vectorStore.initialize();
```

### Add Documents

```typescript
const documents = [
  {
    text: 'Health information...',
    embedding: new Float32Array(384), // Pre-computed embedding
    metadata: { source: 'health', category: 'general' }
  }
];

await vectorStore.addDocuments(documents, ['doc_1']);
```

### Search

```typescript
const queryEmbedding = new Float32Array(384); // Query embedding

const results = await vectorStore.search(queryEmbedding, 5, {
  source: 'health' // Optional filter
});

// Results contain documents with similarity scores
results.forEach(result => {
  console.log(result.document.text);
  console.log(result.score); // Similarity score (0-1)
});
```

### RAG Query

```typescript
import { RAGEngine } from './knowledge/rag-engine';
import { WASMLLMEngine } from './llm/wasm-llm-engine';

const llmEngine = new WASMLLMEngine();
await llmEngine.initialize('Llama-3.2-3B-Instruct-q4f16_1-MLC');

const ragEngine = new RAGEngine(vectorStore, llmEngine);

// Non-streaming
const response = await ragEngine.processQuery('What is diabetes?');
console.log(response.response);
console.log(response.sources);

// Streaming
for await (const chunk of ragEngine.processQuery('What is diabetes?', { stream: true })) {
  process.stdout.write(chunk);
}
```

## Storage

### IndexedDB Structure

- **documents**: Stores full document objects with text, embeddings, and metadata
- **embeddings**: Stores embeddings separately (for faster access)
- **Indexes**: By source and category for filtering

### HNSW Index

- Fast approximate nearest neighbor search
- Cosine similarity for semantic search
- Automatically grows as documents are added

## Performance

- **Search Speed**: <10ms for typical queries (with HNSW)
- **Storage**: ~4KB per document (text + embedding + metadata)
- **Capacity**: Limited by browser storage quota (typically 50% of disk space)

## Knowledge Base Format

Knowledge bases are distributed as compressed packages containing:

- **manifest.json**: Metadata, version, document count
- **documents.jsonl**: Document texts and metadata
- **embeddings.bin**: Pre-computed embeddings (binary format)
- **index.hnsw**: Optional HNSW index (can be rebuilt)

## Loading Knowledge Bases

### From File

```typescript
import { KnowledgeBaseLoader } from './knowledge/knowledge-loader';

const loader = new KnowledgeBaseLoader(vectorStore);
await loader.loadFromFile(file, (progress) => {
  console.log(`Loading: ${(progress * 100).toFixed(1)}%`);
});
```

### From URL

```typescript
await loader.loadFromURL('https://example.com/knowledge-base.json', (progress) => {
  console.log(`Downloading: ${(progress * 100).toFixed(1)}%`);
});
```

## Troubleshooting

### Index Not Loading

- Check browser console for errors
- Verify IndexedDB is available
- Check storage quota

### Slow Search

- Rebuild HNSW index
- Reduce topK parameter
- Check document count

### Out of Storage

- Delete unused knowledge bases
- Use smaller knowledge bases
- Clear browser storage
