# Contributing to Confidant

Thank you for your interest in contributing to Confidant. This document explains how to get started and our expectations.

## Project structure

### Active development

- **`desktop/`** – Desktop app (Tauri 2 + React + TypeScript + Rust)
  - **`desktop/src/`** – Frontend (React, agent, config)
  - **`desktop/src-tauri/`** – Backend (Rust), Python helpers for LLM/ChromaDB/embeddings
  - See [desktop/README.md](desktop/README.md) and [desktop/SETUP_INSTRUCTIONS.md](desktop/SETUP_INSTRUCTIONS.md)

- **`docs/`** – Documentation and design notes

### Other

- **`archive/`** – Previous implementations (Python, web) and planning docs
- **`scripts/`** – Knowledge base and model download scripts (Python)
- **`src/`**, **`tests/`** – Legacy Python code (reference)

## Tech stack (desktop app)

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Rust (Tauri 2), Python 3 (subprocess for LLM, ChromaDB, embeddings)
- **LLM**: llama-cpp-python, GGUF models (Mistral-7B default, Llama-3.2-3B option)
- **RAG**: ChromaDB, sentence-transformers

## Getting started

1. **Clone the repo**
   ```bash
   git clone https://github.com/YOUR_ORG/confidant.git
   cd confidant
   ```

2. **Set up the desktop app**
   ```bash
   cd desktop
   npm install
   ```
   - **Rust**: Install from [rustup.rs](https://rustup.rs/)
   - **Python**: 3.10+ with venv recommended. See [desktop/PYTHON_SETUP.md](desktop/PYTHON_SETUP.md) for `llama-cpp-python`, `chromadb`, `sentence-transformers`.

3. **Run in development**
   ```bash
   npm run dev
   ```

4. **Optional**: Copy `config.example.yaml` to `config.yaml` in the repo root if you use root-level Python scripts.

## Development guidelines

- **TypeScript/React**: Follow existing patterns; run `npm run lint` in `desktop/`.
- **Rust**: Use `cargo fmt` and `cargo clippy` in `desktop/src-tauri/`.
- **Logging**: Verbose logs are compiled only in debug builds (`cargo build`); release builds stay quiet.
- **Docs**: Update README or relevant docs when adding user-facing behavior or setup steps.

## Areas for contribution

- **Bugs**: Use the [bug report](.github/ISSUE_TEMPLATE/bug_report.md) template.
- **Features**: Use the [feature request](.github/ISSUE_TEMPLATE/feature_request.md) template or open a discussion.
- **Code**: Open a PR with a clear description and check the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

## Submitting changes

1. Fork the repository and create a branch (`feature/your-feature` or `fix/your-fix`).
2. Make your changes and test (desktop app runs, no new lint errors).
3. Commit with clear messages (e.g. `Add: optional dark mode` or `Fix: model path on Windows`).
4. Push and open a Pull Request; fill in the PR template.

## Code of conduct

- Be respectful and inclusive.
- Welcome newcomers and give constructive feedback.
- Focus on the project’s goal: a privacy-first, offline AI assistant for health and legal information.

Thank you for contributing to Confidant.
