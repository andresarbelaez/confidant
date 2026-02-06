import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import SetupModal from './components/SetupModal';
import SetupScreen from './components/SetupScreen';
import ChatInterface from './components/ChatInterface';
import LoadingScreen from './components/LoadingScreen';
import UserProfileSelector from './components/UserProfileSelector';
import './App.css';

function App() {
  const [modelReady, setModelReady] = useState(false);
  const [globalKBReady, setGlobalKBReady] = useState(false);
  const [userKBReady, setUserKBReady] = useState(false);
  const [, setModelPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isGlobalKBSetup, setIsGlobalKBSetup] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [isCheckingSetup, setIsCheckingSetup] = useState(false);
  const [setupJustCompleted, setSetupJustCompleted] = useState(false);

  // Define functions before useEffect hooks that use them
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

  const checkGlobalKB = async () => {
    try {
      // Check if global KB collection has documents
      try {
        const stats = await invoke<{ document_count: number }>('get_collection_stats_by_name', {
          collectionName: 'dant_knowledge_global'
        });
        if (stats.document_count > 0) {
          setGlobalKBReady(true);
        }
      } catch (err) {
        // Global KB not initialized yet, that's okay
        console.log('Global KB not ready:', err);
      }
    } catch (err) {
      console.error('Failed to check global KB:', err);
    }
  };

  const checkSetupStatus = async () => {
    setIsCheckingSetup(true);
    try {
      // Check if model is loaded
      const isModelLoaded = await invoke<boolean>('is_model_loaded');
      if (isModelLoaded) {
        setModelReady(true);
      }

      // Check if global KB has documents
      try {
        const stats = await invoke<{ document_count: number }>('get_collection_stats_by_name', {
          collectionName: 'dant_knowledge_global'
        });
        if (stats.document_count > 0) {
          setGlobalKBReady(true);
        }
      } catch (err) {
        // Global KB not initialized yet
        console.log('Global KB not ready:', err);
      }
    } catch (err) {
      console.error('Failed to check setup status:', err);
    } finally {
      setIsCheckingSetup(false);
    }
  };

  // Check initial state on mount
  useEffect(() => {
    const initialize = async () => {
      // Check model status
      let modelReadyLocal = false;
      try {
        const isModelLoaded = await invoke<boolean>('is_model_loaded');
        if (isModelLoaded) {
          modelReadyLocal = true;
          setModelReady(true);
        }
      } catch (err) {
        console.error('Failed to check model status:', err);
      }
      
      // Check global KB status using the existing function
      await checkGlobalKB();
      
      // Re-check KB status after checkGlobalKB updates state
      // We need to check directly since state updates are async
      let globalKBReadyLocal = false;
      try {
        const stats = await invoke<{ document_count: number }>('get_collection_stats_by_name', {
          collectionName: 'dant_knowledge_global'
        });
        if (stats.document_count > 0) {
          globalKBReadyLocal = true;
        }
      } catch (err) {
        // Global KB not initialized yet, that's okay
      }
      
      // Only check for current user if setup is already complete AND we haven't just completed setup
      // If setup is incomplete, we'll show user selector after setup completes
      // If setup was just completed, we'll show user selector (handled by handleProceed/handleGlobalKBReady)
      if (modelReadyLocal && globalKBReadyLocal && !setupJustCompleted) {
        await checkCurrentUser();
      } else {
        // Setup not complete or just completed - don't check for user, show user selector
        setIsCheckingUser(false);
        setShowUserSelector(true);
      }
    };
    initialize();
  }, []);

  // Calculate setup completeness (derived value, recalculated on each render)
  const isSetupComplete = modelReady && globalKBReady;

  // Show global KB setup modal if not ready after loading screen (only before user selection)
  useEffect(() => {
    if (!isLoading && !globalKBReady && !currentUserId && !isCheckingUser && !isCheckingSetup) {
      setShowSetupModal(true);
      setIsGlobalKBSetup(true);
    } else if (isSetupComplete && currentUserId) {
      // If setup is complete and user is selected, ensure settings modal is closed
      setShowSetupModal(false);
      setIsGlobalKBSetup(false);
    } else if (!isSetupComplete && currentUserId && !isCheckingUser && !isCheckingSetup && !showSetupModal) {
      // If setup is incomplete and user is selected, automatically show settings modal
      setShowSetupModal(true);
      setIsGlobalKBSetup(false);
    }
  }, [isLoading, globalKBReady, modelReady, currentUserId, isCheckingUser, isCheckingSetup, isSetupComplete, showSetupModal]);

  const handleModelReady = (path: string) => {
    setModelPath(path);
    setModelReady(true);
  };

  const handleGlobalKBReady = async () => {
    setGlobalKBReady(true);
    const wasGlobalKBSetup = isGlobalKBSetup;
    setIsGlobalKBSetup(false);
    // After global KB is ready, if we were in global KB setup, clear persisted user
    // This ensures users always select/create a profile after initial setup
    if (wasGlobalKBSetup) {
      // Mark that setup was just completed
      setSetupJustCompleted(true);
      // Clear persisted user state to force user selection
      await invoke('set_current_user', { userId: null }).catch(console.error);
      setCurrentUserId(null);
      setShowUserSelector(true);
      setIsCheckingUser(false); // Mark user check as complete so we don't check again
      // Don't call checkCurrentUser() here - we want to force user selection
    }
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  const handleProceed = async () => {
    // Only allow proceeding if global KB is ready
    if (globalKBReady) {
      setShowSetupModal(false);
      setIsGlobalKBSetup(false);
      // Mark that setup was just completed
      setSetupJustCompleted(true);
      // After global KB setup, clear persisted user and show user selector
      // This ensures users always select/create a profile after initial setup
      await invoke('set_current_user', { userId: null }).catch(console.error);
      setCurrentUserId(null);
      setShowUserSelector(true);
      setIsCheckingUser(false); // Mark user check as complete so we don't check again
      // Don't call checkCurrentUser() here - we want to force user selection
    }
  };

  const handleOpenSettings = () => {
    setIsGlobalKBSetup(false);
    setShowSetupModal(true);
  };

  const handleCloseSettings = async () => {
    setShowSetupModal(false);
    // After closing settings, re-check user state to ensure proper routing
    // If no user is selected, show user selector
    if (!currentUserId) {
      await checkCurrentUser();
    }
  };

  const handleUserSelected = async (userId: string) => {
    setCurrentUserId(userId);
    setShowUserSelector(false);
    // Check setup status after user selection to determine if settings are needed
    await checkSetupStatus();
  };

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  // Show global KB setup if not ready (blocking) - use static SetupScreen
  if (!isLoading && !globalKBReady) {
    return (
      <div className="App">
        <SetupScreen
          onModelReady={handleModelReady}
          onKBReady={handleGlobalKBReady}
          onProceed={handleProceed}
          showOnlyKB={true}
        />
      </div>
    );
  }

  // Show user selector if no user is selected and we're done checking
  if (!isCheckingUser && !isCheckingSetup && showUserSelector && globalKBReady && !currentUserId) {
    return (
      <div className="App">
        <UserProfileSelector onUserSelected={handleUserSelected} />
      </div>
    );
  }

  // Show loading while checking user or setup status
  if (isCheckingUser || isCheckingSetup) {
    return (
      <div className="App">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <div>{isCheckingSetup ? 'Checking setup...' : 'Loading...'}</div>
        </div>
      </div>
    );
  }

  // If no user is selected and we're not checking, show user selector (fallback check)
  // This ensures we show user selector after settings are closed if no user is selected
  if (!currentUserId && !isCheckingUser && !isCheckingSetup && globalKBReady && !showSetupModal) {
    return (
      <div className="App">
        <UserProfileSelector onUserSelected={handleUserSelected} />
      </div>
    );
  }

  // Only show chat interface if we have a current user
  if (!currentUserId) {
    // If we get here and no user, something went wrong - show user selector
    return (
      <div className="App">
        <UserProfileSelector onUserSelected={handleUserSelected} />
      </div>
    );
  }

  return (
    <div className="App">
      <main className={`App-main ${showSetupModal ? 'dimmed' : ''}`}>
        <ChatInterface 
          disabled={!isSetupComplete}
          modelReady={modelReady}
          kbReady={globalKBReady}
          chatVisible={!showSetupModal}
          onOpenSettings={handleOpenSettings}
          userId={currentUserId}
          onSwitchProfile={() => {
            setCurrentUserId(null);
            setShowUserSelector(true);
            // Clear current user in backend
            invoke('set_current_user', { userId: null }).catch(console.error);
          }}
        />
      </main>
      
      {showSetupModal && !isGlobalKBSetup && (
        <SetupModal
          isOpen={showSetupModal}
          onClose={handleCloseSettings}
          onModelReady={handleModelReady}
          onKBReady={handleGlobalKBReady}
          title="Settings"
          showProceedButton={false}
          userId={currentUserId}
        />
      )}
    </div>
  );
}

export default App;
