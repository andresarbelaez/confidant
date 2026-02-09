import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ArrowUp, Copy } from 'lucide-react';
import { DantAgent } from '../agent/dant-agent';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '../i18n/hooks/useTranslation';
import ChatSidebar from './ChatSidebar';
import LogOutConfirmModal from './LogOutConfirmModal';
import UserSettingsModal from './UserSettingsModal';
import './ChatInterface.css';

interface ChatInterfaceProps {
  disabled?: boolean;
  modelReady?: boolean;
  kbReady?: boolean;
  chatVisible?: boolean;
  onOpenSettings?: () => void;
  userId: string;
  onSwitchProfile?: () => void;
  onLogOut?: () => void;
}

export default function ChatInterface({ disabled = false, modelReady = false, kbReady = false, chatVisible = false, onOpenSettings, userId, onSwitchProfile, onLogOut }: ChatInterfaceProps) {
  const { t, currentLanguage } = useTranslation(userId);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<DantAgent | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showLogOutModal, setShowLogOutModal] = useState(false);
  const [showUserSettingsModal, setShowUserSettingsModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loadedUserIdRef = useRef<string | null>(null);

  const resizeInput = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const h = el.value ? Math.min(el.scrollHeight, 120) : 36;
    el.style.height = `${h}px`;
  };

  useEffect(() => {
    if (!disabled && modelReady) {
      initializeAgent();
    } else {
      setIsInitializing(false);
      setIsInitialized(false);
    }
  }, [disabled, modelReady, currentLanguage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize user KB and load chat history when userId is available.
  useEffect(() => {
    if (userId && isInitialized && !disabled) {
      if (loadedUserIdRef.current !== userId) {
        loadedUserIdRef.current = userId;
        initializeUserKB();
        loadChatHistory();
      }
    } else if (!userId) {
      loadedUserIdRef.current = null;
      setMessages([]);
    }
  }, [userId, isInitialized, disabled, currentLanguage]);
  
  // Update agent language when language changes
  useEffect(() => {
    if (agent && currentLanguage) {
      agent.setLanguage(currentLanguage);
    }
  }, [agent, currentLanguage]);

  const initializeUserKB = async () => {
    try {
      // Check if user KB collection exists
      const collectionName = `dant_knowledge_user_${userId}`;
      try {
        await invoke('get_collection_stats_by_name', { collectionName });
        // Collection exists, no need to initialize
      } catch (err) {
        // Collection doesn't exist, initialize it
        await invoke('initialize_user_vector_store', { userId });
      }
    } catch (err) {
      console.error('Failed to initialize user KB:', err);
      // Don't block the UI if KB initialization fails
    }
  };

  // Save chat history when messages change.
  useEffect(() => {
    if (messages.length > 0 && isInitialized && !disabled) {
      saveChatHistory();
    }
  }, [messages, userId, isInitialized, disabled]);

  const loadChatHistory = async () => {
    try {
      const chatMessages = await invoke<Array<{ role: string; content: string; timestamp: string }>>('load_user_chat', { userId });
      const loadedMessages = (chatMessages || []).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
      setMessages(loadedMessages);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setMessages([]);
    }
  };

  const saveChatHistory = async () => {
    try {
      const chatMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date().toISOString(),
      }));
      await invoke('save_user_chat', {
        userId,
        messages: chatMessages,
      });
    } catch (err) {
      console.error('Failed to save chat history:', err);
    }
  };

  useEffect(() => {
    resizeInput();
  }, [input]);

  useEffect(() => {
    if (isProcessing) {
      scrollToBottom();
    }
  }, [isProcessing]);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // ignore
    }
  };


  const initializeAgent = async () => {
    setIsInitializing(true);
    setError(null);
    
    try {
      // Check if model is initialized
      const isModelLoaded = await invoke<boolean>('is_model_loaded');
      
      if (!isModelLoaded) {
        setError(t('ui.modelManagerPrompt'));
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
      dantAgent.setLanguage(currentLanguage);
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
    
    setIsProcessing(true);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const healthKeywords = ['health', 'medical', 'symptom', 'disease', 'illness', 'condition', 'treatment', 'medicine', 'doctor', 'pain', 'fever', 'ache', 'diagnosis'];
      const isHealthQuery = healthKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
      const response = await agent.processQuery(userMessage, { useRAG: isHealthQuery, userId, language: currentLanguage });
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process query';
      
      // Provide more helpful error messages
      let userFriendlyError = t('errors.somethingWentWrong');
      if (errorMessage.includes('Model not initialized')) {
        userFriendlyError = t('errors.modelNotSetUp');
      } else if (errorMessage.includes('Python')) {
        userFriendlyError = t('errors.pythonIssue');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('time')) {
        userFriendlyError = t('errors.timeout');
      } else {
        userFriendlyError = `${t('errors.somethingWentWrong')}: ${errorMessage}`;
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

  const handleLogOutClick = () => setShowLogOutModal(true);
  const handleLogOutConfirm = () => {
    setShowLogOutModal(false);
    onLogOut?.();
  };

  if (disabled) {
    return (
      <div className="chat-interface chat-disabled">
        {showLogOutModal && (
          <LogOutConfirmModal onConfirm={handleLogOutConfirm} onCancel={() => setShowLogOutModal(false)} userId={userId} />
        )}
        {showUserSettingsModal && (
          <UserSettingsModal isOpen={showUserSettingsModal} onClose={() => setShowUserSettingsModal(false)} userId={userId} />
        )}
        <ChatSidebar userId={userId} onOpenSettings={onOpenSettings} onOpenUserSettings={() => setShowUserSettingsModal(true)} onLogOut={handleLogOutClick} />
        <div className="chat-main">
          <div className="chat-disabled-overlay">
            <div className="chat-disabled-content">
              <h3>{t('ui.finishSetup')}</h3>
              <div className="setup-status">
                <div className={`status-item ${modelReady ? 'ready' : 'pending'}`}>
                  <span className="status-icon">{modelReady ? '✓' : '○'}</span>
                  <span>{t('ui.aiModel')} {modelReady ? t('ui.ready') : t('ui.notReady')}</span>
                </div>
                <div className={`status-item ${kbReady ? 'ready' : 'pending'}`}>
                  <span className="status-icon">{kbReady ? '✓' : '○'}</span>
                  <span>{t('ui.knowledgeBase')} {kbReady ? t('ui.ready') : t('ui.notReady')}</span>
                </div>
              </div>
              <p className="disabled-message">
                {t('ui.downloadAndSetup')}
              </p>
            </div>
          </div>
          <div className="chat-messages" style={{ opacity: 0.3, pointerEvents: 'none' }}>
            <div className="chat-welcome">
              <h3>{t('ui.welcomeToConfidant')}</h3>
              <p>{t('ui.finishSetupToStart')}</p>
            </div>
          </div>
          <form className="chat-input-form" style={{ opacity: 0.3, pointerEvents: 'none' }}>
            <div className="chat-input-wrap">
              <textarea
                disabled
                placeholder={t('ui.openSettingsToFinish')}
                className="chat-input"
                rows={1}
              />
              <button disabled className="chat-send-button" aria-label={t('ui.send')}>
                <ArrowUp size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="chat-interface">
        {showLogOutModal && (
          <LogOutConfirmModal onConfirm={handleLogOutConfirm} onCancel={() => setShowLogOutModal(false)} userId={userId} />
        )}
        {showUserSettingsModal && (
          <UserSettingsModal isOpen={showUserSettingsModal} onClose={() => setShowUserSettingsModal(false)} userId={userId} />
        )}
        <ChatSidebar userId={userId} onOpenSettings={onOpenSettings} onOpenUserSettings={() => setShowUserSettingsModal(true)} onLogOut={handleLogOutClick} />
        <div className="chat-main">
          <div className="chat-placeholder">
            <div className="loading-spinner"></div>
            <p>{t('ui.preparingChat')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="chat-interface">
        {showLogOutModal && (
          <LogOutConfirmModal onConfirm={handleLogOutConfirm} onCancel={() => setShowLogOutModal(false)} userId={userId} />
        )}
        {showUserSettingsModal && (
          <UserSettingsModal isOpen={showUserSettingsModal} onClose={() => setShowUserSettingsModal(false)} userId={userId} />
        )}
        <ChatSidebar userId={userId} onOpenSettings={onOpenSettings} onOpenUserSettings={() => setShowUserSettingsModal(true)} onLogOut={handleLogOutClick} />
        <div className="chat-main">
          <div className="chat-placeholder">
            <p>{t('ui.preparingChat')}</p>
            {error && (
              <div className="error-message">
                <strong>{t('ui.errorLabel')}:</strong> {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      {showLogOutModal && (
        <LogOutConfirmModal onConfirm={handleLogOutConfirm} onCancel={() => setShowLogOutModal(false)} userId={userId} />
      )}
      {showUserSettingsModal && (
        <UserSettingsModal isOpen={showUserSettingsModal} onClose={() => setShowUserSettingsModal(false)} userId={userId} />
      )}
      <ChatSidebar userId={userId} onOpenSettings={onOpenSettings} onOpenUserSettings={() => setShowUserSettingsModal(true)} onLogOut={handleLogOutClick} />
      <div className="chat-main">
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
            {msg.role === 'assistant' && (
              <div className="message-actions">
                <div className="copy-action-wrap">
                  <button
                    type="button"
                    className="message-action-btn"
                    onClick={() => handleCopyMessage(msg.content, idx)}
                    aria-label={copiedIndex === idx ? t('ui.copied') : t('ui.copy')}
                  >
                    <Copy size={16} />
                  </button>
                  <span className="copy-tooltip" role="status">
                    {copiedIndex === idx ? t('ui.copied') : t('ui.copy')}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {isProcessing && (
          <div className="message assistant" key="thinking">
            <div className="message-content thinking-text">{t('ui.thinking')}</div>
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
          <div className="chat-input-wrap">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ui.askHealthQuestion')}
              disabled={isProcessing || !isInitialized}
              rows={1}
              className="chat-input"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing || !isInitialized}
              className="chat-send-button"
              aria-label={t('ui.send')}
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </form>
        <p className="chat-footer">
          {t('agent.disclaimer')}
        </p>
      </div>
    </div>
  );
}
