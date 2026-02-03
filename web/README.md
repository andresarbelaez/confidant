# dant Web App

Progressive Web App (PWA) for offline AI health consultation.

## Setup

### Prerequisites

- Node.js 18+ and npm
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+)

### Installation

```bash
npm install
```

**Note**: If you encounter an error about `hnswlib-wasm` not being found, this is expected. The app will work with a fallback to linear search. To install the optional dependency for better performance:

```bash
npm install hnswlib-wasm
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Optional Dependencies

### hnswlib-wasm

**Status**: Optional (app works without it)

**Purpose**: Provides fast approximate nearest neighbor search for the vector database.

**Installation**:
```bash
npm install hnswlib-wasm
```

**Fallback**: If not installed, the app uses linear search (slower but functional).

**When to install**: Install if you plan to use large knowledge bases (>1000 documents) for better search performance.

## Project Structure

```
web/
├── src/
│   ├── components/      # React UI components
│   ├── agent/          # AI agent orchestrator
│   ├── llm/            # LLM engine (WebLLM)
│   ├── knowledge/       # Vector store, RAG, embeddings
│   └── utils/          # Utilities
├── public/             # Static assets
└── package.json
```

## Features

- ✅ Offline-first architecture
- ✅ Service Worker network blocking
- ✅ LLM model management
- ✅ Knowledge base management
- ✅ Chat interface with RAG
- ✅ Vector database with HNSW (optional)

## Troubleshooting

### "Failed to resolve import hnswlib-wasm"

This is expected if the package isn't installed. The app will use linear search as a fallback. To install:

```bash
npm install hnswlib-wasm
```

### Model download issues

WebLLM handles model downloads automatically. Check browser console for errors. Ensure you have sufficient storage space.

### Service Worker not working

- Clear browser cache
- Unregister old service workers in DevTools → Application → Service Workers
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

## Development Notes

- The app uses dynamic imports for optional dependencies
- Service Worker enforces offline operation
- All AI processing happens client-side
- No backend required
