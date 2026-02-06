import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type AppView =
  | { type: 'loading' }
  | { type: 'user-selection' }
  | { type: 'chat', userId: string }
  | { type: 'error', message: string, retry?: () => void; onContinue?: () => void };

export interface SetupStatus {
  modelReady: boolean;
  globalKBReady: boolean;
  isChecking: boolean;
}

interface AppState {
  view: AppView;
  setupStatus: SetupStatus;
  showSettingsModal: boolean;
}

export function useAppState() {
  const [state, setState] = useState<AppState>({
    view: { type: 'loading' },
    setupStatus: {
      modelReady: false,
      globalKBReady: false,
      isChecking: true,
    },
    showSettingsModal: false,
  });

  const initializationRef = useRef(false);
  const setupCheckInProgressRef = useRef(false);

  // Single function to check setup status
  const checkSetup = useCallback(async (): Promise<SetupStatus> => {
    // Prevent concurrent setup checks - return current state if already checking
    if (setupCheckInProgressRef.current) {
      // Return a promise that resolves with current state
      return new Promise<SetupStatus>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!setupCheckInProgressRef.current) {
            clearInterval(checkInterval);
            setState(prev => {
              resolve(prev.setupStatus);
              return prev;
            });
          }
        }, 50);
      });
    }

    setupCheckInProgressRef.current = true;
    setState(prev => ({
      ...prev,
      setupStatus: { ...prev.setupStatus, isChecking: true },
    }));

    try {
      // Check model and KB in parallel
      const [modelReady, globalKBReady] = await Promise.all([
        invoke<boolean>('is_model_loaded').catch(() => false),
        (async () => {
          try {
            const stats = await invoke<{ document_count: number }>('get_collection_stats_by_name', {
              collectionName: 'dant_knowledge_global',
            });
            return stats.document_count > 0;
          } catch {
            return false;
          }
        })(),
      ]);

      const newSetupStatus: SetupStatus = {
        modelReady,
        globalKBReady,
        isChecking: false,
      };

      setState(prev => ({
        ...prev,
        setupStatus: newSetupStatus,
      }));

      return newSetupStatus;
    } catch (err) {
      console.error('Failed to check setup status:', err);
      const errorStatus: SetupStatus = {
        modelReady: false,
        globalKBReady: false,
        isChecking: false,
      };
      setState(prev => ({
        ...prev,
        setupStatus: errorStatus,
      }));
      return errorStatus;
    } finally {
      setupCheckInProgressRef.current = false;
    }
  }, []);

  // Check current user
  const checkCurrentUser = useCallback(async (): Promise<string | null> => {
    try {
      const userId = await invoke<string | null>('get_current_user');
      return userId;
    } catch (err) {
      console.error('Failed to check current user:', err);
      return null;
    }
  }, []);

  // Transition functions
  const transitionToLoading = useCallback(() => {
    setState(prev => ({
      ...prev,
      view: { type: 'loading' },
    }));
  }, []);

  const transitionToUserSelection = useCallback(async () => {
    // Clear persisted user to force selection
    await invoke('set_current_user', { userId: null }).catch(console.error);
    setState(prev => ({
      ...prev,
      view: { type: 'user-selection' },
      showSettingsModal: false,
    }));
  }, []);

  const transitionToChat = useCallback(async (userId: string) => {
    // Set current user in backend
    await invoke('set_current_user', { userId }).catch(console.error);
    setState(prev => ({
      ...prev,
      view: { type: 'chat', userId },
      showSettingsModal: false,
    }));
  }, []);

  const transitionToError = useCallback((message: string, retry?: () => void, onContinue?: () => void) => {
    setState(prev => ({
      ...prev,
      view: { type: 'error', message, retry, onContinue },
    }));
  }, []);

  const openSettings = useCallback(() => {
    setState(prev => ({
      ...prev,
      showSettingsModal: true,
    }));
  }, []);

  const closeSettings = useCallback(() => {
    setState(prev => ({
      ...prev,
      showSettingsModal: false,
    }));
  }, []);

  const switchProfile = useCallback(async () => {
    await invoke('set_current_user', { userId: null }).catch(console.error);
    setState(prev => ({
      ...prev,
      view: { type: 'user-selection' },
      showSettingsModal: false,
    }));
  }, []);

  // Handle model ready
  const handleModelReady = useCallback((path: string) => {
    setState(prev => ({
      ...prev,
      setupStatus: {
        ...prev.setupStatus,
        modelReady: true,
      },
    }));
  }, []);

  // Handle global KB ready
  const handleGlobalKBReady = useCallback(() => {
    setState(prev => ({
      ...prev,
      setupStatus: {
        ...prev.setupStatus,
        globalKBReady: true,
      },
    }));
  }, []);

  // Initialize app state on mount
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initialize = async () => {
      try {
        // First check setup status
        let setupStatus = await checkSetup();

        // If setup is incomplete, try to initialize from bundled defaults once
        if (!setupStatus.modelReady || !setupStatus.globalKBReady) {
          try {
            await invoke<{ model_ready: boolean; kb_ready: boolean }>(
              'ensure_bundled_defaults_initialized'
            );
            setupStatus = await checkSetup();
          } catch (err) {
            console.warn('Bundled defaults init failed:', err);
          }

          if (!setupStatus.modelReady || !setupStatus.globalKBReady) {
            transitionToError(
              "Confidant couldn't find the default model or knowledge base. Reinstall the app or open Settings to choose a model.",
              undefined,
              () => transitionToUserSelection()
            );
            return;
          }
        }

        // Setup is complete, check for current user
        const userId = await checkCurrentUser();

        if (userId) {
          await transitionToChat(userId);
        } else {
          await transitionToUserSelection();
        }
      } catch (err) {
        console.error('Failed to initialize app:', err);
        transitionToError('Failed to initialize application. Please try again.', () => {
          initializationRef.current = false;
          initialize();
        });
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Auto-show settings if user is in chat but setup is incomplete
  useEffect(() => {
    if (
      state.view.type === 'chat' &&
      (!state.setupStatus.modelReady || !state.setupStatus.globalKBReady) &&
      !state.setupStatus.isChecking &&
      !state.showSettingsModal
    ) {
      openSettings();
    }
  }, [state.view, state.setupStatus, state.showSettingsModal, openSettings]);

  return {
    view: state.view,
    setupStatus: state.setupStatus,
    showSettingsModal: state.showSettingsModal,
    checkSetup,
    checkCurrentUser,
    transitionToLoading,
    transitionToUserSelection,
    transitionToChat,
    transitionToError,
    openSettings,
    closeSettings,
    switchProfile,
    handleModelReady,
    handleGlobalKBReady,
  };
}
