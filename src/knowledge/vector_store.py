"""Vector database wrapper for knowledge bank."""

from typing import List, Dict, Optional, Any
import chromadb
from chromadb.config import Settings as ChromaSettings
from pathlib import Path

from ..config.settings import get_settings


class VectorStore:
    """Manages vector database for knowledge bank."""
    
    def __init__(self, collection_name: Optional[str] = None, persist_directory: Optional[str] = None):
        """
        Initialize vector store.
        
        Args:
            collection_name: Name of the collection. If None, uses default from config.
            persist_directory: Directory to persist database. If None, uses default from config.
        """
        settings = get_settings()
        self.collection_name = collection_name or settings.get("knowledge.collection_name")
        self.persist_directory = persist_directory or settings.get("knowledge.persist_directory")
        
        # Ensure directory exists
        Path(self.persist_directory).mkdir(parents=True, exist_ok=True)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True,
            )
        )
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )
    
    def add_documents(
        self,
        documents: List[str],
        ids: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None,
        embeddings: Optional[List[List[float]]] = None
    ) -> None:
        """
        Add documents to the vector store.
        
        Args:
            documents: List of document texts
            ids: Optional list of document IDs. If None, auto-generated.
            metadatas: Optional list of metadata dicts for each document
            embeddings: Optional pre-computed embeddings. If None, will be computed.
        """
        if ids is None:
            # Generate IDs based on existing count
            existing_count = self.collection.count()
            ids = [f"doc_{existing_count + i}" for i in range(len(documents))]
        
        self.collection.add(
            documents=documents,
            ids=ids,
            metadatas=metadatas,
            embeddings=embeddings
        )
    
    def search(
        self,
        query_embeddings: List[List[float]],
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Search for similar documents.
        
        Args:
            query_embeddings: Query embeddings to search with
            n_results: Number of results to return
            where: Optional metadata filter
            where_document: Optional document content filter
            
        Returns:
            Dictionary with 'ids', 'documents', 'metadatas', 'distances'
        """
        results = self.collection.query(
            query_embeddings=query_embeddings,
            n_results=n_results,
            where=where,
            where_document=where_document
        )
        return results
    
    def get_by_ids(self, ids: List[str]) -> Dict[str, Any]:
        """
        Retrieve documents by IDs.
        
        Args:
            ids: List of document IDs
            
        Returns:
            Dictionary with 'ids', 'documents', 'metadatas'
        """
        results = self.collection.get(ids=ids)
        return results
    
    def delete(self, ids: Optional[List[str]] = None, where: Optional[Dict[str, Any]] = None) -> None:
        """
        Delete documents from the store.
        
        Args:
            ids: Optional list of IDs to delete
            where: Optional metadata filter for deletion
        """
        self.collection.delete(ids=ids, where=where)
    
    def count(self) -> int:
        """Get total number of documents in the collection."""
        return self.collection.count()
    
    def reset(self) -> None:
        """Reset the collection (delete all documents)."""
        self.client.delete_collection(name=self.collection_name)
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )
