# End-to-End Testing Checklist

## Prerequisites

1. ✅ Python dependencies installed:
   ```bash
   pip install chromadb sentence-transformers llama-cpp-python
   ```

2. ✅ Model file available:
   - Path: `/Users/dres/Documents/2026/dant/data/models/llama-3.2-3b-instruct-q4_0.gguf`
   - Or any valid GGUF model file

3. ✅ Knowledge base file (optional for initial testing):
   - JSON format with manifest, documents, and embeddings

## Test Scenarios

### 1. Model Initialization ✅
- [ ] Open app → Model Manager tab
- [ ] Enter model path
- [ ] Click "Initialize Model"
- [ ] Verify: "Model is loaded and ready to use" message
- [ ] Check console for Python llama-cpp-python loading

### 2. Knowledge Base Initialization ✅
- [ ] Open app → Knowledge Base tab
- [ ] Verify: "Status: Initialized" appears automatically
- [ ] Verify: Document count shows (should be 0 initially)

### 3. Knowledge Base Loading (if file available)
- [ ] Click "Choose File"
- [ ] Select knowledge base JSON file
- [ ] Verify: Progress bar appears
- [ ] Verify: Document count updates after loading
- [ ] Check console for ChromaDB operations

### 4. Chat Interface - Basic LLM (No RAG)
- [ ] Open app → Chat tab
- [ ] Verify: "Please initialize a model first" if model not loaded
- [ ] Initialize model first (from Model Manager)
- [ ] Return to Chat tab
- [ ] Enter a simple query: "Hello, how are you?"
- [ ] Click Send
- [ ] Verify: Response appears (may take 10-30 seconds)
- [ ] Verify: Response is coherent

### 5. Chat Interface - With RAG (if knowledge base loaded)
- [ ] Load knowledge base (from Knowledge Base tab)
- [ ] Go to Chat tab
- [ ] Enter a health-related query: "What are the symptoms of a cold?"
- [ ] Click Send
- [ ] Verify: Response includes relevant information
- [ ] Verify: Response mentions knowledge base context (if applicable)

### 6. Error Handling
- [ ] Try initializing with invalid model path
- [ ] Verify: Error message appears
- [ ] Try chat without model initialized
- [ ] Verify: Appropriate error message
- [ ] Try loading invalid knowledge base file
- [ ] Verify: Error handling works

### 7. Network Monitor
- [ ] Open app → Status tab
- [ ] Verify: Network monitor shows "Zero bytes transmitted"
- [ ] Verify: Privacy badge appears

## Known Issues to Watch For

1. **Python Not Found**
   - Error: "Python not found. Please install Python 3."
   - Fix: Ensure Python 3 is in PATH

2. **Missing Python Packages**
   - Error: "ERROR: chromadb not installed" (or similar)
   - Fix: `pip install chromadb sentence-transformers llama-cpp-python`

3. **Model Loading Slow**
   - First load may take 30-60 seconds
   - This is normal for llama-cpp-python

4. **Embeddings Model Download**
   - First embedding generation downloads ~90MB model
   - This is normal and only happens once

5. **ChromaDB Database Location**
   - Database created at: `desktop/data/chromadb/`
   - Verify directory is created

## Performance Benchmarks

- Model initialization: < 60 seconds
- Text generation (512 tokens): < 30 seconds
- Embedding generation: < 2 seconds (after first load)
- Knowledge base loading (1000 docs): < 5 minutes
- Vector search: < 1 second

## Success Criteria

✅ All test scenarios pass
✅ No crashes or errors
✅ Responses are coherent
✅ RAG works when knowledge base is loaded
✅ Error messages are helpful
✅ UI is responsive
