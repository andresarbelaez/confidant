"""Text embedding generation for knowledge bank."""

from typing import List, Union, Optional
import torch
from sentence_transformers import SentenceTransformer

from ..config.settings import get_settings


class EmbeddingGenerator:
    """Generates embeddings for text using sentence transformers."""
    
    def __init__(self, model_name: Optional[str] = None, device: Optional[str] = None):
        """
        Initialize embedding generator.
        
        Args:
            model_name: Name of the sentence transformer model. If None, uses default from config.
            device: Device to run on ('cpu', 'cuda'). If None, auto-detects.
        """
        settings = get_settings()
        self.model_name = model_name or settings.get("paths.embedding_model")
        
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        
        # Load model
        print(f"Loading embedding model: {self.model_name} on {self.device}")
        self.model = SentenceTransformer(self.model_name, device=self.device)
        print(f"Embedding model loaded. Dimension: {self.model.get_sentence_embedding_dimension()}")
    
    def encode(
        self,
        texts: Union[str, List[str]],
        batch_size: int = 32,
        show_progress: bool = False,
        normalize_embeddings: bool = True
    ) -> Union[List[float], List[List[float]]]:
        """
        Generate embeddings for text(s).
        
        Args:
            texts: Single text string or list of texts
            batch_size: Batch size for encoding
            show_progress: Whether to show progress bar
            normalize_embeddings: Whether to normalize embeddings to unit length
            
        Returns:
            Single embedding (list of floats) or list of embeddings
        """
        is_single = isinstance(texts, str)
        if is_single:
            texts = [texts]
        
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=show_progress,
            normalize_embeddings=normalize_embeddings,
            convert_to_numpy=True
        )
        
        # Convert to list
        embeddings = embeddings.tolist()
        
        if is_single:
            return embeddings[0]
        return embeddings
    
    @property
    def dimension(self) -> int:
        """Get embedding dimension."""
        return self.model.get_sentence_embedding_dimension()
