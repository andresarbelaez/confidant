/**
 * Dant Agent - Main agent orchestrator
 * Combines LLM and RAG for mental health support
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCachedResponse, cacheResponse, normalizeQuery, initializeCache } from '../utils/response-cache';
import { logLLMGeneration, logLLMStreamStats } from '../utils/appTiming';
import { LanguageCode } from '../i18n';

/** Language code to display name for system prompt (model responds in this language) */
const LANGUAGE_DISPLAY_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
  ru: 'Russian',
};

export interface AgentResponse {
  response: string;
  sources?: Array<{ id: string; text: string; score: number }>;
  usedRAG: boolean;
  isFirstMessage?: boolean;
  /** True when the response came from cache (for UI e.g. fake thinking delay). */
  fromCache?: boolean;
}

export interface AgentConfig {
  useRAG?: boolean;
  maxSources?: number;
}

export class DantAgent {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private maxHistoryLength: number = 10;
  private isFirstMessage: boolean = true;
  private kbReadyCache: boolean | null = null; // Cache KB readiness to avoid repeated stats checks
  private currentLanguage: LanguageCode = 'en';

  /**
   * Set language for cache lookups
   */
  setLanguage(language: LanguageCode): void {
    this.currentLanguage = language;
    // Initialize cache for the new language
    initializeCache(language).catch(err => {
      console.warn('[Agent] Failed to initialize cache:', err);
    });
  }

  /**
   * Mark that the session first message (intro or returning) was already shown by the UI.
   * Seeds conversation history so the next user message uses normal LLM/cache path.
   */
  setSessionFirstMessage(content: string): void {
    this.conversationHistory.push({ role: 'assistant', content });
    this.isFirstMessage = false;
  }

  /**
   * Process a user query with optional RAG
   */
  async processQuery(
    query: string,
    options: {
      stream?: boolean;
      useRAG?: boolean;
      userId?: string;
      language?: LanguageCode;
      /** Called for each streamed token chunk (only when using LLM streaming path). */
      onStreamChunk?: (text: string) => void;
    } = {}
  ): Promise<AgentResponse> {
    const useRAG = options.useRAG ?? true;
    const language = options.language || this.currentLanguage;
    
    // Update language if provided
    if (options.language && options.language !== this.currentLanguage) {
      this.currentLanguage = options.language;
      await initializeCache(language);
    }
    
    // Check cache for both first and subsequent messages (greetings/identity use updated cached responses)
    const normalizedQuery = normalizeQuery(query);
    const cachedResponse = await getCachedResponse(normalizedQuery, language);
    
    if (cachedResponse) {
      const wasFirstMessage = this.isFirstMessage;
      this.isFirstMessage = false;
      this.conversationHistory.push({ role: 'user', content: query });
      this.conversationHistory.push({ role: 'assistant', content: cachedResponse });
      
      if (this.conversationHistory.length > this.maxHistoryLength * 2) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
      }
      
      return {
        response: cachedResponse,
        sources: undefined,
        usedRAG: false,
        isFirstMessage: wasFirstMessage,
        fromCache: true,
      };
    }

    // Check if model is loaded
    const isLoaded = await invoke<boolean>('is_model_loaded');
    if (!isLoaded) {
      throw new Error('Model not initialized. Open Settings and initialize a model.');
    }

    // If RAG is enabled, search for relevant context
    let context = '';
    let sources: Array<{ id: string; text: string; score: number }> = [];
    
    if (useRAG) {
      try {
        // Optimize query text before embedding (normalize whitespace, trim)
        const optimizedQuery = query.trim().replace(/\s+/g, ' ');
        
        // Use cached KB readiness to avoid repeated stats checks
        let shouldUseRAG = true;
        if (this.kbReadyCache === null) {
          // First time: check stats and cache the result
          try {
            const stats = await invoke<{ document_count: number }>('get_collection_stats');
            this.kbReadyCache = stats.document_count > 0;
            shouldUseRAG = this.kbReadyCache;
          } catch (statsErr) {
            // If stats check fails, skip RAG to avoid delays
            this.kbReadyCache = false;
            shouldUseRAG = false;
          }
        } else {
          // Use cached value
          shouldUseRAG = this.kbReadyCache;
        }
        
        if (shouldUseRAG) {
          // Generate embedding ONCE (biggest bottleneck - single call)
          const queryEmbedding = await invoke<number[]>('generate_embedding', { text: optimizedQuery });
          
          // Query both KBs IN PARALLEL (not sequential)
          const userId = options.userId;
          const [globalResults, userResults] = await Promise.all([
            invoke<Array<{
              id: string;
              text: string;
              score: number;
              metadata: any;
            }>>('search_collection', {
              collectionName: 'dant_knowledge_global',
              queryEmbedding,
              limit: 3  // Get top 3 from global
            }).catch(() => []), // Fallback to empty array if query fails
            userId ? invoke<Array<{
              id: string;
              text: string;
              score: number;
              metadata: any;
            }>>('search_collection', {
              collectionName: `dant_knowledge_user_${userId}`,
              queryEmbedding,
              limit: 2  // Get top 2 from user KB (more personal, smaller set)
            }).catch(() => []) : Promise.resolve([]) // Empty if no userId or query fails
          ]);

          // Merge results by score (descending)
          const mergedResults = [...globalResults, ...userResults]
            .filter(r => r.score >= 0.3) // Apply threshold
            .sort((a, b) => b.score - a.score)
            .slice(0, 4); // Top 4 total

          // Deduplicate similar results (if score difference < 0.05, keep higher)
          const deduplicated = mergedResults.reduce((acc, result) => {
            const isDuplicate = acc.some(existing => 
              Math.abs(existing.score - result.score) < 0.05 &&
              existing.text.substring(0, 50) === result.text.substring(0, 50)
            );
            if (!isDuplicate) acc.push(result);
            return acc;
          }, [] as typeof mergedResults);

          if (deduplicated.length > 0) {
            sources = deduplicated.map(r => ({
              id: r.id,
              text: r.text,
              score: r.score
            }));

            // Build context with smart truncation (preserve important info)
            context = this.buildSmartContext(deduplicated, 800);
          }
        }
      } catch (err) {
        console.warn('[Agent] RAG search failed, continuing without context:', err);
        // Continue without RAG if search fails
      }
    }

    // Session first message is shown by the UI at load time; first user message goes through cache then LLM
    // For subsequent messages, use normal LLM generation
    // Use a clear prompt format that encourages direct, concise responses
    const languageName = LANGUAGE_DISPLAY_NAMES[language] ?? 'English';
    const languageInstruction = ` Always respond in ${languageName}. The user's preferred language is ${languageName}.`;
    const systemContext = `You are Confidant, a supportive mental health companion. You help with gratitude, mindfulness, mood, stress, anxiety, and depression—in a supportive, clarifying way.

Psychological best practices:
- Validation before problem-solving: Acknowledge and validate what the user is feeling before offering any perspective or suggestion. Emotions are always valid—you need not agree, only recognize they are real. Reflect back your understanding when appropriate ("It sounds like...", "That sounds really hard").
- Avoid toxic positivity: Never minimize, dismiss, or rush past difficult emotions. Do not say things like "just stay positive," "look on the bright side," or "it could be worse." Take the user's experience seriously.
- Unconditional positive regard: Accept the user non-judgmentally. Create a safe space where their feelings and experiences are valued as-is.

Use clinical psychology best practices for follow-up questions: ask open-ended questions (What, How, Tell me about) that invite reflection without leading. Draw from evidence-based approaches:
- Emotional exploration: "How does that make you feel?" "What's come up for you around that?"
- Clarification: "What would be most helpful to talk about right now?" "What's been on your mind lately?"
- Strengths-forward: "What has helped before when you've felt this way?" "What feels manageable today?"
- Motivational interviewing style: one brief question at a time, non-judgmental, inviting the user to elaborate.

Often end your response with one such follow-up question. Avoid "why" questions (can feel accusatory).

Acknowledge limits and suggest professional help when appropriate. Never diagnose. You are a supportive companion, not a therapist or substitute for professional mental health care. Keep responses brief (2-3 sentences when possible). Use plain language. Respond directly to the user without meta-dialogue or example conversations.${languageInstruction}`;

    // Build conversation history for context (reduced for faster processing)
    let conversationContext = '';
    if (this.conversationHistory.length > 0) {
      // Include recent conversation history (last 2 exchanges for speed)
      const recentHistory = this.conversationHistory.slice(-4);
      conversationContext = recentHistory.map(msg => {
        return msg.role === 'user' ? `User: ${msg.content}` : `Assistant: ${msg.content}`;
      }).join('\n') + '\n';
    }

    let fullPrompt = `${systemContext}

${context ? `Relevant information:\n${context}\n` : ''}${conversationContext}User: ${query}
Assistant:`;

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: query });

    // Generate response using LLM (streaming)
    try {
    const streamId = crypto.randomUUID();
    const config = { temperature: 0.7, top_p: 0.9, max_tokens: 256 };
    const llmStart = Date.now();
    let firstChunkAt: number | null = null;

    const unlistenChunk = await listen<{ streamId: string; text: string }>('llm-stream-chunk', (e) => {
      if (e.payload.streamId !== streamId) return;
      if (firstChunkAt === null) firstChunkAt = Date.now();
      options.onStreamChunk?.(e.payload.text ?? '');
    });
    const unlistenDone = await listen<{ streamId: string; full: string }>('llm-stream-done', (e) => {
      if (e.payload.streamId !== streamId) return;
      resolveDone(e.payload.full);
    });
    const unlistenError = await listen<{ streamId: string; error: string }>('llm-stream-error', (e) => {
      if (e.payload.streamId !== streamId) return;
      rejectErr(e.payload.error ?? 'Stream error');
    });

    let resolveDone!: (full: string) => void;
    let rejectErr!: (err: string) => void;
    const streamPromise = new Promise<string>((resolve, reject) => {
      resolveDone = resolve;
      rejectErr = reject;
    });

    // Timeout so we don't hang if the backend never sends done/error (e.g. Python crash without JSON)
    const STREAM_TIMEOUT_MS = 120_000;
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Response timed out. The model may still be loading or something went wrong. Try again.')), STREAM_TIMEOUT_MS);
    });

    // Fire invoke without awaiting its callback - we only care about stream events.
    // This avoids "Couldn't find callback id" when the app reloads or the promise is dropped
    // while Rust is still running; any startup error (e.g. model not initialized) is still
    // sent via llm-stream-error from the backend.
    invoke('generate_text_stream', {
      streamId,
      prompt: fullPrompt,
      config,
    }).catch((invokeErr: unknown) => {
      const msg = invokeErr instanceof Error ? invokeErr.message : String(invokeErr);
      rejectErr(msg);
    });

    let assistantMessage: string;
    try {
      assistantMessage = await Promise.race([streamPromise, timeoutPromise]);
    } finally {
      unlistenChunk();
      unlistenDone();
      unlistenError();
    }

    const llmDurationMs = Date.now() - llmStart;
    const charCount = assistantMessage?.length ?? 0;
    logLLMGeneration(llmDurationMs, charCount);
    const timeToFirstTokenMs = firstChunkAt !== null ? firstChunkAt - llmStart : -1;
    if (timeToFirstTokenMs >= 0) {
      logLLMStreamStats(timeToFirstTokenMs, llmDurationMs, charCount);
    }

    // Backend sends cleaned "full"; light client-side cleanup if needed
    assistantMessage = (assistantMessage ?? '').trim();
    assistantMessage = assistantMessage
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        const lowerTrimmed = trimmed.toLowerCase();
        return !lowerTrimmed.startsWith('user:') && !lowerTrimmed.startsWith('assistant:');
      })
      .join('\n')
      .trim();
    const lowerMessage = assistantMessage.toLowerCase();
    if (lowerMessage.includes('user:') || lowerMessage.includes('assistant:')) {
      const userIndex = Math.min(
        lowerMessage.indexOf('user:') !== -1 ? lowerMessage.indexOf('user:') : Infinity,
        lowerMessage.indexOf('\nuser:') !== -1 ? lowerMessage.indexOf('\nuser:') + 1 : Infinity,
        lowerMessage.indexOf(' user:') !== -1 ? lowerMessage.indexOf(' user:') : Infinity
      );
      if (userIndex !== Infinity && userIndex > 0) {
        assistantMessage = assistantMessage.substring(0, userIndex).trim();
      }
      assistantMessage = assistantMessage
        .replace(/^Assistant:\s*/gmi, '')
        .replace(/\nAssistant:\s*/gmi, '\n')
        .replace(/\s+Assistant:\s*/gmi, ' ')
        .trim();
    }
    assistantMessage = assistantMessage.replace(/\s+[Aa]ssistant:\s*.*$/g, '').trim();

    this.conversationHistory.push({ role: 'assistant', content: assistantMessage });
    if (this.conversationHistory.length > this.maxHistoryLength * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
    }

    const usedRAGFlag = useRAG && sources.length > 0;
    const normalized = normalizeQuery(query);
    const commonQueries = ['hi', 'hello', 'hey', 'how are you', 'good morning', 'i have a question', 'what can you help with', 'help', 'i am struggling', "i'm struggling"];
    if (commonQueries.includes(normalized)) {
      cacheResponse(normalized, assistantMessage, language).catch(err => {
        console.warn('[Agent] Failed to cache response:', err);
      });
    }

    return {
      response: assistantMessage,
      sources: sources.length > 0 ? sources : undefined,
      usedRAG: usedRAGFlag,
    };
    } catch (err) {
      // Extract the actual error message (stream rejects with string, invoke/timeout throw Error)
      let errorMessage = 'Failed to generate response';
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err instanceof Error) {
        errorMessage = err.message;
        // Remove duplicate "Failed to process query:" prefix if present
        if (errorMessage.includes('Failed to process query:')) {
          errorMessage = errorMessage.replace('Failed to process query:', '').trim();
        }
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.isFirstMessage = true;
  }

  /**
   * Reset KB readiness cache (call this when KB is updated)
   */
  resetKBCache(): void {
    this.kbReadyCache = null;
  }

  /**
   * Get conversation history
   */
  getHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return [...this.conversationHistory];
  }

  /**
   * Build smart context with dynamic allocation based on score
   * - Higher score = more characters allowed
   * - Preserve sentence boundaries
   * - Total context capped at maxLength
   * - Prioritize user KB results (60% allocation)
   */
  private buildSmartContext(results: Array<{ text: string; score: number; id: string }>, maxLength: number): string {
    let context = '\n\nRelevant information:\n';
    let remaining = maxLength - context.length;
    
    // Separate user KB and global KB results
    const userResults = results.filter(r => r.id.startsWith('entry_'));
    const globalResults = results.filter(r => !r.id.startsWith('entry_'));
    
    // Allocate 60% to user KB, 40% to global KB
    const userAllocation = Math.floor(remaining * 0.6);
    
    // Process user KB results first (higher priority)
    let userUsed = 0;
    for (const result of userResults) {
      if (userUsed >= userAllocation || remaining <= 0) break;
      
      // Allocate based on score
      const allocation = result.score > 0.7 ? 250 : 
                        result.score > 0.5 ? 150 : 100;
      const allowed = Math.min(allocation, remaining, userAllocation - userUsed);
      
      if (allowed < 50) break; // Too little space, skip
      
      // Truncate at sentence boundary
      const truncated = this.truncateAtSentence(result.text, allowed);
      context += `${truncated}\n`;
      remaining -= truncated.length + 2; // +2 for newline
      userUsed += truncated.length + 2;
    }
    
    // Process global KB results
    for (const result of globalResults) {
      if (remaining <= 0) break;
      
      // Allocate based on score
      const allocation = result.score > 0.7 ? 200 : 
                        result.score > 0.5 ? 120 : 80;
      const allowed = Math.min(allocation, remaining);
      
      if (allowed < 50) break; // Too little space, skip
      
      // Truncate at sentence boundary
      const truncated = this.truncateAtSentence(result.text, allowed);
      context += `${truncated}\n`;
      remaining -= truncated.length + 2; // +2 for newline
    }
    
    return context;
  }

  /**
   * Truncate text at sentence boundary, preserving important information
   */
  private truncateAtSentence(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    // Try to find sentence boundaries
    const sentenceEndings = /[.!?]\s+/g;
    const matches = [...text.matchAll(sentenceEndings)];
    
    // Find the last complete sentence that fits
    for (let i = matches.length - 1; i >= 0; i--) {
      const endPos = matches[i].index! + matches[i][0].length;
      if (endPos <= maxLength) {
        return text.substring(0, endPos).trim();
      }
    }
    
    // If no sentence boundary found, truncate at word boundary
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }
}
