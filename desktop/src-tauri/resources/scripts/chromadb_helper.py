#!/usr/bin/env python3
"""
ChromaDB Helper Script
Called from Rust/Tauri backend to perform ChromaDB operations
"""

import sys
import json
import os
from pathlib import Path

try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    print("ERROR: chromadb not installed. Install with: pip install chromadb", file=sys.stderr)
    sys.exit(1)


def get_chroma_client(db_path: str):
    """Get or create ChromaDB client - optimized settings"""
    client = chromadb.PersistentClient(
        path=db_path,
        settings=Settings(
            anonymized_telemetry=False,
            allow_reset=True
        )
    )
    return client


def initialize_collection(db_path: str, collection_name: str):
    """Initialize or get ChromaDB collection"""
    try:
        client = get_chroma_client(db_path)
        
        # Get or create collection
        try:
            collection = client.get_collection(name=collection_name)
            print(f"INFO: Collection '{collection_name}' already exists", file=sys.stderr)
        except Exception as e:
            collection = client.create_collection(
                name=collection_name,
                metadata={"description": "dant knowledge base"}
            )
            print(f"INFO: Created collection '{collection_name}'", file=sys.stderr)
        
        return {
            "status": "success",
            "collection_name": collection_name,
            "db_path": db_path
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


def add_documents(db_path: str, collection_name: str, documents: list):
    """Add documents to ChromaDB collection"""
    client = get_chroma_client(db_path)
    collection = client.get_collection(name=collection_name)
    
    ids = []
    texts = []
    embeddings = []
    metadatas = []
    
    for doc in documents:
        ids.append(doc["id"])
        texts.append(doc["text"])
        embeddings.append(doc["embedding"])
        metadatas.append(doc.get("metadata", {}))
    
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas
    )
    
    return {
        "status": "success",
        "added": len(documents)
    }


def search_similar(db_path: str, collection_name: str, query_embedding: list, limit: int):
    """Search for similar documents - optimized for speed"""
    client = get_chroma_client(db_path)
    collection = client.get_collection(name=collection_name)
    
    # Optimize query: only fetch what we need, use efficient search
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=limit,
        include=["documents", "distances", "metadatas"]  # Only fetch what we need
    )
    
    # Format results (optimized loop)
    search_results = []
    if results["ids"] and len(results["ids"][0]) > 0:
        ids = results["ids"][0]
        documents = results.get("documents", [[]])[0]
        distances = results.get("distances", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        
        for i in range(len(ids)):
            search_results.append({
                "id": ids[i],
                "text": documents[i] if i < len(documents) else "",
                "score": 1.0 - distances[i] if i < len(distances) else 0.0,
                "metadata": metadatas[i] if i < len(metadatas) else {}
            })
    
    return {
        "status": "success",
        "results": search_results
    }


def get_stats(db_path: str, collection_name: str):
    """Get collection statistics"""
    client = get_chroma_client(db_path)
    
    try:
        collection = client.get_collection(name=collection_name)
        count = collection.count()
        
        return {
            "status": "success",
            "document_count": count,
            "collection_name": collection_name
        }
    except:
        return {
            "status": "success",
            "document_count": 0,
            "collection_name": collection_name
        }


def delete_collection(db_path: str, collection_name: str):
    """Delete a ChromaDB collection"""
    try:
        client = get_chroma_client(db_path)
        client.delete_collection(name=collection_name)
        
        return {
            "status": "success",
            "collection_name": collection_name
        }
    except Exception as e:
        # If collection doesn't exist, that's okay
        if "does not exist" in str(e).lower() or "not found" in str(e).lower():
            return {
                "status": "success",
                "collection_name": collection_name,
                "message": "Collection already deleted or does not exist"
            }
        return {
            "status": "error",
            "message": str(e)
        }


def main():
    if len(sys.argv) < 2:
        print("ERROR: Missing command", file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "init":
            if len(sys.argv) < 4:
                print("ERROR: Missing arguments for init command", file=sys.stderr)
                sys.exit(1)
            db_path = sys.argv[2]
            collection_name = sys.argv[3]
            result = initialize_collection(db_path, collection_name)
            print(json.dumps(result))
            sys.stdout.flush()  # Ensure output is flushed
            
        elif command == "add":
            db_path = sys.argv[2]
            collection_name = sys.argv[3]
            documents_json = sys.stdin.read()
            documents = json.loads(documents_json)
            result = add_documents(db_path, collection_name, documents)
            print(json.dumps(result))
            
        elif command == "search":
            db_path = sys.argv[2]
            collection_name = sys.argv[3]
            limit = int(sys.argv[4])
            query_embedding_json = sys.stdin.read()
            query_embedding = json.loads(query_embedding_json)
            result = search_similar(db_path, collection_name, query_embedding, limit)
            print(json.dumps(result))
            
        elif command == "stats":
            db_path = sys.argv[2]
            collection_name = sys.argv[3]
            result = get_stats(db_path, collection_name)
            print(json.dumps(result))
            
        elif command == "delete_collection":
            if len(sys.argv) < 4:
                print("ERROR: Missing arguments for delete_collection command", file=sys.stderr)
                sys.exit(1)
            db_path = sys.argv[2]
            collection_name = sys.argv[3]
            result = delete_collection(db_path, collection_name)
            print(json.dumps(result))
            
        else:
            print(f"ERROR: Unknown command: {command}", file=sys.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
