# Archived Code and Documentation

This directory contains archived code and documentation from earlier phases of the dant project.

## Structure

### `python-implementation/` (To Be Archived)

The original Python-based implementation designed for Raspberry Pi hardware. This includes:

- **`src/`** - Original Python source code:
  - `agent/` - AI agent with LLM and RAG engines
  - `audio/` - Audio I/O, STT, TTS, push-to-talk
  - `knowledge/` - Vector store (ChromaDB) and embeddings
  - `config/` - Configuration management
  - `gui/` - Desktop GUI setup window
  - `main.py` - Main application entry point

- **`scripts/`** - Utility scripts:
  - `build_knowledge_bank.py` - Knowledge base builder
  - `download_model.py` - Model downloader
  - `test_reasoning.py` - Agent testing
  - Various knowledge source scrapers

- **`tests/`** - Unit tests for Python implementation

- **`requirements*.txt`** - Python dependencies

**Status**: Archived. This implementation was designed for the original hardware-first approach (Raspberry Pi). The project has since pivoted to a web app (PWA) architecture.

### `analysis-docs/` (To Be Archived)

Strategic analysis and decision documents from the project's evolution:

- Hardware decisions (Pi 4 vs Pi 5, 4GB vs 8GB)
- Model size analysis (Llama 3.2 variants)
- Storage options research
- GPS navigation feasibility
- Software-first strategy analysis
- Competitive analysis (ChatGPT Health)
- Download size validation research

**Status**: Historical reference. These documents informed the current architecture but are no longer actively maintained.

## Current Implementation

The current implementation is a **Progressive Web App (PWA)** located in the `web/` directory. See the main [README.md](../README.md) and [ARCHITECTURE.md](../ARCHITECTURE.md) for details.

## Why Archived?

The project underwent a strategic pivot:

1. **Original Vision**: Hardware-first product (Raspberry Pi) with Python backend
2. **Current Vision**: Open-source web app (PWA) accessible to anyone

The Python implementation remains available for reference but is not actively developed. Key learnings and architectural decisions from this phase informed the current web app design.

## Files in Root Directory

Some files in the root directory are from previous implementations but are kept for reference:

- `INSTALL.md` - Python installation guide (archived)
- `KNOWLEDGE_BANK_USAGE.md` - Python knowledge bank usage (archived)
- `LLM_INFO.md` - Llama model information (still relevant)
- `test_queries.md` - Test queries (still useful for testing)
- Various `*_ANALYSIS.md` and `*_DECISION.md` files - Historical analysis (archived)

These files are marked with notes indicating they're from previous implementations.
