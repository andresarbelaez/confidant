"""RAG (Retrieval Augmented Generation) engine."""

from typing import List, Dict, Optional, Any
from ..knowledge.vector_store import VectorStore
from ..knowledge.embeddings import EmbeddingGenerator
from ..config.settings import get_settings


class RAGEngine:
    """Retrieval Augmented Generation engine for accessing knowledge bank."""
    
    def __init__(
        self,
        vector_store: Optional[VectorStore] = None,
        embedding_generator: Optional[EmbeddingGenerator] = None,
        top_k: Optional[int] = None,
        similarity_threshold: Optional[float] = None
    ):
        """
        Initialize RAG engine.
        
        Args:
            vector_store: Vector store instance. If None, creates new one.
            embedding_generator: Embedding generator instance. If None, creates new one.
            top_k: Number of top results to retrieve. If None, uses default from config.
            similarity_threshold: Minimum similarity threshold. If None, uses default from config.
        """
        settings = get_settings()
        self.top_k = top_k or settings.get("rag.top_k", 3)
        self.similarity_threshold = similarity_threshold or settings.get("rag.similarity_threshold", 0.7)
        
        # Initialize components
        self.vector_store = vector_store or VectorStore()
        self.embedding_generator = embedding_generator or EmbeddingGenerator()
    
    def retrieve(
        self,
        query: str,
        top_k: Optional[int] = None,
        filter_metadata: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant documents from knowledge bank.
        
        Args:
            query: Query text
            top_k: Number of results to return. If None, uses instance default.
            filter_metadata: Optional metadata filter for retrieval
            
        Returns:
            List of retrieved documents with 'text', 'metadata', 'distance' keys
        """
        k = top_k or self.top_k
        
        # Generate query embedding
        query_embedding = self.embedding_generator.encode(query)
        
        # Search vector store
        results = self.vector_store.search(
            query_embeddings=[query_embedding],
            n_results=k,
            where=filter_metadata
        )
        
        # Format results
        retrieved_docs = []
        if results["ids"] and len(results["ids"][0]) > 0:
            for i in range(len(results["ids"][0])):
                doc_id = results["ids"][0][i]
                doc_text = results["documents"][0][i] if results["documents"] else ""
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 1.0
                
                # Convert distance to similarity (cosine distance -> similarity)
                similarity = 1.0 - distance
                
                # Filter by similarity threshold
                if similarity >= self.similarity_threshold:
                    retrieved_docs.append({
                        "id": doc_id,
                        "text": doc_text,
                        "metadata": metadata,
                        "similarity": similarity,
                        "distance": distance
                    })
        
        return retrieved_docs
    
    def format_context(
        self,
        retrieved_docs: List[Dict[str, Any]],
        max_length: int = 2000
    ) -> str:
        """
        Format retrieved documents into context string for LLM.
        
        Args:
            retrieved_docs: List of retrieved documents
            max_length: Maximum length of context string (characters)
            
        Returns:
            Formatted context string
        """
        if not retrieved_docs:
            return ""
        
        context_parts = []
            current_length = 0
        
        for doc in retrieved_docs:
            doc_text = doc["text"]
            doc_length = len(doc_text)
            
            if current_length + doc_length > max_length:
                break
            
            # Add document with metadata if available
            if doc.get("metadata"):
                source = doc["metadata"].get("source", "knowledge base")
                context_parts.append(f"[Source: {source}]\n{doc_text}")
            else:
                context_parts.append(doc_text)
            
            current_length += doc_length + 2  # +2 for newline
        
        return "\n\n".join(context_parts)
    
    def query(
        self,
        query: str,
        top_k: Optional[int] = None,
        max_context_length: int = 2000
    ) -> str:
        """
        Retrieve and format context for a query.
        
        Args:
            query: Query text
            top_k: Number of results to retrieve. If None, uses instance default.
            max_context_length: Maximum length of formatted context
            
        Returns:
            Formatted context string
        """
        retrieved_docs = self.retrieve(query, top_k=top_k)
        context = self.format_context(retrieved_docs, max_length=max_context_length)
        return context
