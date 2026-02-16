import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ArrowUp, Copy, LogOut, Settings, Trash2 } from 'lucide-react';
import { DantAgent } from '../agent/dant-agent';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { ChatLayout, ChatSidebarShell, ChatMessages, ChatInputBar } from 'confidant-chat-ui';
import LogOutConfirmModal from './LogOutConfirmModal';
import DeleteChatHistoryConfirmModal from './DeleteChatHistoryConfirmModal';
import UserSettingsModal from './UserSettingsModal';
import { clearChatHistoryForUser } from '../utils/clearChatHistory';
import './ChatInterface.css';
import './ChatSidebar.css';

interface ChatInterfaceProps {
  disabled?: boolean;
  modelReady?: boolean;
  kbReady?: boolean;
  chatVisible?: boolean;
  onOpenSettings?: () => void;
  userId: string;
  onSwitchProfile?: () => void;
  onLogOut?: () => void;
  /** Called when chat content has layout and has had time to paint (parent can remove loading overlay). */
  onReady?: () => void;
}

export default function ChatInterface({ disabled = false, modelReady = false, kbReady = false, chatVisible: _chatVisible = false, onOpenSettings, userId, onSwitchProfile: _onSwitchProfile, onLogOut, onReady }: ChatInterfaceProps) {
  const { t, currentLanguage } = useTranslation(userId);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<DantAgent | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showLogOutModal, setShowLogOutModal] = useState(false);
  const [showDeleteChatHistoryModal, setShowDeleteChatHistoryModal] = useState(false);
  const [showUserSettingsModal, setShowUserSettingsModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyCalledRef = useRef(false);
  const sessionFirstMessageContentRef = useRef<string | null>(null);
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

  // Scroll to bottom after messages update (including streaming). useLayoutEffect runs after DOM update so the scroll container has the new height.
  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Signal when chat content has layout (ResizeObserver) + 2 frames for paint, so parent can remove overlay
  useEffect(() => {
    if (!onReady || disabled || isInitializing || !isInitialized || !containerRef.current) return;
    onReadyCalledRef.current = false;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || entry.contentRect.width === 0) return;
      if (onReadyCalledRef.current) return;
      onReadyCalledRef.current = true;
      observer.disconnect();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => onReady());
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onReady, disabled, isInitializing, isInitialized]);

  // Initialize user KB and load chat history when userId is available.
  useEffect(() => {
    if (userId && isInitialized && !disabled) {
      if (loadedUserIdRef.current !== userId) {
        loadedUserIdRef.current = userId;
        agent?.clearHistory();
        sessionFirstMessageContentRef.current = null;
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
      const sessionFirstMessageContent = loadedMessages.length === 0
        ? t('agent.sessionFirstMessageIntro')
        : [t('agent.sessionFirstMessageReturning1'), t('agent.sessionFirstMessageReturning2'), t('agent.sessionFirstMessageReturning3')][Math.floor(Math.random() * 3)];
      sessionFirstMessageContentRef.current = sessionFirstMessageContent;

      // Show a brief "thinking" state (0.1s–0.5s) before revealing the session first message
      const placeholder = [...loadedMessages, { role: 'assistant' as const, content: '' }];
      setMessages(placeholder);
      setShowThinking(true);
      setIsProcessing(true);
      const delayMs = 500 + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      setMessages(prev => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].role === 'assistant') {
          next[next.length - 1] = { ...next[next.length - 1], content: sessionFirstMessageContent };
        }
        return next;
      });
      setShowThinking(false);
      setIsProcessing(false);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setMessages([]);
      setShowThinking(false);
      setIsProcessing(false);
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
    setShowThinking(true);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }, { role: 'assistant', content: '' }]);

    try {
      if (sessionFirstMessageContentRef.current != null) {
        agent.setSessionFirstMessage(sessionFirstMessageContentRef.current);
        sessionFirstMessageContentRef.current = null;
      }
      const mentalHealthKeywords = ['mood', 'anxiety', 'depression', 'mental', 'therapy', 'gratitude', 'stress', 'emotion', 'feeling', 'sad', 'worried', 'diagnosis', 'condition', 'sleep', 'mindfulness'];
      const useRAGForQuery = mentalHealthKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
      const response = await agent.processQuery(userMessage, {
        useRAG: useRAGForQuery,
        userId,
        language: currentLanguage,
        onStreamChunk: (text) => {
          setMessages(prev => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'assistant') {
              const wasEmpty = last.content === '';
              next[next.length - 1] = { ...last, content: last.content + text };
              // Hide "Thinking" after the first chunk is painted (next frame)
              if (wasEmpty) {
                requestAnimationFrame(() => setShowThinking(false));
              }
            }
            return next;
          });
        },
      });

      if (response.fromCache) {
        const delayMs = 500 + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') {
          next[next.length - 1] = { ...last, content: response.response };
        }
        return next;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process query';
      
      // Provide more helpful error messages
      let userFriendlyError = t('errors.somethingWentWrong');
      if (errorMessage.includes('Model not initialized')) {
        userFriendlyError = t('errors.modelNotSetUp');
      } else if (errorMessage.includes('Python')) {
        // Show the actual backend error so users see spawn/import details; add hint if short
        userFriendlyError = errorMessage.length > 80
          ? errorMessage
          : `${errorMessage} ${t('errors.pythonHint')}`;
      } else if (errorMessage.includes('timeout') || errorMessage.includes('time')) {
        userFriendlyError = t('errors.timeout');
      } else {
        userFriendlyError = `${t('errors.somethingWentWrong')}: ${errorMessage}`;
      }
      
      setError(userFriendlyError);
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') {
          next[next.length - 1] = { ...last, content: userFriendlyError };
        } else {
          next.push({ role: 'assistant', content: userFriendlyError });
        }
        return next;
      });
    } finally {
      setIsProcessing(false);
      setShowThinking(false);
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

  const handleDeleteChatHistoryClick = () => setShowDeleteChatHistoryModal(true);
  const handleDeleteChatHistoryConfirm = async () => {
    setShowDeleteChatHistoryModal(false);
    try {
      await clearChatHistoryForUser(userId);
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const sidebarItems = [
    onLogOut && { label: t('ui.logOut'), icon: <LogOut size={20} />, onClick: handleLogOutClick },
    { label: t('ui.settings'), icon: <Settings size={20} />, onClick: () => setShowUserSettingsModal(true) },
    { label: t('ui.deleteChatHistory'), icon: <Trash2 size={20} />, onClick: handleDeleteChatHistoryClick },
  ].filter(Boolean) as Array<{ label: string; icon: React.ReactNode; onClick: () => void }>;

  const modals = (
    <>
      {showLogOutModal && (
        <LogOutConfirmModal onConfirm={handleLogOutConfirm} onCancel={() => setShowLogOutModal(false)} userId={userId} />
      )}
      {showDeleteChatHistoryModal && (
        <DeleteChatHistoryConfirmModal
          onConfirm={handleDeleteChatHistoryConfirm}
          onCancel={() => setShowDeleteChatHistoryModal(false)}
          userId={userId}
        />
      )}
      {showUserSettingsModal && (
        <UserSettingsModal isOpen={showUserSettingsModal} onClose={() => setShowUserSettingsModal(false)} userId={userId} />
      )}
    </>
  );

  if (disabled) {
    return (
      <>
        {modals}
        <ChatLayout
          sidebar={<ChatSidebarShell items={sidebarItems} aria-label={t('ui.navAccountAndSettings')} />}
          className="chat-disabled"
        >
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
        </ChatLayout>
      </>
    );
  }

  if (isInitializing) {
    return (
      <>
        {modals}
        <ChatLayout
          sidebar={<ChatSidebarShell items={sidebarItems} aria-label={t('ui.navAccountAndSettings')} />}
        >
          <div className="chat-placeholder">
            <div className="loading-spinner"></div>
            <p>{t('ui.preparingChat')}</p>
          </div>
        </ChatLayout>
      </>
    );
  }

  if (!isInitialized) {
    return (
      <>
        {modals}
        <ChatLayout
          sidebar={<ChatSidebarShell items={sidebarItems} aria-label={t('ui.navAccountAndSettings')} />}
        >
          <div className="chat-placeholder">
            <p>{t('ui.preparingChat')}</p>
            {error && (
              <div className="error-message">
                <strong>{t('ui.errorLabel')}:</strong> {error}
              </div>
            )}
          </div>
        </ChatLayout>
      </>
    );
  }

  const chatMessagesForPackage = messages.map((msg) => ({
    role: msg.role,
    content: msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content,
    ...(msg.role === 'assistant' && { copyableText: msg.content }),
  }));

  return (
    <>
      {modals}
      <div ref={containerRef} className="chat-interface-wrapper">
        <ChatLayout
          sidebar={<ChatSidebarShell items={sidebarItems} aria-label={t('ui.navAccountAndSettings')} />}
        >
          <ChatMessages
            messages={chatMessagesForPackage}
            welcomeTitle={t('ui.emptyChatTitle')}
            welcomeSubtitle={t('ui.emptyChatSubtitle')}
            showThinking={isProcessing && showThinking}
            thinkingLabel={t('ui.thinking')}
            onCopy={handleCopyMessage}
            copiedIndex={copiedIndex}
            copyLabel={t('ui.copy')}
            copiedLabel={t('ui.copied')}
            scrollAnchorRef={messagesEndRef}
          />
          {error && (
            <div className="chat-error" role="alert">
              {error}
            </div>
          )}
          <ChatInputBar
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder={t('ui.askHealthQuestion')}
            disabled={isProcessing || !isInitialized}
            sendButtonLabel={t('ui.send')}
            inputRef={inputRef}
          />
          <p className="chat-footer">
            {t('agent.disclaimer')}
          </p>
        </ChatLayout>
      </div>
    </>
  );
}
