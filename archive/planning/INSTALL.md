# Installation Guide for dant (Python Implementation - Archived)

> **⚠️ This document is for the archived Python/Raspberry Pi implementation.**  
> **For the current web app, see [docs/setup.md](docs/setup.md)**

This guide will help you install dant step by step. Some packages are large and may take time to download.

## Prerequisites

- Python 3.9+ (3.11+ recommended)
- macOS (for keyboard package) or Linux
- ~5-10 GB free disk space for models and dependencies

## Installation Status

### ✅ Already Installed

The following packages have been successfully installed:

- **Core Dependencies** ✓
  - python-dotenv, numpy, pyyaml, tqdm

- **Audio Dependencies** ✓
  - sounddevice, soundfile, keyboard

- **ML/AI Dependencies** ✓
  - torch (2.8.0)
  - sentence-transformers (5.1.2)
  - chromadb (1.4.1)

- **Audio Processing** ✓
  - faster-whisper (1.2.1) - for speech-to-text

- **GUI** ✓
  - PyQt6 (6.10.2) - for setup/configuration interface

### ✅ All Packages Installed!

All optional packages have been successfully installed:

- **llama-cpp-python** ✓ (0.3.16) - for LLM inference
- **TTS** ✓ (0.22.0) - for text-to-speech  
- **pyaudio** ✓ (0.2.14) - alternative audio I/O

**Note:** TTS requires numpy==1.22.0, which may show a dependency warning with chromadb, but both packages work correctly together.

## Step-by-Step Installation (Reference)

### 1. Activate Virtual Environment

```bash
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt.

### 2. Install Core Dependencies (✅ Already Done)

```bash
pip install -r requirements-core.txt
```

### 3. Install Audio Dependencies (✅ Already Done)

```bash
pip install -r requirements-audio.txt
```

### 4. Install ML Dependencies (✅ Already Done)

```bash
pip install torch sentence-transformers
```

### 5. Install ChromaDB (✅ Already Done)

```bash
pip install chromadb
```

### 6. Install Optional Dependencies (⏳ Still Needed)

See the "Still Need to Install" section above for optional packages.

## Quick Install Remaining Packages

To install all remaining optional packages at once:

```bash
source venv/bin/activate
pip install llama-cpp-python TTS pyaudio
```

Note: You may need to install system dependencies first (see troubleshooting section).

## Troubleshooting

### If pip gets stuck resolving dependencies:
- Install packages one at a time
- Use `--no-deps` flag and install dependencies manually
- Try using `pip install --upgrade pip` first

### If PyAudio fails:
- On macOS: `brew install portaudio` then retry
- On Linux: `sudo apt-get install portaudio19-dev` (Debian/Ubuntu)

### If TTS fails:
- Install system dependencies: `brew install pkg-config ffmpeg` (macOS)
- Or skip TTS for now and use a simpler alternative later

### If llama-cpp-python fails:
- Try: `CMAKE_ARGS="-DLLAMA_METAL=on" pip install llama-cpp-python`
- Or download a pre-built wheel from the llama-cpp-python releases

## Verify Installation

Test that core packages can be imported:

```bash
source venv/bin/activate
python -c "import torch; import sentence_transformers; import chromadb; import faster_whisper; from PyQt6.QtWidgets import QApplication; print('✓ All core packages imported successfully!')"
```

This should print a success message without errors.

## What's Next?

Now that the core dependencies are installed, you can:

1. **Download models** - LLM, STT, and TTS models (see README.md)
2. **Set up knowledge bank** - Use `scripts/setup_knowledge_bank.py`
3. **Configure system** - Run `python src/main.py --setup`
4. **Start using dant** - Run `python src/main.py` (after models are downloaded)
