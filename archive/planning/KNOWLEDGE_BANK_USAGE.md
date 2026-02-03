# Knowledge Bank Usage Guide (Python Implementation - Archived)

> **⚠️ This document is for the archived Python/Raspberry Pi implementation.**  
> **For the current web app knowledge base system, see [docs/knowledge-base-format.md](docs/knowledge-base-format.md)**

Your dant knowledge bank is now populated with **485 documents** from Wikipedia! Here's how to view and use it.

## Location

The knowledge bank is stored at:
```
data/knowledge/chroma_db
```

## Viewing the Knowledge Bank

### 1. View Statistics

See how many documents are in your knowledge bank:

```bash
source venv/bin/activate
python scripts/browse_knowledge_bank.py --stats
```

### 2. List Sample Documents

View sample documents from the knowledge bank:

```bash
python scripts/browse_knowledge_bank.py --list 10
```

### 3. Search the Knowledge Bank

Search for specific topics:

```bash
python scripts/browse_knowledge_bank.py --search "your query here" --top-k 5
```

Examples:
```bash
python scripts/browse_knowledge_bank.py --search "science" --top-k 3
python scripts/browse_knowledge_bank.py --search "history" --top-k 5
python scripts/browse_knowledge_bank.py --search "technology" --top-k 3
```

### 4. Interactive Search Mode

Start an interactive search session:

```bash
python scripts/browse_knowledge_bank.py --interactive
# or simply:
python scripts/browse_knowledge_bank.py
```

This lets you enter multiple queries and explore the knowledge bank interactively.

## Using the Knowledge Bank with dant

The knowledge bank is **automatically used** when you run the dant AI agent! The agent uses RAG (Retrieval Augmented Generation) to:

1. **Retrieve relevant information** from the knowledge bank based on your questions
2. **Combine it with the LLM** to generate informed responses
3. **Answer questions** using the knowledge bank content

### Running the Agent

#### Audio Interface (Recommended)

The agent uses the knowledge bank automatically when you ask questions:

```bash
source venv/bin/activate
python src/main.py
```

Then:
- Press and hold **SPACE** to speak
- Ask questions like:
  - "What is science?"
  - "Tell me about history"
  - "Explain technology"
- The agent will search the knowledge bank and respond using that information

#### Text Interface (For Testing)

You can also test the agent with text queries. Create a simple test script:

```python
# test_agent.py
from src.agent.core import DantAgent

agent = DantAgent()

while True:
    query = input("\nYou: ")
    if query.lower() in ['quit', 'exit']:
        break
    response = agent.process_query(query)
    print(f"dant: {response}")
```

Run it:
```bash
source venv/bin/activate
python test_agent.py
```

## How RAG Works

When you ask a question:

1. **Query Embedding**: Your question is converted to a vector embedding
2. **Similarity Search**: The system searches the knowledge bank for similar content
3. **Context Retrieval**: Relevant documents are retrieved (top 3 by default)
4. **Response Generation**: The LLM generates a response using:
   - The retrieved context from the knowledge bank
   - The conversation history
   - The system prompt

## Configuration

You can adjust RAG settings in `config.yaml`:

```yaml
rag:
  top_k: 3                    # Number of documents to retrieve
  similarity_threshold: 0.7   # Minimum similarity score (0.0-1.0)
  chunk_size: 512             # Text chunk size
  chunk_overlap: 50           # Overlap between chunks
```

## Adding More Content

To add more content to the knowledge bank:

```bash
# Add more Wikipedia articles
python scripts/build_knowledge_bank.py --sources wiki --size-limit 1.0 --article-limit 1000

# Add personal documents
python scripts/build_knowledge_bank.py --sources personal --input-dir /path/to/your/docs

# Combine multiple sources
python scripts/build_knowledge_bank.py --sources wiki,personal --size-limit 2.0
```

## Troubleshooting

### No results found?

- The similarity threshold might be too high. Try lowering it in `config.yaml`
- Your query might not match any content. Try different keywords
- The knowledge bank might need more content

### Agent not using knowledge bank?

- Check that the knowledge bank has documents: `python scripts/browse_knowledge_bank.py --stats`
- Verify the RAG engine is working: `python scripts/browse_knowledge_bank.py --search "test"`

## Next Steps

1. **Explore your knowledge bank**: Use the browse script to see what's in there
2. **Test the agent**: Run the audio interface and ask questions
3. **Add more content**: Build a larger knowledge bank with more sources
4. **Customize**: Adjust RAG settings to improve retrieval quality

Enjoy your off-the-grid AI companion! 🤖
