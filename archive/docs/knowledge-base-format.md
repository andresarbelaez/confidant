# Knowledge Base Format Specification

## Overview

Knowledge bases for dant are distributed as JSON packages (or compressed .zst files) containing documents, pre-computed embeddings, and metadata.

## Package Structure

### JSON Format (Uncompressed)

```json
{
  "manifest": {
    "version": "1.0.0",
    "name": "dant-health-v1",
    "description": "Global health knowledge base for dant",
    "documentCount": 10000,
    "embeddingDimension": 384,
    "createdAt": "2026-01-22T00:00:00Z",
    "sources": [
      "Wikipedia Medical Articles",
      "WHO Guidelines",
      "Public Health Databases"
    ]
  },
  "documents": [
    {
      "id": "doc_1",
      "text": "Document text content...",
      "metadata": {
        "source": "health",
        "category": "general",
        "title": "Document Title"
      }
    }
  ],
  "embeddings": [
    [0.123, 0.456, ...],  // 384-dimensional embedding
    [0.789, 0.012, ...]
  ]
}
```

### Compressed Format (.zst)

- Zstandard (ZSTD) compression
- Same structure as JSON, but compressed
- Reduces 3GB → ~1GB, 7GB → ~2.5GB
- Decompression happens client-side

## Manifest Schema

```typescript
interface KnowledgeBaseManifest {
  version: string;              // Semantic version (e.g., "1.0.0")
  name: string;                 // Knowledge base name
  description: string;           // Human-readable description
  documentCount: number;         // Total number of documents
  embeddingDimension: number;   // Embedding vector size (typically 384)
  createdAt: string;            // ISO 8601 timestamp
  sources: string[];            // List of data sources
}
```

## Document Schema

```typescript
interface Document {
  id: string;                   // Unique document identifier
  text: string;                 // Document text content
  metadata: {
    source?: string;            // Source identifier (e.g., "health", "legal")
    category?: string;          // Category (e.g., "general", "emergency")
    title?: string;            // Document title
    [key: string]: any;        // Additional metadata
  };
}
```

## Embeddings Format

- **Type**: Array of numbers (Float32)
- **Dimension**: 384 (for all-MiniLM-L6-v2) or custom
- **Format**: Nested arrays `[[...], [...], ...]`
- **Order**: Must match documents array order

## Building Knowledge Bases

### Server-Side Process

1. **Collect Documents**
   - Scrape/crawl health sources
   - Clean and normalize text
   - Extract metadata

2. **Generate Embeddings**
   - Use sentence-transformers (all-MiniLM-L6-v2)
   - Generate embeddings for all documents
   - Store as Float32Array

3. **Build HNSW Index** (Optional)
   - Can be rebuilt client-side
   - Speeds up initial load

4. **Package**
   - Create manifest
   - Combine documents + embeddings
   - Compress with ZSTD (optional)

5. **Validate**
   - Check document count matches
   - Verify embedding dimensions
   - Test loading

## Loading Process

### Client-Side

1. **Read File/Download**
   - Read JSON or decompress .zst
   - Parse manifest
   - Validate format

2. **Parse Package**
   - Extract documents
   - Convert embeddings to Float32Array
   - Validate dimensions

3. **Load into Vector Store**
   - Batch load documents (100 at a time)
   - Add to IndexedDB
   - Build HNSW index
   - Show progress

## File Size Estimates

### Health Knowledge Base (3GB target)

- **Documents**: ~10,000-50,000 documents
- **Text**: ~2GB (average 40-200KB per document)
- **Embeddings**: ~15MB per 10,000 documents (384 dims × 4 bytes × 10K)
- **Metadata**: ~50-100MB
- **Total Uncompressed**: ~3GB
- **Compressed (ZSTD)**: ~1GB

### Legal Knowledge Base (7GB target)

- **Documents**: ~50,000-200,000 documents
- **Text**: ~6GB
- **Embeddings**: ~75MB per 50,000 documents
- **Metadata**: ~200-500MB
- **Total Uncompressed**: ~7GB
- **Compressed (ZSTD)**: ~2.5GB

## Distribution

### GitHub Releases

- Release knowledge base packages as assets
- Include checksums for integrity
- Version tagging

### CDN (Optional)

- Mirror on CDN for faster downloads
- User choice (privacy-conscious users may prefer direct download)

### Self-Hosting

- Users can host knowledge bases themselves
- Support custom URLs
- Privacy-first option

## Validation

### Format Validation

- Manifest structure
- Document count matches
- Embedding dimensions match
- Document-embedding alignment

### Content Validation

- Text quality
- Metadata completeness
- Source attribution
- Licensing compliance

## Future Enhancements

- **Incremental Updates**: Delta packages for updates
- **Multi-language**: Support for multiple languages
- **Specialized Packs**: Disease-specific, region-specific
- **User Contributions**: Allow users to add documents
