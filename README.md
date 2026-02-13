# Confidant - Offline Mental Health Companion

**Confidant** is an open-source, privacy-first AI assistant that provides offline mental health support as a supportive companion. All processing happens locally with no network access for queries.

> **Note**: This project has evolved from an original Python-based Raspberry Pi implementation, then a web app, to the current desktop app (Tauri 2.0). See [archive/README.md](archive/README.md) for information about previous implementations.

## Features

- **Fully Offline**: All AI processing happens client-side, no backend required
- **Privacy-First**: All processing is local; no data is sent to external servers
- **Mental Health Companion**: Supports gratitude, mindfulness, mood, stress, anxiety, and depression—with RAG over your knowledge base. Not a substitute for therapy or professional care.
- **Local LLM**: Runs optimized models locally (Llama-3.2-3B default, Mistral-7B option)
- **RAG System**: Retrieval Augmented Generation with ChromaDB and sentence-transformers
- **Open Source**: MIT license; fully auditable codebase

## AI Models

Confidant supports two optimized LLM models for mental health conversations:

### Standard Model (Default)
- **Llama-3.2-3B-Instruct** (~2.5GB)
- **Why**: Smaller size for resource-constrained systems while maintaining good quality
- **Best for**: Most mental health conversations; fast and efficient
- **Performance**: Good quality with lower resource requirements

### Enhanced Model (Optional)
- **Mistral-7B-Instruct v0.2** (~4.4GB)
- **Why**: Strong reasoning and contextual understanding
- **Best for**: Users who want deeper, more nuanced conversations
- **Performance**: Strong reasoning capabilities, optimized for complex discussions

Both models use GGUF quantization and run completely offline via llama.cpp. The Standard Model is the default for most users; the Enhanced Model is recommended for more complex discussions.

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

### Download (Beta)

Pre-built installers for macOS and Windows are available via [GitHub Releases](https://github.com/confidant/confidant/releases). A small [download page](docs/index.html) is in `docs/` for use with [GitHub Pages](docs/GITHUB_PAGES.md); enable Pages from the `docs/` folder to serve it.

## Contributing

We welcome contributions. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines. Use the issue and pull request templates in [.github/](.github/) when opening issues or PRs.

## License

MIT License - see [LICENSE](LICENSE) file for details.
