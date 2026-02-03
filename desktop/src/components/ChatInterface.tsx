import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DantAgent, AgentResponse } from '../agent/dant-agent';
import ReactMarkdown from 'react-markdown';
import './ChatInterface.css';

interface ChatInterfaceProps {
  disabled?: boolean;
  modelReady?: boolean;
  kbReady?: boolean;
  onOpenSettings?: () => void;
}

export default function ChatInterface({ disabled = false, modelReady = false, kbReady = false, onOpenSettings }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<DantAgent | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!disabled && modelReady) {
      initializeAgent();
    } else {
      setIsInitializing(false);
      setIsInitialized(false);
    }
  }, [disabled, modelReady]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom when processing starts to show shimmer
  useEffect(() => {
    if (isProcessing) {
      scrollToBottom();
    }
  }, [isProcessing]);

  // Track if we've sent the initial message
  const [hasSentInitialMessage, setHasSentInitialMessage] = useState(false);

  // Automatically send initial welcome message when agent is ready
  useEffect(() => {
    if (isInitialized && agent && !hasSentInitialMessage && !isProcessing) {
      // Automatically trigger the first message flow
      const sendInitialMessage = async () => {
        setIsProcessing(true);
        setError(null);
        setHasSentInitialMessage(true);

        try {
          // Process a simple initial query to trigger the welcome messages
          const response = await agent.processQuery("hello", { useRAG: false });
          
          // Add first message (don't add the user "hello" message - it's just a trigger)
          setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
          
          // If this is the first message and has follow-ups, add them with delays
          if (response.isFirstMessage && response.followUpMessages && response.followUpMessages.length > 0) {
            response.followUpMessages.forEach((msg, index) => {
              setTimeout(() => {
                setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
              }, (index + 1) * 800); // 800ms delay between messages
            });
          }
        } catch (err) {
          console.error('Failed to send initial message:', err);
          // Don't show error for initial message failure - just continue
        } finally {
          setIsProcessing(false);
        }
      };

      sendInitialMessage();
    }
  }, [isInitialized, agent, hasSentInitialMessage, isProcessing]);

  const initializeAgent = async () => {
    setIsInitializing(true);
    setError(null);
    
    try {
      // Check if model is initialized
      const isModelLoaded = await invoke<boolean>('is_model_loaded');
      
      if (!isModelLoaded) {
        setError('Please initialize a model first in the Model Manager tab.');
        setIsInitialized(false);
        setIsInitializing(false);
        return;
      }

      // Initialize vector store (for RAG)
      try {
        await invoke('initialize_vector_store', { collectionName: 'dant_knowledge' });
      } catch (err) {
        console.warn('Vector store initialization failed (RAG may not work):', err);
        // Don't fail completely if vector store fails - RAG just won't work
      }

      // Create agent
      const dantAgent = new DantAgent();
      setAgent(dantAgent);
      setIsInitialized(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize agent';
      setError(`Failed to initialize chat: ${errorMessage}. Please check that the model is loaded correctly.`);
      setIsInitialized(false);
    } finally {
      setIsInitializing(false);
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
    setError(null);
    
    // Set processing state immediately so shimmer appears right away
    setIsProcessing(true);
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Process query - use RAG only for health-related queries to improve speed
      // Simple heuristic: use RAG if query contains health-related keywords
      const healthKeywords = ['health', 'medical', 'symptom', 'disease', 'illness', 'condition', 'treatment', 'medicine', 'doctor', 'pain', 'fever', 'ache', 'diagnosis'];
      const isHealthQuery = healthKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
      const response = await agent.processQuery(userMessage, { useRAG: isHealthQuery });
      
      // Add first message
      setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
      
      // If this is the first message and has follow-ups, add them with delays
      if (response.isFirstMessage && response.followUpMessages && response.followUpMessages.length > 0) {
        response.followUpMessages.forEach((msg, index) => {
          setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
          }, (index + 1) * 800); // 800ms delay between messages
        });
      }
      
      if (response.sources && response.sources.length > 0) {
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process query';
      
      // Provide more helpful error messages
      let userFriendlyError = 'Sorry, I encountered an error processing your query.';
      if (errorMessage.includes('Model not initialized')) {
        userFriendlyError = 'The model is not initialized. Please go to the Model Manager tab and initialize a model first.';
      } else if (errorMessage.includes('Python')) {
        userFriendlyError = 'Python integration error. Please ensure Python 3 and required packages (llama-cpp-python) are installed.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('time')) {
        userFriendlyError = 'The request took too long. The model may be processing a large query. Please try again with a shorter question.';
      } else {
        userFriendlyError = `Sorry, I encountered an error: ${errorMessage}`;
      }
      
      setError(userFriendlyError);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: userFriendlyError
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

  if (disabled) {
    return (
      <div className="chat-interface chat-disabled">
        <div className="chat-disabled-overlay">
          <div className="chat-disabled-content">
            <h3>Chat will be enabled once setup is complete</h3>
            <div className="setup-status">
              <div className={`status-item ${modelReady ? 'ready' : 'pending'}`}>
                <span className="status-icon">{modelReady ? '✓' : '○'}</span>
                <span>AI Model {modelReady ? 'Ready' : 'Not Ready'}</span>
              </div>
              <div className={`status-item ${kbReady ? 'ready' : 'pending'}`}>
                <span className="status-icon">{kbReady ? '✓' : '○'}</span>
                <span>Knowledge Base {kbReady ? 'Ready' : 'Not Ready'}</span>
              </div>
            </div>
            <p className="disabled-message">
              Download and initialize both the AI model and knowledge base to start chatting.
              All processing happens offline on your device for complete privacy.
            </p>
          </div>
        </div>
        <div className="chat-messages" style={{ opacity: 0.3, pointerEvents: 'none' }}>
          <div className="chat-welcome">
            <h3>Welcome to Confidant</h3>
            <p>Complete setup to begin chatting...</p>
          </div>
        </div>
        <form className="chat-input-form" style={{ opacity: 0.3, pointerEvents: 'none' }}>
          <textarea
            disabled
            placeholder="Complete setup to enable chat..."
            className="chat-input"
            rows={1}
          />
          <button disabled className="chat-send-button">
            Send
          </button>
        </form>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="chat-interface">
        <div className="chat-placeholder">
          <div className="loading-spinner"></div>
          <p>Initializing chat interface...</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="chat-interface">
        <div className="chat-placeholder">
          <p>Initializing chat interface...</p>
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      {onOpenSettings && (
        <button 
          className="settings-button"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
        >
          ⚙️
        </button>
      )}
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.role === 'assistant' ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="message assistant" key="shimmer-loader">
            <div className="message-content shimmer-container"></div>
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
