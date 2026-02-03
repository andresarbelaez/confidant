#!/usr/bin/env python3
"""
Create a small test knowledge base file for testing the knowledge base loader
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Try to import sentence-transformers for real embeddings
try:
    from sentence_transformers import SentenceTransformer
    HAS_EMBEDDINGS = True
except ImportError:
    print("Warning: sentence-transformers not found. Using placeholder embeddings.", file=sys.stderr)
    HAS_EMBEDDINGS = False

def generate_embeddings(texts):
    """Generate embeddings for texts"""
    if HAS_EMBEDDINGS:
        model = SentenceTransformer('all-MiniLM-L6-v2')
        embeddings = model.encode(texts, convert_to_numpy=True).tolist()
        return embeddings
    else:
        # Placeholder embeddings (384 dimensions)
        embeddings = []
        for i, text in enumerate(texts):
            # Simple hash-based placeholder (not semantic, but allows testing)
            import hashlib
            hash_val = int(hashlib.md5(text.encode()).hexdigest()[:8], 16)
            embedding = [float((hash_val + j) % 1000) / 1000.0 - 0.5 for j in range(384)]
            # Normalize
            norm = sum(x*x for x in embedding) ** 0.5
            if norm > 0:
                embedding = [x / norm for x in embedding]
            embeddings.append(embedding)
        return embeddings

def create_test_knowledge_base():
    """Create a small test knowledge base"""
    
    # Sample health-related documents
    documents = [
        {
            "id": "doc_1",
            "text": "The common cold is a viral infection of the upper respiratory tract. Symptoms include runny nose, sneezing, coughing, and sometimes fever. Most colds resolve on their own within 7-10 days. Rest, hydration, and over-the-counter medications can help manage symptoms.",
            "metadata": {
                "source": "health",
                "category": "general",
                "title": "Common Cold"
            }
        },
        {
            "id": "doc_2",
            "text": "Regular exercise is important for maintaining good health. The World Health Organization recommends at least 150 minutes of moderate-intensity physical activity per week for adults. Exercise helps improve cardiovascular health, strengthen muscles, and boost mental well-being.",
            "metadata": {
                "source": "health",
                "category": "exercise",
                "title": "Exercise and Health"
            }
        },
        {
            "id": "doc_3",
            "text": "A balanced diet includes a variety of foods from all food groups: fruits, vegetables, grains, protein sources, and dairy. Eating a variety of nutrient-rich foods helps ensure you get all the vitamins and minerals your body needs. Limit processed foods and added sugars.",
            "metadata": {
                "source": "health",
                "category": "nutrition",
                "title": "Balanced Diet"
            }
        },
        {
            "id": "doc_4",
            "text": "Sleep is essential for physical and mental health. Most adults need 7-9 hours of sleep per night. Poor sleep can affect mood, cognitive function, and immune system. Good sleep hygiene includes maintaining a regular sleep schedule and creating a comfortable sleep environment.",
            "metadata": {
                "source": "health",
                "category": "sleep",
                "title": "Sleep and Health"
            }
        },
        {
            "id": "doc_5",
            "text": "Stress management is important for overall well-being. Chronic stress can lead to physical and mental health problems. Techniques like deep breathing, meditation, exercise, and talking to friends or professionals can help manage stress effectively.",
            "metadata": {
                "source": "health",
                "category": "mental_health",
                "title": "Stress Management"
            }
        }
    ]
    
    # Generate embeddings
    print("Generating embeddings...", file=sys.stderr)
    texts = [doc["text"] for doc in documents]
    embeddings = generate_embeddings(texts)
    
    # Create manifest
    manifest = {
        "version": "1.0.0",
        "name": "dant-test-kb",
        "description": "Small test knowledge base for dant desktop app",
        "documentCount": len(documents),
        "embeddingDimension": len(embeddings[0]) if embeddings else 384,
        "createdAt": datetime.now().isoformat() + "Z",
        "sources": ["Test Data"]
    }
    
    # Create knowledge base package
    kb_package = {
        "manifest": manifest,
        "documents": documents,
        "embeddings": embeddings
    }
    
    return kb_package

def main():
    output_path = Path(__file__).parent.parent / "test_knowledge_base.json"
    
    print(f"Creating test knowledge base at: {output_path}", file=sys.stderr)
    
    kb = create_test_knowledge_base()
    
    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(kb, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Created test knowledge base with {kb['manifest']['documentCount']} documents", file=sys.stderr)
    print(f"   Embedding dimension: {kb['manifest']['embeddingDimension']}", file=sys.stderr)
    print(f"   File size: {output_path.stat().st_size / 1024:.2f} KB", file=sys.stderr)
    print(f"\nFile saved to: {output_path}", file=sys.stderr)
    print(f"\nTo use in the desktop app:", file=sys.stderr)
    print(f"  1. Open the Knowledge Base tab", file=sys.stderr)
    print(f"  2. Click 'Choose File'", file=sys.stderr)
    print(f"  3. Select: {output_path}", file=sys.stderr)

if __name__ == "__main__":
    main()
