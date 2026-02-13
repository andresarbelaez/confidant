# Confidant Desktop App

Desktop application for Confidant — privacy-first, offline mental health companion.

## Tech stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Rust (Tauri 2.0) for app shell, file I/O, and model download
- **LLM**: llama-cpp-python (Python subprocess), GGUF models (Llama-3.2-3B default, Mistral-7B option)
- **RAG**: ChromaDB + sentence-transformers (Python subprocess)

## Prerequisites

- **Rust**: [rustup.rs](https://rustup.rs/)
- **Node.js**: 18+
- **Python**: 3.10+ with venv recommended (for LLM, ChromaDB, embeddings)

See [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) and [PYTHON_SETUP.md](PYTHON_SETUP.md) for full setup.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Project structure

```
desktop/
├── src/                  # React frontend
│   ├── agent/            # Chat agent (RAG + LLM)
│   ├── components/       # UI components
│   └── config/           # Model & KB options
├── src-tauri/
│   ├── src/              # Rust backend (Tauri, LLM bridge, vector store bridge)
│   └── scripts/          # Python: llama_helper, chromadb_helper, embeddings_helper
├── package.json
└── vite.config.ts
```
