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
    """Create a small test knowledge base with mental health topics (ICD-11-aligned, original content)."""
    
    # Mental health documents (section 6a: ICD-11 primary, DSM-5-inspired paraphrases, no verbatim copy)
    documents = [
        {
            "id": "doc_1",
            "text": "Gratitude practice can support mental well-being. Taking time each day to notice and acknowledge things you're thankful for—whether small or large—can shift focus toward the positive. This is not a substitute for professional care. If you're struggling, consider reaching out to a mental health professional.",
            "metadata": {
                "source": "mental_health",
                "category": "gratitude",
                "title": "Gratitude Practice"
            }
        },
        {
            "id": "doc_2",
            "text": "Mindfulness and meditation help many people manage stress and improve mood. Simple techniques include focused breathing, body scans, and observing thoughts without judgment. These practices are supportive tools, not treatment for mental health conditions. Professional support is important for persistent difficulties.",
            "metadata": {
                "source": "mental_health",
                "category": "mindfulness",
                "title": "Mindfulness and Meditation"
            }
        },
        {
            "id": "doc_3",
            "text": "Sleep and mood are closely linked. Most adults need 7–9 hours of sleep per night. Poor or irregular sleep can affect mood, energy, and emotional regulation. Good sleep hygiene includes a regular schedule, a comfortable environment, and limiting screens before bed. If sleep problems persist, consider professional evaluation.",
            "metadata": {
                "source": "mental_health",
                "category": "sleep",
                "title": "Sleep and Mood"
            }
        },
        {
            "id": "doc_4",
            "text": "Stress and coping: Chronic stress can impact mental and physical health. Helpful strategies include deep breathing, exercise, connecting with others, and setting boundaries. If stress feels overwhelming or interferes with daily life, reaching out to a mental health professional is recommended.",
            "metadata": {
                "source": "mental_health",
                "category": "stress",
                "title": "Stress and Coping"
            }
        },
        {
            "id": "doc_5",
            "text": "Anxiety: Common signs include persistent worry, restlessness, difficulty concentrating, and physical symptoms like tension or sleep problems. If anxiety interferes with daily life or causes significant distress, professional evaluation is recommended. This is not a substitute for diagnosis or treatment.",
            "metadata": {
                "source": "mental_health",
                "category": "anxiety",
                "title": "Anxiety—When to Seek Support"
            }
        },
        {
            "id": "doc_6",
            "text": "Depression: Common signs include low mood, loss of interest, fatigue, sleep or appetite changes, and difficulty concentrating. If low mood persists for weeks or interferes with daily life, professional evaluation is important. This is not a substitute for diagnosis or treatment.",
            "metadata": {
                "source": "mental_health",
                "category": "depression",
                "title": "Depression—When to Seek Support"
            }
        },
        {
            "id": "doc_7",
            "text": "Therapy and professional support: Mental health professionals can provide assessment, therapy, and treatment. Reaching out is a sign of strength. Support looks different across cultures—what matters is finding help that feels right for you. Confidant is a supportive companion, not a substitute for professional care.",
            "metadata": {
                "source": "mental_health",
                "category": "therapy",
                "title": "Therapy and Professional Support"
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
        "name": "dant-mental-health-kb",
        "description": "Mental health knowledge base for Confidant—gratitude, mindfulness, mood, stress, anxiety, depression",
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
