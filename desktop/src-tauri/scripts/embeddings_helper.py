#!/usr/bin/env python3
"""
Embeddings Helper Script
Generates embeddings using sentence-transformers
"""

import sys
import json

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("ERROR: sentence-transformers not installed. Install with: pip install sentence-transformers", file=sys.stderr)
    sys.exit(1)


# Global model instance
_model = None
_model_name = "all-MiniLM-L6-v2"  # 384 dimensions


def load_model():
    """Load embedding model"""
    global _model
    if _model is None:
        try:
            _model = SentenceTransformer(_model_name)
            return {"status": "success", "message": "Model loaded"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    return {"status": "success", "message": "Model already loaded"}


def generate_embedding(text: str):
    """Generate embedding for a single text"""
    global _model
    
    if _model is None:
        load_model()
    
    try:
        # Optimize encoding: use batch_size=1 for single queries, disable progress bar
        # normalize_embeddings=True is required for cosine similarity in ChromaDB
        embedding = _model.encode(
            text, 
            convert_to_numpy=True,
            show_progress_bar=False,
            normalize_embeddings=True,
            batch_size=1
        ).tolist()
        return {
            "status": "success",
            "embedding": embedding,
            "dimension": len(embedding)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def generate_batch(texts: list):
    """Generate embeddings for multiple texts"""
    global _model
    
    if _model is None:
        load_model()
    
    try:
        embeddings = _model.encode(texts, convert_to_numpy=True).tolist()
        return {
            "status": "success",
            "embeddings": embeddings,
            "count": len(embeddings),
            "dimension": len(embeddings[0]) if embeddings else 0
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def main():
    if len(sys.argv) < 2:
        print("ERROR: Missing command", file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "embed":
            text = sys.stdin.read()
            result = generate_embedding(text)
            print(json.dumps(result))
            
        elif command == "batch":
            texts_json = sys.stdin.read()
            texts = json.loads(texts_json)
            result = generate_batch(texts)
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
