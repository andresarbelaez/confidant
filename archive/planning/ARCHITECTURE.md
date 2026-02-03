# dant Architecture Overview

## Current Implementation: Progressive Web App (PWA)

dant is built as a **Progressive Web App** that runs entirely in the browser. All AI processing happens client-side with zero network access for queries.

### Technology Stack

- **Frontend**: React + TypeScript + Vite
- **LLM**: WebLLM (Llama 3.2 3B via WebAssembly)
- **Vector Database**: IndexedDB + HNSW.js (with linear search fallback)
- **Embeddings**: Pre-computed (server-side) + browser placeholder
- **Storage**: IndexedDB (documents), Cache Storage (models)
- **Service Worker**: Network blocking and offline enforcement

### Architecture Principles

1. **Offline-First**: All processing happens client-side
2. **Privacy-First**: Service Worker blocks query-related network traffic
3. **Open Source**: Fully auditable codebase
4. **Modular**: Knowledge bases are optional downloads

### Project Structure

```
dant/
├── web/                    # Main PWA application
│   ├── src/
│   │   ├── components/    # React UI components
│   │   ├── agent/         # AI agent orchestrator
│   │   ├── llm/           # LLM engine (WebLLM)
│   │   ├── knowledge/     # Vector store, RAG, embeddings
│   │   └── utils/         # Utilities
│   └── package.json
├── docs/                   # Current documentation
│   ├── architecture.md    # Detailed architecture
│   ├── setup.md          # Setup guide
│   └── ...
├── archive/                # Archived code and docs
│   ├── python-implementation/  # Original Python/Raspberry Pi code
│   └── analysis-docs/         # Historical analysis documents
└── README.md              # Main project README
```

### Key Components

#### 1. Service Worker (`web/src/service-worker.ts`)
- Intercepts network requests
- Blocks query-related traffic
- Allows whitelisted downloads (models, knowledge bases)
- Tracks network activity

#### 2. LLM Engine (`web/src/llm/wasm-llm-engine.ts`)
- Wraps WebLLM's MLCEngine
- Handles model initialization
- Provides streaming and non-streaming generation
- Uses Cache Storage for model persistence

#### 3. Vector Store (`web/src/knowledge/indexeddb-vector-store.ts`)
- IndexedDB for document storage
- HNSW.js for fast similarity search (with linear fallback)
- Metadata filtering
- Storage statistics

#### 4. RAG Engine (`web/src/knowledge/rag-engine.ts`)
- Retrieval Augmented Generation
- Combines vector search with LLM generation
- Context building from retrieved documents
- Streaming support

#### 5. Knowledge Base Loader (`web/src/knowledge/knowledge-loader.ts`)
- Loads knowledge base packages (JSON or .zst)
- Batch processing with progress tracking
- Validates package format
- Integrates with vector store

#### 6. Dant Agent (`web/src/agent/dant-agent.ts`)
- Main orchestrator
- Combines LLM + RAG
- Manages conversation history
- Health-focused system prompt

### Data Flow

1. **User Query** → Chat Interface
2. **Query Processing** → Dant Agent
3. **Embedding Generation** → Browser Embeddings (or pre-computed)
4. **Vector Search** → IndexedDB Vector Store
5. **Context Retrieval** → RAG Engine
6. **Response Generation** → LLM Engine (WebLLM)
7. **Response Display** → Chat Interface

### Knowledge Base Format

Knowledge bases are distributed as JSON packages containing:
- Manifest (metadata, version, sources)
- Documents (text, metadata)
- Pre-computed embeddings (384-dimensional)

See [docs/knowledge-base-format.md](docs/knowledge-base-format.md) for details.

### Development Phases

- ✅ **Phase 1**: Core Infrastructure (Service Worker, Network Monitor)
- ✅ **Phase 2**: LLM Integration (WebLLM, Model Manager)
- ✅ **Phase 3**: Vector Database (IndexedDB, HNSW, RAG)
- ✅ **Phase 4**: Knowledge Base System (Loader, Manager, Chat)
- 🚧 **Phase 5**: Polish & Testing

See [docs/implementation-status.md](docs/implementation-status.md) for detailed progress.

## Previous Implementations

### Python/Raspberry Pi Implementation (Archived)

The original implementation was a Python-based system designed for Raspberry Pi hardware. This code is archived in `archive/python-implementation/` for reference.

**Key Differences**:
- Python backend vs. browser-based
- ChromaDB vs. IndexedDB
- llama-cpp-python vs. WebLLM
- Audio I/O (STT/TTS) vs. text-only (for now)
- Desktop GUI vs. web UI

**Why Archived**: The project pivoted to a web app architecture to maximize accessibility and remove hardware barriers.

See [archive/README.md](archive/README.md) for more information about archived code.
