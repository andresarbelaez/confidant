import { useState, useEffect, useRef, useCallback } from 'react';
import SetupModal from './components/SetupModal';
import ChatInterface from './components/ChatInterface';
import LoadingScreen from './components/LoadingScreen';
import UserProfileSelector from './components/UserProfileSelector';
import ErrorScreen from './components/ErrorScreen';
import { useAppState } from './hooks/useAppState';
import { useTranslation } from './i18n/hooks/useTranslation';
import { clearAllChatHistory } from './utils/clearChatHistory';
import { logUserSelectionRevealed, logChatRevealed } from './utils/appTiming';
import './App.css';
import './components/SharedModal.css';

/** Fallback: reveal after this if onReady never fires. */
const USER_SELECTION_REVEAL_FALLBACK_MS = 4000;
const CHAT_REVEAL_FALLBACK_MS = 4000;

function App() {
  const { t } = useTranslation(null);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [userSelectionReveal, setUserSelectionReveal] = useState(false);
  const [chatReveal, setChatReveal] = useState(false);
  const userSelectionFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    view,
    setupStatus,
    showSettingsModal,
    transitionToChat,
    closeSettings,
    switchProfile,
    handleModelReady,
    handleGlobalKBReady,
  } = useAppState();

  // Clear chat history for all users on app start (one-time operation)
  useEffect(() => {
    clearAllChatHistory().catch((err) => {
      console.error('Failed to clear chat history:', err);
    });
  }, []);

  // User-selection: reveal when onReady fires or after fallback
  useEffect(() => {
    if (view.type !== 'user-selection') {
      setUserSelectionReveal(false);
      if (userSelectionFallbackRef.current) clearTimeout(userSelectionFallbackRef.current);
      userSelectionFallbackRef.current = null;
      return;
    }
    userSelectionFallbackRef.current = setTimeout(() => {
      userSelectionFallbackRef.current = null;
      logUserSelectionRevealed('fallback');
      setUserSelectionReveal(true);
    }, USER_SELECTION_REVEAL_FALLBACK_MS);
    return () => {
      if (userSelectionFallbackRef.current) clearTimeout(userSelectionFallbackRef.current);
    };
  }, [view]);

  // Chat: reveal when onReady fires or after fallback
  useEffect(() => {
    if (view.type !== 'chat') {
      setChatReveal(false);
      if (chatFallbackRef.current) clearTimeout(chatFallbackRef.current);
      chatFallbackRef.current = null;
      return;
    }
    chatFallbackRef.current = setTimeout(() => {
      chatFallbackRef.current = null;
      logChatRevealed('fallback');
      setChatReveal(true);
    }, CHAT_REVEAL_FALLBACK_MS);
    return () => {
      if (chatFallbackRef.current) clearTimeout(chatFallbackRef.current);
    };
  }, [view]);

  const handleLoadingComplete = () => {
    setLoadingComplete(true);
  };

  const handleUserSelected = async (userId: string) => {
    await transitionToChat(userId);
  };

  const handleUserSelectionReady = useCallback(() => {
    if (userSelectionFallbackRef.current) {
      clearTimeout(userSelectionFallbackRef.current);
      userSelectionFallbackRef.current = null;
    }
    logUserSelectionRevealed('onReady');
    setUserSelectionReveal(true);
  }, []);

  const handleChatReady = useCallback(() => {
    if (chatFallbackRef.current) {
      clearTimeout(chatFallbackRef.current);
      chatFallbackRef.current = null;
    }
    logChatRevealed('onReady');
    setChatReveal(true);
  }, []);

  const stillLoading = !loadingComplete || view.type === 'loading';
  const userSelectionTransitioning = view.type === 'user-selection' && !userSelectionReveal;
  const chatTransitioning = view.type === 'chat' && !chatReveal;

  // Full-screen loading until init is done
  if (stillLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  // Render based on current view state
  switch (view.type) {
    case 'user-selection':
      return (
        <div className={`App ${showSettingsModal ? 'dimmed' : ''}`}>
          {/* Mount profile selector immediately so it can paint; overlay loading briefly to avoid blank flash */}
          <UserProfileSelector
            onUserSelected={handleUserSelected}
            initialUsers={view.preloadedUsers ?? undefined}
            onReady={handleUserSelectionReady}
          />
          {userSelectionTransitioning && (
            <div className="App-loading-overlay" aria-hidden="true">
              <LoadingScreen onComplete={() => {}} showLanguageSelector={false} />
            </div>
          )}
          {showSettingsModal && (
            <SetupModal
              isOpen={showSettingsModal}
              onClose={closeSettings}
              onModelReady={handleModelReady}
              onKBReady={handleGlobalKBReady}
              title={t('ui.settings')}
              showProceedButton={false}
              userId={null}
            />
          )}
        </div>
      );

    case 'chat': {
      const isSetupComplete = setupStatus.modelReady && setupStatus.globalKBReady;
      return (
        <div className="App">
          <main className={`App-main ${showSettingsModal ? 'dimmed' : ''}`}>
            <ChatInterface
              disabled={!isSetupComplete}
              modelReady={setupStatus.modelReady}
              kbReady={setupStatus.globalKBReady}
              chatVisible={!showSettingsModal}
              userId={view.userId}
              onSwitchProfile={switchProfile}
              onLogOut={switchProfile}
              onReady={handleChatReady}
            />
            {chatTransitioning && (
              <div className="App-loading-overlay" aria-hidden="true">
                <LoadingScreen onComplete={() => {}} showLanguageSelector={false} />
              </div>
            )}
          </main>

          {showSettingsModal && (
            <SetupModal
              isOpen={showSettingsModal}
              onClose={closeSettings}
              onModelReady={handleModelReady}
              onKBReady={handleGlobalKBReady}
              title={t('ui.settings')}
              showProceedButton={false}
              userId={view.userId}
            />
          )}
        </div>
      );
    }

    case 'error':
      return (
        <div className="App">
          <ErrorScreen
            message={view.message}
            retry={view.retry}
            onContinue={view.onContinue}
          />
        </div>
      );

    default:
      return <LoadingScreen onComplete={handleLoadingComplete} />;
  }
}

export default App;
