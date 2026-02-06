import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import SetupModal from './components/SetupModal';
import ChatInterface from './components/ChatInterface';
import LoadingScreen from './components/LoadingScreen';
import UserProfileSelector from './components/UserProfileSelector';
import './App.css';

function App() {
  const [modelReady, setModelReady] = useState(false);
  const [kbReady, setKBReady] = useState(false);
  const [, setModelPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isInitialSetup, setIsInitialSetup] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  // Check initial state and current user on mount
  useEffect(() => {
    checkInitialState();
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const userId = await invoke<string | null>('get_current_user');
      if (userId) {
        setCurrentUserId(userId);
        setShowUserSelector(false);
      } else {
        setShowUserSelector(true);
      }
    } catch (err) {
      console.error('Failed to check current user:', err);
      setShowUserSelector(true);
    } finally {
      setIsCheckingUser(false);
    }
  };

  const checkInitialState = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      // Check if model is loaded
      const isModelLoaded = await invoke<boolean>('is_model_loaded');
      if (isModelLoaded) {
        setModelReady(true);
      }

      // Check if KB has documents
      try {
        const stats = await invoke<{ document_count: number }>('get_collection_stats');
        if (stats.document_count > 0) {
          setKBReady(true);
        }
      } catch (err) {
        // KB not initialized yet, that's okay
      }
    } catch (err) {
      console.error('Failed to check initial state:', err);
    }
  };

  // Show setup modal if not ready after loading screen
  useEffect(() => {
    if (!isLoading) {
      const isSetupComplete = modelReady && kbReady;
      if (!isSetupComplete) {
        setShowSetupModal(true);
        setIsInitialSetup(true);
      }
    }
  }, [isLoading, modelReady, kbReady]);

  const handleModelReady = (path: string) => {
    setModelPath(path);
    setModelReady(true);
  };

  const handleKBReady = () => {
    setKBReady(true);
  };

  const isSetupComplete = modelReady && kbReady;

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  const handleProceed = () => {
    setShowSetupModal(false);
    setIsInitialSetup(false);
  };

  const handleOpenSettings = () => {
    setIsInitialSetup(false);
    setShowSetupModal(true);
  };

  const handleCloseSettings = () => {
    setShowSetupModal(false);
  };

  const handleUserSelected = (userId: string | null) => {
    setCurrentUserId(userId);
    setShowUserSelector(false);
  };

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  // Show user selector if no user is selected and we're done checking
  if (!isCheckingUser && showUserSelector) {
    return (
      <div className="App">
        <UserProfileSelector onUserSelected={handleUserSelected} />
      </div>
    );
  }

  // Show loading while checking user
  if (isCheckingUser) {
    return (
      <div className="App">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <main className={`App-main ${showSetupModal ? 'dimmed' : ''}`}>
        <ChatInterface 
          disabled={!isSetupComplete}
          modelReady={modelReady}
          kbReady={kbReady}
          chatVisible={!showSetupModal}
          onOpenSettings={handleOpenSettings}
          userId={currentUserId}
          onSwitchProfile={() => setShowUserSelector(true)}
        />
      </main>
      
      <SetupModal
        isOpen={showSetupModal}
        onClose={isInitialSetup ? undefined : handleCloseSettings}
        onModelReady={handleModelReady}
        onKBReady={handleKBReady}
        title={isInitialSetup ? 'Set up your Confidant' : 'Settings'}
        showProceedButton={isInitialSetup}
        onProceed={isInitialSetup ? handleProceed : undefined}
      />
    </div>
  );
}

export default App;
