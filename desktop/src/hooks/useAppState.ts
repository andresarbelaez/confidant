import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { t } from '../i18n';
import { logAppTiming, logViewEntered } from '../utils/appTiming';

export interface AppUser {
  id: string;
  name: string;
  created_at: string;
}

export type AppView =
  | { type: 'loading' }
  | { type: 'downloading-model'; url: string; outputPath: string }
  | { type: 'user-selection'; preloadedUsers?: AppUser[] | null }
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
    logViewEntered('loading');
    setState(prev => ({
      ...prev,
      view: { type: 'loading' },
    }));
  }, []);

  const transitionToUserSelection = useCallback(async (preloadedUsers?: AppUser[] | null) => {
    logViewEntered('user-selection');
    // Clear persisted user to force selection
    await invoke('set_current_user', { userId: null }).catch(console.error);
    setState(prev => ({
      ...prev,
      view: { type: 'user-selection', preloadedUsers: preloadedUsers ?? undefined },
      showSettingsModal: false,
    }));
  }, []);

  /** Go to user-selection and open Settings (e.g. from the "defaults not found" error). */
  const transitionToUserSelectionWithSettings = useCallback(async (preloadedUsers?: AppUser[] | null) => {
    logViewEntered('user-selection');
    await invoke('set_current_user', { userId: null }).catch(console.error);
    setState(prev => ({
      ...prev,
      view: { type: 'user-selection', preloadedUsers: preloadedUsers ?? undefined },
      showSettingsModal: true,
    }));
  }, []);

  const transitionToChat = useCallback(async (userId: string) => {
    logViewEntered('chat');
    // Set current user in backend
    await invoke('set_current_user', { userId }).catch(console.error);
    setState(prev => ({
      ...prev,
      view: { type: 'chat', userId },
      showSettingsModal: false,
    }));
  }, []);

  const transitionToError = useCallback((message: string, retry?: () => void, onContinue?: () => void) => {
    logViewEntered('error');
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
    logViewEntered('user-selection');
    await invoke('set_current_user', { userId: null }).catch(console.error);
    let preloaded: AppUser[] | null = null;
    try {
      preloaded = await invoke<AppUser[]>('get_users').catch(() => null);
    } catch {
      // ignore
    }
    setState(prev => ({
      ...prev,
      view: { type: 'user-selection', preloadedUsers: preloaded ?? undefined },
      showSettingsModal: false,
    }));
  }, []);

  // Handle model ready
  const handleModelReady = useCallback((_path: string) => {
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

    logViewEntered('loading');
    logAppTiming('initialize start');

    const initialize = async () => {
      try {
        // First check setup status
        logAppTiming('checkSetup start');
        let setupStatus = await checkSetup();
        logAppTiming('checkSetup done');

        // If setup is incomplete, try to initialize from bundled defaults once
        if (!setupStatus.modelReady || !setupStatus.globalKBReady) {
          try {
            logAppTiming('ensure_bundled_defaults_initialized start');
            const bundled = await invoke<{
              model_ready: boolean;
              kb_ready: boolean;
              default_model_download_url?: string;
              default_model_output_path?: string;
            }>('ensure_bundled_defaults_initialized');
            logAppTiming('ensure_bundled_defaults_initialized done');

            // If no model but we can auto-download, show downloading screen
            if (
              !bundled.model_ready &&
              bundled.default_model_download_url &&
              bundled.default_model_output_path
            ) {
              logViewEntered('downloading-model');
              setState(prev => ({
                ...prev,
                view: {
                  type: 'downloading-model',
                  url: bundled.default_model_download_url,
                  outputPath: bundled.default_model_output_path,
                },
                setupStatus: { ...prev.setupStatus, isChecking: false },
              }));
              return;
            }

            setupStatus = await checkSetup();
          } catch (err) {
            console.warn('Bundled defaults init failed:', err);
          }

          if (!setupStatus.modelReady || !setupStatus.globalKBReady) {
            let preloaded: AppUser[] | null = null;
            try {
              preloaded = await invoke<AppUser[]>('get_users').catch(() => null);
            } catch {
              // ignore
            }
            await transitionToUserSelectionWithSettings(preloaded);
            return;
          }
        }

        // Setup is complete, check for current user
        logAppTiming('checkCurrentUser start');
        const userId = await checkCurrentUser();
        logAppTiming('checkCurrentUser done');

        if (userId) {
          await transitionToChat(userId);
        } else {
          let preloadedUsers: AppUser[] | null = null;
          try {
            preloadedUsers = await invoke<AppUser[]>('get_users').catch(() => null);
          } catch {
            // ignore
          }
          await transitionToUserSelection(preloadedUsers);
        }
      } catch (err) {
        console.error('Failed to initialize app:', err);
        transitionToError(t('errors.failedToInitialize'), () => {
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
