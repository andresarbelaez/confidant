# Confidant - Offline AI Assistant

**Confidant** is an open-source, privacy-first AI assistant that provides offline AI health consultation. All processing happens locally with no network access for queries.

> **Note**: This project has evolved from an original Python-based Raspberry Pi implementation to a web app, and is now being migrated to a desktop app (Tauri 2.0) to eliminate browser limitations. See [archive/README.md](archive/README.md) for information about previous implementations.

## Features

- **Fully Offline**: All AI processing happens client-side, no backend required
- **Privacy-First**: All processing is local; no data is sent to external servers
- **Health & Legal**: Optimized for health and legal questions with RAG over your knowledge base
- **Local LLM**: Runs optimized models locally (Mistral-7B-Instruct default, Llama-3.2-3B option)
- **RAG System**: Retrieval Augmented Generation with ChromaDB and sentence-transformers
- **Open Source**: MIT license; fully auditable codebase

## AI Models

Confidant supports two optimized LLM models, selected for their performance on health and legal questions:

### Enhanced Model (Default)
- **Mistral-7B-Instruct v0.2** (~4.4GB)
- **Why**: Achieves 63% accuracy on MedQA (medical question answering), approaching Med-PaLM performance
- **Best for**: Users who want the highest quality medical and legal responses
- **Performance**: Strong reasoning capabilities, optimized for health consultation

### Standard Model (Optional)
- **Llama-3.2-3B-Instruct** (~2.5GB)
- **Why**: Smaller size for resource-constrained systems while maintaining good quality
- **Best for**: Users with limited storage or slower hardware
- **Performance**: Good quality with lower resource requirements

Both models use GGUF quantization and run completely offline via llama.cpp. The Enhanced Model is the default recommendation for best results on health and legal questions.

## Architecture

This repository contains:

- **`desktop/`** – Desktop app (Tauri 2.0 + React + TypeScript + Rust), **primary application**
- **`scripts/`** – Python scripts for building knowledge bases and downloading models
- **`docs/`** – Design and migration documentation
- **`archive/`** – Previous implementations (Python, web) and planning docs

The desktop app uses a Rust backend for Tauri and file operations, and calls Python (llama-cpp-python, ChromaDB, sentence-transformers) via subprocess for LLM inference, embeddings, and vector search.

## Quick Start

### Desktop App (Active Development)

**Prerequisites:**
- Rust (install from https://rustup.rs/)
- Node.js 18+ and npm

**Development:**
```bash
cd desktop
npm install
npm run dev
```

See [desktop/SETUP_INSTRUCTIONS.md](desktop/SETUP_INSTRUCTIONS.md) for detailed setup and [desktop/PYTHON_SETUP.md](desktop/PYTHON_SETUP.md) for Python dependencies (LLM, ChromaDB, embeddings).

## Contributing

We welcome contributions. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines. Use the issue and pull request templates in [.github/](.github/) when opening issues or PRs.

## License

MIT License - see [LICENSE](LICENSE) file for details.
