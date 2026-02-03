# dant Architecture

> **Current Implementation**: This document describes the Progressive Web App (PWA) architecture.  
> For information about previous implementations, see [ARCHITECTURE.md](../ARCHITECTURE.md) and [archive/README.md](../archive/README.md).

## Overview

dant is a Progressive Web App (PWA) that provides offline AI health consultation. All processing happens client-side with no backend required.

## Core Principles

1. **Offline-First**: All processing happens client-side
2. **Privacy by Design**: Service Worker enforces offline operation
3. **Modular**: Separate downloads for LLM model and knowledge base
4. **Open Source**: Fully auditable codebase

## Technology Stack

### Frontend
- **React** + **TypeScript** for UI
- **Vite** for build tooling
- **PWA** capabilities via vite-plugin-pwa

### LLM Inference
- **WebLLM** or **llama.cpp WASM** for browser-based inference
- **Model**: Llama 3.2 3B Q4_0 quantized (1-2GB, separate download)

### Vector Database
- **IndexedDB** for vector storage
- **HNSW.js** for approximate nearest neighbor search
- **Pre-computed embeddings** for knowledge base

### Storage
- **IndexedDB**: Vectors, embeddings, metadata (3GB capacity)
- **Cache Storage API**: LLM model files (1-2GB)
- **Compression**: ZSTD via WASM

## Architecture Components

### 1. Service Worker
- Intercepts all network requests
- Blocks query-related traffic
- Allows knowledge base/model downloads
- Monitors network activity

### 2. LLM Engine
- WebAssembly-based inference
- Model loaded from Cache Storage
- Separate download (not bundled)

### 3. Vector Store
- IndexedDB-based storage
- HNSW.js for fast search
- Pre-computed embeddings

### 4. Knowledge Base
- Health knowledge base (3GB, compressed to ~1GB)
- Global health information
- Modular download via in-app downloader

## Data Flow

1. User asks question
2. Query processed locally (no network)
3. RAG retrieves relevant context from IndexedDB
4. LLM generates response using context
5. Response displayed to user
6. Zero bytes transmitted

## Privacy Guarantees

- No backend server
- No analytics or tracking
- No data collection
- Service Worker enforcement
- Network monitoring UI

## Development Phases

- **Phase 1**: Core Infrastructure ✅ (In Progress)
- **Phase 2**: LLM Integration
- **Phase 3**: Vector Database
- **Phase 4**: Knowledge Base System
- **Phase 5**: Polish & Documentation
