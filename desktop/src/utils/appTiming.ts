/**
 * Time-based logging for app/screen state transitions.
 * Logs to console with elapsed ms since app load and duration in previous state.
 */

const startTime = Date.now();
let lastView: string | null = null;
let lastViewEnteredAt = 0;

function getElapsedMs(): number {
  return Math.round(Date.now() - startTime);
}

/**
 * Log a generic timing event (elapsed ms since app load).
 */
export function logAppTiming(label: string): void {
  const elapsed = getElapsedMs();
  console.debug(`[AppTiming +${elapsed}ms] ${label}`);
}

/**
 * Log entering a screen state. Logs elapsed time and time spent in the previous state.
 */
export function logViewEntered(viewName: string): void {
  const now = Date.now();
  const elapsed = Math.round(now - startTime);
  const durationInPrevious =
    lastView !== null ? Math.round(now - lastViewEnteredAt) : null;

  if (durationInPrevious !== null) {
    console.debug(
      `[AppTiming +${elapsed}ms] view: ${viewName} (left "${lastView}" after ${durationInPrevious}ms)`
    );
  } else {
    console.debug(`[AppTiming +${elapsed}ms] view: ${viewName}`);
  }

  lastView = viewName;
  lastViewEnteredAt = now;
}

/**
 * Log when the user-selection screen is revealed (overlay removed).
 * Blank duration = time from "view: user-selection" until this log.
 */
export function logUserSelectionRevealed(source: 'onReady' | 'fallback'): void {
  const now = Date.now();
  const elapsed = Math.round(now - startTime);
  const blankDuration =
    lastView === 'user-selection'
      ? Math.round(now - lastViewEnteredAt)
      : null;
  const blankStr =
    blankDuration !== null ? ` (blank/overlay duration: ${blankDuration}ms)` : '';
  console.debug(
    `[AppTiming +${elapsed}ms] user-selection revealed (${source})${blankStr}`
  );
}

/**
 * Log when the chat screen is revealed (overlay removed).
 * Blank duration = time from "view: chat" until this log.
 */
export function logChatRevealed(source: 'onReady' | 'fallback'): void {
  const now = Date.now();
  const elapsed = Math.round(now - startTime);
  const blankDuration =
    lastView === 'chat' ? Math.round(now - lastViewEnteredAt) : null;
  const blankStr =
    blankDuration !== null ? ` (blank/overlay duration: ${blankDuration}ms)` : '';
  console.debug(
    `[AppTiming +${elapsed}ms] chat revealed (${source})${blankStr}`
  );
}

/**
 * Log LLM response generation duration (invoke('generate_text') round-trip).
 */
export function logLLMGeneration(durationMs: number, charsGenerated?: number): void {
  const elapsed = getElapsedMs();
  const charsStr = charsGenerated !== undefined ? `, ${charsGenerated} chars` : '';
  console.debug(
    `[AppTiming +${elapsed}ms] LLM generate_text: ${durationMs}ms${charsStr}`
  );
}

/**
 * Log LLM stream stats: time to first token and throughput (chars/sec).
 */
export function logLLMStreamStats(
  timeToFirstTokenMs: number,
  totalDurationMs: number,
  charsGenerated: number
): void {
  const elapsed = getElapsedMs();
  const charsPerSec =
    totalDurationMs > 0 ? (charsGenerated / (totalDurationMs / 1000)).toFixed(1) : '—';
  console.debug(
    `[AppTiming +${elapsed}ms] LLM stream: time-to-first-token ${timeToFirstTokenMs}ms, total ${totalDurationMs}ms, ${charsGenerated} chars, ${charsPerSec} chars/s`
  );
}
