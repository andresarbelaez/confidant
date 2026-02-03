import { useState, useEffect, useRef } from 'react';
import { getLLMEngine, isLLMInitialized } from '../utils/llm-instance';
import { IndexedDBVectorStore } from '../knowledge/indexeddb-vector-store';
import { DantAgent } from '../agent/dant-agent';
import './ChatInterface.css';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<DantAgent | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    initializeAgent();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeAgent = async () => {
    try {
      // Initialize vector store
      const vectorStore = new IndexedDBVectorStore('dant_knowledge', 384);
      await vectorStore.initialize();

      // Get shared LLM engine instance
      const llmEngine = getLLMEngine();
      
      // Check if model is initialized
      if (!llmEngine.isModelLoaded()) {
        setError('Please initialize a model first in the Model Manager tab.');
        setIsInitialized(false);
        return;
      }

      // Create agent
      const dantAgent = new DantAgent(llmEngine, vectorStore);
      setAgent(dantAgent);
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize agent');
      setIsInitialized(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isProcessing || !agent || !isInitialized) return;

    const userMessage = input.trim();
    setInput('');
    setIsProcessing(true);
    setError(null);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Process query
      const response = await agent.processQuery(userMessage, { stream: false });
      
      if (typeof response === 'object' && 'response' in response) {
        // Non-streaming response
        setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process query');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your query.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isInitialized) {
    return (
      <div className="chat-interface">
        <div className="chat-placeholder">
          <p>Please initialize a model in the Model Manager tab first.</p>
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <h3>Welcome to dant</h3>
            <p>Ask me anything about health. I'm here to help!</p>
            <p className="welcome-note">All processing happens offline. Your queries are completely private.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="message assistant">
            <div className="message-content">
              <span className="typing-indicator">Thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chat-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-form">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a health question..."
          disabled={isProcessing || !isInitialized}
          rows={1}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!input.trim() || isProcessing || !isInitialized}
          className="chat-send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
}
