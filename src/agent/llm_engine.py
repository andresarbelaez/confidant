"""LLM inference engine using llama.cpp."""

from typing import Optional, List, Dict, Any
from pathlib import Path
from llama_cpp import Llama

from ..config.settings import get_settings


class LLMEngine:
    """LLM inference using llama.cpp."""
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        context_size: Optional[int] = None,
        n_threads: Optional[int] = None,
        n_gpu_layers: int = 0,
        verbose: bool = False
    ):
        """
        Initialize LLM engine.
        
        Args:
            model_path: Path to GGUF model file. If None, uses default from config.
            context_size: Context window size. If None, uses default from config.
            n_threads: Number of threads. If None, uses default from config.
            n_gpu_layers: Number of layers to offload to GPU (0 = CPU only)
            verbose: Whether to print verbose output
        """
        settings = get_settings()
        self.model_path = model_path or settings.llm_model_path
        self.context_size = context_size or settings.get("llm.context_size", 4096)
        self.n_threads = n_threads or settings.get("llm.n_threads", 4)
        
        if not self.model_path or not Path(self.model_path).exists():
            raise FileNotFoundError(
                f"LLM model not found at {self.model_path}. "
                f"Please download a model using scripts/download_model.py"
            )
        
        print(f"Loading LLM model: {self.model_path}")
        print(f"Context size: {self.context_size}, Threads: {self.n_threads}")
        
        self.llm = Llama(
            model_path=self.model_path,
            n_ctx=self.context_size,
            n_threads=self.n_threads,
            n_gpu_layers=n_gpu_layers,
            verbose=verbose
        )
        
        print("LLM model loaded successfully")
    
    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        top_k: Optional[int] = None,
        repeat_penalty: Optional[float] = None,
        stop: Optional[List[str]] = None,
        stream: bool = False
    ) -> str:
        """
        Generate text from prompt.
        
        Args:
            prompt: Input prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature. If None, uses default from config.
            top_p: Top-p sampling. If None, uses default from config.
            top_k: Top-k sampling. If None, uses default from config.
            repeat_penalty: Repeat penalty. If None, uses default from config.
            stop: List of stop sequences
            stream: Whether to stream output (returns generator)
            
        Returns:
            Generated text (or generator if stream=True)
        """
        settings = get_settings()
        temperature = temperature if temperature is not None else settings.get("llm.temperature", 0.7)
        top_p = top_p if top_p is not None else settings.get("llm.top_p", 0.9)
        top_k = top_k if top_k is not None else settings.get("llm.top_k", 40)
        repeat_penalty = repeat_penalty if repeat_penalty is not None else settings.get("llm.repeat_penalty", 1.1)
        
        if stream:
            return self._generate_stream(
                prompt, max_tokens, temperature, top_p, top_k, repeat_penalty, stop
            )
        
        response = self.llm(
            prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            repeat_penalty=repeat_penalty,
            stop=stop,
            echo=False
        )
        
        return response["choices"][0]["text"].strip()
    
    def _generate_stream(
        self,
        prompt: str,
        max_tokens: int,
        temperature: float,
        top_p: float,
        top_k: int,
        repeat_penalty: float,
        stop: Optional[List[str]]
    ):
        """Generate text with streaming."""
        stream = self.llm(
            prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            repeat_penalty=repeat_penalty,
            stop=stop,
            echo=False,
            stream=True
        )
        
        for output in stream:
            text = output["choices"][0]["text"]
            yield text
    
    def create_prompt(
        self,
        system_prompt: str,
        user_message: str,
        context: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Create formatted prompt for the model.
        
        Args:
            system_prompt: System instruction prompt
            user_message: Current user message
            context: Optional context from knowledge bank
            conversation_history: Optional list of previous messages [{"role": "user/assistant", "content": "..."}]
            
        Returns:
            Formatted prompt string
        """
        # Build prompt based on model format (Llama 3.2 format)
        # Note: llama-cpp-python automatically adds <|begin_of_text|> for Llama 3.2,
        # so we should NOT include it manually to avoid duplicates.
        prompt_parts = []
        
        # System prompt (NO <|begin_of_text|> - added automatically by llama-cpp-python)
        prompt_parts.append(f"<|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|>")
        
        # Context from knowledge bank
        if context:
            prompt_parts.append(f"<|start_header_id|>system<|end_header_id|>\n\nContext from knowledge base:\n{context}<|eot_id|>")
        
        # Conversation history (strip any existing <|begin_of_text|> tags from history)
        if conversation_history:
            for msg in conversation_history:
                role = msg["role"]
                content = msg["content"]
                # Remove any <|begin_of_text|> tags that might be in the content
                content = content.replace("<|begin_of_text|>", "")
                if role == "user":
                    prompt_parts.append(f"<|start_header_id|>user<|end_header_id|>\n\n{content}<|eot_id|>")
                elif role == "assistant":
                    prompt_parts.append(f"<|start_header_id|>assistant<|end_header_id|>\n\n{content}<|eot_id|>")
        
        # Current user message
        user_message_clean = user_message.replace("<|begin_of_text|>", "")
        prompt_parts.append(f"<|start_header_id|>user<|end_header_id|>\n\n{user_message_clean}<|eot_id|>")
        
        # Assistant response start
        prompt_parts.append(f"<|start_header_id|>assistant<|end_header_id|>\n\n")
        
        full_prompt = "".join(prompt_parts)
        
        # Final cleanup: remove any stray <|begin_of_text|> tags (llama-cpp-python will add it)
        full_prompt = full_prompt.replace("<|begin_of_text|>", "")
        
        return full_prompt
