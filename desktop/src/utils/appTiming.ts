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
