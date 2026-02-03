import { useState, useEffect } from 'react';
import SetupModal from './components/SetupModal';
import ChatInterface from './components/ChatInterface';
import LoadingScreen from './components/LoadingScreen';
import './App.css';

function App() {
  const [modelReady, setModelReady] = useState(false);
  const [kbReady, setKBReady] = useState(false);
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isInitialSetup, setIsInitialSetup] = useState(true);

  // Check initial state on mount
  useEffect(() => {
    checkInitialState();
  }, []);

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

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <div className="App">
      <main className={`App-main ${showSetupModal ? 'dimmed' : ''}`}>
        <ChatInterface 
          disabled={!isSetupComplete}
          modelReady={modelReady}
          kbReady={kbReady}
          onOpenSettings={handleOpenSettings}
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
