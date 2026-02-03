"""Basic tests for dant agent."""

import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

# Change to src directory for relative imports
import os
original_cwd = os.getcwd()
os.chdir(str(src_path))

try:
    def test_config():
        """Test configuration system."""
        from config.settings import get_settings
        
        settings = get_settings()
        assert settings.llm_model_path is not None
        assert settings.knowledge_db_path is not None
        print("✓ Configuration system works")


    def test_vector_store():
        """Test vector store."""
        from knowledge.vector_store import VectorStore
        
        store = VectorStore()
        assert store.count() >= 0
        print("✓ Vector store works")


    def test_embeddings():
        """Test embedding generator."""
        from knowledge.embeddings import EmbeddingGenerator
        
        generator = EmbeddingGenerator()
        embedding = generator.encode("test text")
        assert len(embedding) > 0
        print("✓ Embedding generator works")
finally:
    os.chdir(original_cwd)


if __name__ == "__main__":
    print("Running basic tests...")
    try:
        test_config()
        test_vector_store()
        test_embeddings()
        print("\nAll basic tests passed!")
    except Exception as e:
        print(f"\nTest failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
