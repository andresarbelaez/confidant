import { useState, useEffect } from 'react';
import SetupModal from './components/SetupModal';
import ChatInterface from './components/ChatInterface';
import LoadingScreen from './components/LoadingScreen';
import UserProfileSelector from './components/UserProfileSelector';
import ErrorScreen from './components/ErrorScreen';
import { useAppState } from './hooks/useAppState';
import { useTranslation } from './i18n/hooks/useTranslation';
import { clearAllChatHistory } from './utils/clearChatHistory';
import './App.css';

function App() {
  const { t } = useTranslation(null);
  const [loadingComplete, setLoadingComplete] = useState(false);
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
    const clearHistory = async () => {
      try {
        await clearAllChatHistory();
        console.log('Chat history cleared for all users');
      } catch (err) {
        console.error('Failed to clear chat history:', err);
      }
    };
    clearHistory();
  }, []); // Run once on mount

  const handleLoadingComplete = () => {
    setLoadingComplete(true);
  };

  const handleUserSelected = async (userId: string) => {
    await transitionToChat(userId);
  };

  // Show loading screen until it's explicitly completed
  if (!loadingComplete || view.type === 'loading') {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  // Render based on current view state
  switch (view.type) {
    case 'user-selection':
      return (
        <div className={`App ${showSettingsModal ? 'dimmed' : ''}`}>
          <UserProfileSelector onUserSelected={handleUserSelected} />
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
            />
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
      // Fallback to loading if we're in an unknown state
      return <LoadingScreen onComplete={handleLoadingComplete} />;
  }
}

export default App;
