/**
 * Dant Agent - Main agent orchestrator
 * Combines LLM and RAG for health consultation
 */

import { invoke } from '@tauri-apps/api/core';

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

  /**
   * Process a user query with optional RAG
   */
  async processQuery(
    query: string,
    options: { stream?: boolean; useRAG?: boolean } = {}
  ): Promise<AgentResponse> {
    const useRAG = options.useRAG ?? true;

    // Check if model is loaded
    const isLoaded = await invoke<boolean>('is_model_loaded');
    if (!isLoaded) {
      throw new Error('LLM model not initialized. Please initialize a model first in the Model Manager tab.');
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
          // Generate embedding for optimized query (parallelize if possible)
          const queryEmbedding = await invoke<number[]>('generate_embedding', { text: optimizedQuery });
          
          // Search for similar documents (reduced limit for faster processing)
          const searchResults = await invoke<Array<{
            id: string;
            text: string;
            score: number;
            metadata: any;
          }>>('search_similar', {
            queryEmbedding,
            limit: 2  // Reduced from 3 to 2 for faster RAG processing
          });

          if (searchResults && searchResults.length > 0) {
            // Filter by minimum relevance score to avoid low-quality results
            const minScore = 0.3; // Minimum similarity threshold
            const relevantResults = searchResults.filter(r => r.score >= minScore);
            
            if (relevantResults.length > 0) {
              sources = relevantResults.map(r => ({
                id: r.id,
                text: r.text,
                score: r.score
              }));

              // Build context from search results (truncate long texts for faster processing)
              context = '\n\nRelevant information:\n';
              relevantResults.forEach((result, idx) => {
                // Truncate long texts to max 200 chars per result for faster processing
                const truncatedText = result.text.length > 200 ? result.text.substring(0, 200) + '...' : result.text;
                context += `${idx + 1}. ${truncatedText}\n`;
              });
            }
          }
        }
      } catch (err) {
        console.warn('[Agent] RAG search failed, continuing without context:', err);
        // Continue without RAG if search fails
      }
    }

    // For first message, use hardcoded messages instead of generating
    // This is more reliable than trying to get the LLM to generate with separators
    let isFirst = this.isFirstMessage;
    
    if (this.isFirstMessage) {
      // Hardcode the first messages for reliability
      const hardcodedMessages = [
        "Hi! I'm Confidant, your privacy-first AI assistant for health questions.",
        "Everything I do happens completely offline on your device - your conversations stay private and never leave your computer.",
        "I should mention that I'm not a substitute for professional medical advice. If you have serious health concerns, please consult a qualified healthcare professional.",
        "Feel free to ask me anything about health - I'm here to help with information and support!"
      ];
      
      this.isFirstMessage = false;
      this.conversationHistory.push({ role: 'user', content: query });
      
      // Return hardcoded messages
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
    const systemContext = `You are Confidant, a helpful AI assistant for health questions. Be concise, friendly, and accurate. Keep responses brief (2-3 sentences when possible). Remember: you're not a substitute for professional medical advice. Respond directly to the user's question without generating example conversations or meta-dialogue.`;

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

      return {
        response: assistantMessage,
        sources: sources.length > 0 ? sources : undefined,
        usedRAG: useRAG && sources.length > 0
      };
    } catch (err) {
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
}
