import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  downloadAndLoadModel as dlLoad,
  initRunAnywhere,
  isModelDownloaded,
  loadModel,
  type StreamResult,
} from '../services/LLMService';
import { generateStream } from '../services/LLMService';

type LLMState = {
  isReady: boolean;
  isModelLoaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  error: string | null;
};

type LLMContextValue = LLMState & {
  downloadAndLoad: () => Promise<void>;
  generateStream: (prompt: string, options?: { maxTokens?: number; temperature?: number }) => StreamResult;
};

const initialState: LLMState = {
  isReady: false,
  isModelLoaded: false,
  isDownloading: false,
  downloadProgress: 0,
  error: null,
};

const LLMContext = createContext<LLMContextValue | null>(null);

export function LLMProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LLMState>(initialState);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await initRunAnywhere();
        if (cancelled) return;
        const downloaded = await isModelDownloaded();
        if (cancelled) return;
        setState((s) => ({ ...s, isReady: true, error: null }));
        if (downloaded) {
          await loadModel();
          if (!cancelled) setState((s) => ({ ...s, isModelLoaded: true }));
        }
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({ ...s, isReady: true, error: (e as Error).message }));
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const downloadAndLoad = useCallback(async () => {
    setState((s) => ({ ...s, isDownloading: true, downloadProgress: 0, error: null }));
    try {
      await dlLoad((progress) => {
        setState((s) => ({ ...s, downloadProgress: progress }));
      });
      setState((s) => ({ ...s, isModelLoaded: true, isDownloading: false, downloadProgress: 1, error: null }));
    } catch (e) {
      setState((s) => ({
        ...s,
        isDownloading: false,
        error: (e as Error).message,
      }));
    }
  }, []);

  const streamGenerate = useCallback(
    (prompt: string, options?: { maxTokens?: number; temperature?: number }) => {
      return generateStream(prompt, options);
    },
    []
  );

  const value: LLMContextValue = {
    ...state,
    downloadAndLoad,
    generateStream: streamGenerate,
  };

  return <LLMContext.Provider value={value}>{children}</LLMContext.Provider>;
}

export function useLLM(): LLMContextValue {
  const ctx = useContext(LLMContext);
  if (!ctx) throw new Error('useLLM must be used within LLMProvider');
  return ctx;
}
