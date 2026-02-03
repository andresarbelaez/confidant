"""Main AI agent core that orchestrates LLM + RAG."""

from typing import Optional, List, Dict
from .llm_engine import LLMEngine
from .rag_engine import RAGEngine
from ..config.settings import get_settings


class DantAgent:
    """Main AI agent that combines LLM and RAG for intelligent responses."""
    
    def __init__(
        self,
        llm_engine: Optional[LLMEngine] = None,
        rag_engine: Optional[RAGEngine] = None,
        system_prompt: Optional[str] = None
    ):
        """
        Initialize dant agent.
        
        Args:
            llm_engine: LLM engine instance. If None, creates new one.
            rag_engine: RAG engine instance. If None, creates new one.
            system_prompt: System prompt for the agent. If None, uses default.
        """
        self.llm_engine = llm_engine or LLMEngine()
        self.rag_engine = rag_engine or RAGEngine()
        
        self.system_prompt = system_prompt or self._default_system_prompt()
        self.conversation_history: List[Dict[str, str]] = []
        self.max_history_length = 10  # Keep last 10 exchanges
    
    def _default_system_prompt(self) -> str:
        """Get default system prompt."""
        return """You are dant, a helpful and knowledgeable AI assistant. You have access to a local knowledge bank that you can use to provide accurate and helpful information. 

When answering questions:
- Use information from the knowledge bank when relevant
- Be concise but thorough
- If you don't know something, say so honestly
- Be friendly and conversational
- Remember that you operate completely offline and have no access to the internet"""
    
    def process_query(
        self,
        query: str,
        use_rag: bool = True,
        max_tokens: int = 512,
        stream: bool = False
    ) -> str:
        """
        Process a user query and generate a response.
        
        Args:
            query: User query text
            use_rag: Whether to use RAG to retrieve context from knowledge bank
            max_tokens: Maximum tokens to generate
            stream: Whether to stream the response
            
        Returns:
            Agent response text (or generator if stream=True)
        """
        # Retrieve context from knowledge bank if RAG is enabled
        context = None
        if use_rag:
            try:
                context = self.rag_engine.query(query)
            except Exception as e:
                print(f"Warning: RAG retrieval failed: {e}")
                context = None
        
        # Create prompt
        prompt = self.llm_engine.create_prompt(
            system_prompt=self.system_prompt,
            user_message=query,
            context=context,
            conversation_history=self.conversation_history
        )
        
        # Generate response
        if stream:
            # Streaming mode - return generator
            return self._process_query_stream(prompt, max_tokens, query)
        else:
            # Non-streaming mode - return string
            response = self.llm_engine.generate(
                prompt=prompt,
                max_tokens=max_tokens,
                stream=False
            )
            
            # Update conversation history
            self.conversation_history.append({"role": "user", "content": query})
            self.conversation_history.append({"role": "assistant", "content": response})
            
            # Trim history if too long
            if len(self.conversation_history) > self.max_history_length * 2:
                self.conversation_history = self.conversation_history[-self.max_history_length * 2:]
            
            return response
    
    def _process_query_stream(
        self,
        prompt: str,
        max_tokens: int,
        query: str
    ):
        """Process query in streaming mode (generator)."""
        response_gen = self.llm_engine.generate(
            prompt=prompt,
            max_tokens=max_tokens,
            stream=True
        )
        
        # Collect response while yielding chunks
        full_response = ""
        for chunk in response_gen:
            full_response += chunk
            yield chunk
        
        # Update conversation history after streaming is complete
        self.conversation_history.append({"role": "user", "content": query})
        self.conversation_history.append({"role": "assistant", "content": full_response})
        
        # Trim history if too long
        if len(self.conversation_history) > self.max_history_length * 2:
            self.conversation_history = self.conversation_history[-self.max_history_length * 2:]
    
    def reset_conversation(self) -> None:
        """Reset conversation history."""
        self.conversation_history = []
    
    def set_system_prompt(self, prompt: str) -> None:
        """Update system prompt."""
        self.system_prompt = prompt
