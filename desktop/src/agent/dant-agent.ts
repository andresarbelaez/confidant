/**
 * Dant Agent - Main agent orchestrator
 * Combines LLM and RAG for health consultation
 */

import { invoke } from '@tauri-apps/api/core';
import { getCachedResponse, cacheResponse, normalizeQuery, initializeCache } from '../utils/response-cache';
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
  followUpMessages?: string[];
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
   * Process a user query with optional RAG
   */
  async processQuery(
    query: string,
    options: { stream?: boolean; useRAG?: boolean; userId?: string; language?: LanguageCode } = {}
  ): Promise<AgentResponse> {
    const startMs = performance.now();
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
      const cacheMs = Math.round(performance.now() - startMs);
      const wasFirstMessage = this.isFirstMessage;
      console.log(`[Confidant] Cache hit: ${cacheMs}ms (query: "${normalizedQuery}")`);
      
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

    // For first message, use hardcoded messages instead of generating
    // This is more reliable than trying to get the LLM to generate with separators
    if (this.isFirstMessage) {
      // Import i18n for first message
      const i18n = await import('../i18n');
      
      // Ensure i18n is initialized: user language when userId present, else app language
      await i18n.initializeI18n(options.userId ?? null);
      
      // Use i18n for first messages
      const hardcodedMessages = [
        i18n.t('agent.welcome'),
        i18n.t('agent.privacy'),
        i18n.t('agent.disclaimer'),
        i18n.t('agent.askAnything')
      ];
      
      this.isFirstMessage = false;
      this.conversationHistory.push({ role: 'user', content: query });
      const firstMsgMs = Math.round(performance.now() - startMs);
      console.log(`[Confidant] Agent response: ${firstMsgMs}ms (initial greeting, no RAG)`);
      return {
        response: hardcodedMessages[0],
        sources: undefined,
        usedRAG: false,
        isFirstMessage: true,
        followUpMessages: hardcodedMessages.slice(1)
      };
    }

    // For subsequent messages, use normal LLM generation
    // Use a clear prompt format that encourages direct, concise responses
    const languageName = LANGUAGE_DISPLAY_NAMES[language] ?? 'English';
    const languageInstruction = ` Always respond in ${languageName}. The user's preferred language is ${languageName}.`;
    const systemContext = `You are Confidant, a helpful AI assistant for health questions. Be concise, friendly, and accurate. Keep responses brief (2-3 sentences when possible). Remember: you're not a substitute for professional medical advice. Respond directly to the user's question without generating example conversations or meta-dialogue.${languageInstruction}`;

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

    // Generate response using LLM
    try {
      const response = await invoke<{ text: string; finish_reason?: string }>('generate_text', {
        prompt: fullPrompt,
        config: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 256  // Reduced from 512 for faster responses
        }
      });

      let assistantMessage = response.text.trim();
      
      // Clean up any remaining format artifacts
      // Remove any "User:" or "Assistant:" labels (case-insensitive) that might appear
      assistantMessage = assistantMessage
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          const lowerTrimmed = trimmed.toLowerCase();
          return !lowerTrimmed.startsWith('user:') && !lowerTrimmed.startsWith('assistant:');
        })
        .join('\n')
        .trim();
      
      // If the message still contains "User:" or "Assistant:" patterns (case-insensitive), clean them up
      const lowerMessage = assistantMessage.toLowerCase();
      if (lowerMessage.includes('user:') || lowerMessage.includes('assistant:')) {
        // Try to extract content before any "User:" label appears (case-insensitive)
        const userIndex = Math.min(
          lowerMessage.indexOf('user:'),
          lowerMessage.indexOf('\nuser:'),
          lowerMessage.indexOf(' user:')
        );
        if (userIndex > 0 && userIndex !== -1) {
          assistantMessage = assistantMessage.substring(0, userIndex).trim();
        }
        // Remove any "Assistant:" labels (case-insensitive) and keep the content
        assistantMessage = assistantMessage
          .replace(/^Assistant:\s*/gmi, '')
          .replace(/\nAssistant:\s*/gmi, '\n')
          .replace(/\s+Assistant:\s*/gmi, ' ')
          .trim();
      }
      
      // Final cleanup: remove any trailing "assistant:" or "Assistant:" text
      assistantMessage = assistantMessage.replace(/\s+[Aa]ssistant:\s*.*$/g, '').trim();
      
      // Add to conversation history
      this.conversationHistory.push({ role: 'assistant', content: assistantMessage });

      // Trim history if too long
      if (this.conversationHistory.length > this.maxHistoryLength * 2) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
      }

      const responseMs = Math.round(performance.now() - startMs);
      const usedRAGFlag = useRAG && sources.length > 0;
      console.log(`[Confidant] Agent response: ${responseMs}ms (RAG: ${usedRAGFlag})`);
      
      // Cache the response for common queries
      const normalized = normalizeQuery(query);
      const commonQueries = ['hi', 'hello', 'hey', 'what are you', 'who are you', 'what can you do', 'help'];
      if (commonQueries.includes(normalized)) {
        cacheResponse(normalized, assistantMessage, language).catch(err => {
          console.warn('[Agent] Failed to cache response:', err);
        });
      }
      
      return {
        response: assistantMessage,
        sources: sources.length > 0 ? sources : undefined,
        usedRAG: usedRAGFlag
      };
    } catch (err) {
      const errorMs = Math.round(performance.now() - startMs);
      console.log(`[Confidant] Agent error after ${errorMs}ms`);
      // Extract the actual error message
      let errorMessage = 'Failed to generate response';
      if (err instanceof Error) {
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
    const globalAllocation = remaining - userAllocation;
    
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
