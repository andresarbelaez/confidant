"""Knowledge bank data loading utilities."""

from typing import List, Dict, Optional, Any
from pathlib import Path
import re
from tqdm import tqdm

from .vector_store import VectorStore
from .embeddings import EmbeddingGenerator
from ..config.settings import get_settings


class KnowledgeLoader:
    """Loads and processes knowledge sources for the knowledge bank."""
    
    def __init__(
        self,
        vector_store: Optional[VectorStore] = None,
        embedding_generator: Optional[EmbeddingGenerator] = None,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None
    ):
        """
        Initialize knowledge loader.
        
        Args:
            vector_store: Vector store instance. If None, creates new one.
            embedding_generator: Embedding generator instance. If None, creates new one.
            chunk_size: Size of text chunks. If None, uses default from config.
            chunk_overlap: Overlap between chunks. If None, uses default from config.
        """
        settings = get_settings()
        self.chunk_size = chunk_size or settings.get("rag.chunk_size", 512)
        self.chunk_overlap = chunk_overlap or settings.get("rag.chunk_overlap", 50)
        
        self.vector_store = vector_store or VectorStore()
        self.embedding_generator = embedding_generator or EmbeddingGenerator()
    
    def chunk_text(
        self,
        text: str,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None
    ) -> List[str]:
        """
        Split text into chunks.
        
        Args:
            text: Text to chunk
            chunk_size: Size of chunks. If None, uses instance default.
            chunk_overlap: Overlap between chunks. If None, uses instance default.
            
        Returns:
            List of text chunks
        """
        size = chunk_size or self.chunk_size
        overlap = chunk_overlap or self.chunk_overlap
        
        # Simple word-based chunking
        words = text.split()
        chunks = []
        
        if not words:
            return []
        
        i = 0
        while i < len(words):
            chunk_words = words[i:i + size]
            chunk = " ".join(chunk_words)
            chunks.append(chunk)
            i += size - overlap
        
        return chunks
    
    def load_text_file(
        self,
        file_path: str,
        encoding: str = "utf-8",
        metadata: Optional[Dict] = None
    ) -> List[str]:
        """
        Load text from a file and chunk it.
        
        Args:
            file_path: Path to text file
            encoding: File encoding
            metadata: Optional metadata to attach to chunks
            
        Returns:
            List of text chunks
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        with open(path, "r", encoding=encoding, errors="ignore") as f:
            text = f.read()
        
        chunks = self.chunk_text(text)
        
        # Add metadata if provided
        if metadata:
            for chunk in chunks:
                chunk.metadata = metadata.copy()
        
        return chunks
    
    def load_markdown_file(
        self,
        file_path: str,
        encoding: str = "utf-8"
    ) -> List[Dict[str, Any]]:
        """
        Load markdown file and extract sections.
        
        Args:
            file_path: Path to markdown file
            encoding: File encoding
            
        Returns:
            List of dictionaries with 'text' and 'metadata' keys
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        with open(path, "r", encoding=encoding, errors="ignore") as f:
            content = f.read()
        
        # Split by headers
        sections = re.split(r'\n(#{1,6}\s+.+)\n', content)
        
        chunks = []
        current_section = None
        
        for i, part in enumerate(sections):
            if i == 0:
                # First part might be content before first header
                if part.strip():
                    chunks.append({
                        "text": part.strip(),
                        "metadata": {"source": path.name, "section": "introduction"}
                    })
            elif part.startswith("#"):
                # This is a header
                current_section = part.strip()
            else:
                # This is content
                if part.strip():
                    # Chunk the content
                    text_chunks = self.chunk_text(part.strip())
                    for j, chunk in enumerate(text_chunks):
                        chunks.append({
                            "text": chunk,
                            "metadata": {
                                "source": path.name,
                                "section": current_section or "content",
                                "chunk_index": j
                            }
                        })
        
        return chunks
    
    def add_to_knowledge_bank(
        self,
        documents: List[str],
        metadatas: Optional[List[Dict]] = None,
        batch_size: int = 100,
        show_progress: bool = True
    ) -> None:
        """
        Add documents to knowledge bank with embeddings.
        
        Args:
            documents: List of document texts
            metadatas: Optional list of metadata dicts
            batch_size: Batch size for processing
            show_progress: Whether to show progress bar
        """
        if not documents:
            return
        
        # Generate embeddings in batches
        total = len(documents)
        iterator = range(0, total, batch_size)
        
        if show_progress:
            iterator = tqdm(iterator, desc="Processing documents")
        
        for i in iterator:
            batch_docs = documents[i:i + batch_size]
            batch_metas = metadatas[i:i + batch_size] if metadatas else None
            
            # Generate embeddings
            embeddings = self.embedding_generator.encode(
                batch_docs,
                batch_size=batch_size,
                show_progress=False
            )
            
            # Generate IDs
            start_id = self.vector_store.count()
            ids = [f"doc_{start_id + j}" for j in range(len(batch_docs))]
            
            # Add to vector store
            self.vector_store.add_documents(
                documents=batch_docs,
                ids=ids,
                metadatas=batch_metas,
                embeddings=embeddings
            )
    
    def load_directory(
        self,
        directory_path: str,
        file_extensions: Optional[List[str]] = None,
        recursive: bool = True
    ) -> None:
        """
        Load all text files from a directory.
        
        Args:
            directory_path: Path to directory
            file_extensions: List of file extensions to load (e.g., ['.txt', '.md']). If None, loads .txt and .md
            recursive: Whether to search recursively
        """
        if file_extensions is None:
            file_extensions = ['.txt', '.md']
        
        path = Path(directory_path)
        if not path.exists():
            raise FileNotFoundError(f"Directory not found: {directory_path}")
        
        # Find all matching files
        pattern = "**/*" if recursive else "*"
        files = []
        for ext in file_extensions:
            files.extend(path.glob(f"{pattern}{ext}"))
        
        print(f"Found {len(files)} files to process")
        
        all_chunks = []
        all_metadatas = []
        
        for file_path in tqdm(files, desc="Loading files"):
            try:
                if file_path.suffix == '.md':
                    chunks_with_meta = self.load_markdown_file(str(file_path))
                    for item in chunks_with_meta:
                        all_chunks.append(item["text"])
                        all_metadatas.append(item["metadata"])
                else:
                    chunks = self.load_text_file(
                        str(file_path),
                        metadata={"source": file_path.name}
                    )
                    for chunk in chunks:
                        all_chunks.append(chunk)
                        all_metadatas.append({"source": file_path.name})
            except Exception as e:
                print(f"Error loading {file_path}: {e}")
                continue
        
        # Add to knowledge bank
        if all_chunks:
            print(f"Adding {len(all_chunks)} chunks to knowledge bank...")
            self.add_to_knowledge_bank(all_chunks, all_metadatas)
