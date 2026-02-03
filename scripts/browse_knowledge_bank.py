#!/usr/bin/env python3
"""Browse and query the knowledge bank."""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.knowledge.vector_store import VectorStore
from src.knowledge.embeddings import EmbeddingGenerator
from src.agent.rag_engine import RAGEngine
from src.config.settings import get_settings


def show_stats():
    """Show knowledge bank statistics."""
    settings = get_settings()
    vector_store = VectorStore()
    
    count = vector_store.count()
    print(f"\n{'='*60}")
    print(f"Knowledge Bank Statistics")
    print(f"{'='*60}")
    print(f"Total documents: {count}")
    print(f"Database location: {settings.knowledge_db_path}")
    print(f"Collection name: {settings.get('knowledge.collection_name')}")
    print(f"{'='*60}\n")


def list_documents(limit: int = 10):
    """List sample documents from the knowledge bank."""
    vector_store = VectorStore()
    count = vector_store.count()
    
    if count == 0:
        print("Knowledge bank is empty!")
        return
    
    print(f"\n{'='*60}")
    print(f"Sample Documents (showing {min(limit, count)} of {count})")
    print(f"{'='*60}\n")
    
    # Get all documents (limited)
    # Note: ChromaDB doesn't have a direct "get all" method, so we'll use search
    # with a dummy query to get some documents
    embedding_gen = EmbeddingGenerator()
    dummy_embedding = embedding_gen.encode("sample query")
    
    results = vector_store.search(
        query_embeddings=[dummy_embedding],
        n_results=min(limit, count)
    )
    
    if results["ids"] and len(results["ids"][0]) > 0:
        for i, doc_id in enumerate(results["ids"][0], 1):
            doc_text = results["documents"][0][i-1] if results["documents"] else "No text"
            metadata = results["metadatas"][0][i-1] if results["metadatas"] else {}
            
            # Truncate text for display
            preview = doc_text[:200] + "..." if len(doc_text) > 200 else doc_text
            
            print(f"\n[{i}] ID: {doc_id}")
            if metadata:
                print(f"    Metadata: {metadata}")
            print(f"    Preview: {preview}")
    else:
        print("No documents found.")


def search_knowledge_bank(query: str, top_k: int = 5):
    """Search the knowledge bank for relevant documents."""
    print(f"\n{'='*60}")
    print(f"Searching for: '{query}'")
    print(f"{'='*60}\n")
    
    # Use lower threshold for browsing/exploration
    rag_engine = RAGEngine(similarity_threshold=0.3)  # Lower threshold for exploration
    results = rag_engine.retrieve(query, top_k=top_k)
    
    if not results:
        print("No relevant documents found.")
        return
    
    print(f"Found {len(results)} relevant document(s):\n")
    
    for i, doc in enumerate(results, 1):
        print(f"[{i}] Similarity: {doc['similarity']:.3f}")
        if doc.get('metadata'):
            print(f"    Metadata: {doc['metadata']}")
        
        # Show full text (or truncated)
        text = doc['text']
        print(f"    Content: {text[:500]}{'...' if len(text) > 500 else ''}")
        print()


def interactive_search():
    """Interactive search mode."""
    print("\n" + "="*60)
    print("Interactive Knowledge Bank Search")
    print("="*60)
    print("Enter queries to search the knowledge bank.")
    print("Type 'quit' or 'exit' to stop.\n")
    
    # Use lower threshold for browsing/exploration
    rag_engine = RAGEngine(similarity_threshold=0.3)  # Lower threshold for exploration
    
    while True:
        try:
            query = input("Query: ").strip()
            
            if not query:
                continue
            
            if query.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!")
                break
            
            results = rag_engine.retrieve(query, top_k=5)
            
            if not results:
                print("No relevant documents found.\n")
                continue
            
            print(f"\nFound {len(results)} relevant document(s):\n")
            
            for i, doc in enumerate(results, 1):
                print(f"[{i}] Similarity: {doc['similarity']:.3f}")
                if doc.get('metadata'):
                    title = doc['metadata'].get('title', 'N/A')
                    source = doc['metadata'].get('source', 'N/A')
                    print(f"    Title: {title}")
                    print(f"    Source: {source}")
                
                text = doc['text']
                print(f"    Content: {text[:300]}{'...' if len(text) > 300 else ''}")
                print()
            
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}\n")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Browse and query the dant knowledge bank")
    parser.add_argument("--stats", action="store_true", help="Show knowledge bank statistics")
    parser.add_argument("--list", type=int, metavar="N", help="List N sample documents")
    parser.add_argument("--search", type=str, metavar="QUERY", help="Search for a query")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results to return (default: 5)")
    parser.add_argument("--interactive", "-i", action="store_true", help="Start interactive search mode")
    
    args = parser.parse_args()
    
    # If no arguments, show stats and start interactive mode
    if not any([args.stats, args.list, args.search, args.interactive]):
        show_stats()
        interactive_search()
        return
    
    if args.stats:
        show_stats()
    
    if args.list:
        list_documents(args.list)
    
    if args.search:
        search_knowledge_bank(args.search, args.top_k)
    
    if args.interactive:
        interactive_search()


if __name__ == "__main__":
    main()
