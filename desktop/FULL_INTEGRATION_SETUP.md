# Full Integration Setup Guide

## Python Dependencies Required

For full integration to work, you need to install Python dependencies:

```bash
# Activate your Python virtual environment (if using one)
source venv/bin/activate  # or your venv path

# Install required packages
pip install chromadb sentence-transformers llama-cpp-python
```

### Package Details

1. **chromadb** - Vector database for storing knowledge base
2. **sentence-transformers** - For generating embeddings (all-MiniLM-L6-v2 model)
3. **llama-cpp-python** - Python bindings for llama.cpp

## What's Been Implemented

### ✅ LLM Integration (llama.cpp)
- **Python Helper**: `src-tauri/scripts/llama_helper.py`
- **Rust Backend**: `src-tauri/src/llm.rs` (calls Python helper)
- **Frontend**: ModelDownloader and ChatInterface use Tauri commands

### ✅ Vector Store Integration (ChromaDB)
- **Python Helper**: `src-tauri/scripts/chromadb_helper.py`
- **Rust Backend**: `src-tauri/src/vector_store.rs` (calls Python helper)
- **Frontend**: KnowledgeBaseManager uses Tauri commands

### ✅ Embeddings Integration
- **Python Helper**: `src-tauri/scripts/embeddings_helper.py`
- **Rust Backend**: `src-tauri/src/embeddings.rs` (calls Python helper)
- **Uses**: sentence-transformers (all-MiniLM-L6-v2, 384 dimensions)

### ✅ Agent Integration
- **Agent**: `src/agent/dant-agent.ts`
- **Combines**: LLM + RAG (Retrieval Augmented Generation)
- **Frontend**: ChatInterface uses DantAgent

### ✅ Knowledge Base Loader
- **Loader**: `src/knowledge/knowledge-loader.ts`
- **Supports**: JSON knowledge base files
- **Future**: ZSTD compression support

## Testing the Integration

### 1. Install Python Dependencies

```bash
cd /Users/dres/Documents/2026/dant
source venv/bin/activate  # or your venv
pip install chromadb sentence-transformers llama-cpp-python
```

### 2. Test Model Initialization

1. Open the desktop app
2. Go to Model Manager tab
3. Enter model path: `/Users/dres/Documents/2026/dant/data/models/llama-3.2-3b-instruct-q4_0.gguf`
4. Click "Initialize Model"
5. Should see "Model is loaded and ready to use"

### 3. Test Knowledge Base Loading

1. Go to Knowledge Base tab
2. Click "Choose File"
3. Select a knowledge base JSON file
4. Should see progress and document count update

### 4. Test Chat with RAG

1. Go to Chat tab
2. Ask a mental health question or share what's on your mind
3. Should get response using LLM + RAG

## Troubleshooting

### Python Not Found
- Make sure Python 3 is installed: `python3 --version`
- The scripts will try `python3` first, then `python`

### Missing Python Packages
- Install: `pip install chromadb sentence-transformers llama-cpp-python`
- Make sure you're using the same Python environment

### Model Loading Fails
- Check that llama-cpp-python is installed: `pip install llama-cpp-python`
- First load may take time (model needs to be loaded into memory)

### ChromaDB Errors
- Check that chromadb is installed: `pip install chromadb`
- Database will be created at `data/chromadb/`

### Embeddings Fail
- Check that sentence-transformers is installed: `pip install sentence-transformers`
- First use will download the model (~90MB)

## Next Steps

Once dependencies are installed:
1. Test model initialization
2. Test knowledge base loading
3. Test chat with RAG
4. Verify end-to-end functionality
