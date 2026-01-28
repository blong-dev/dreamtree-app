/**
 * Client-side Analytics Tracker
 *
 * Fire-and-forget tracking that never breaks the app.
 * Skip in development, silent fail in production.
 */

import type {
  AnalyticsEventType,
  AnalyticsTargetType,
  EventData,
} from './types';

interface TrackOptions {
  targetType?: AnalyticsTargetType;
  targetId?: string;
  data?: EventData;
}

/**
 * Track an analytics event from the client.
 *
 * @example
 * track('exercise_start', { targetType: 'exercise', targetId: '1.2.3' });
 * track('tool_submit', { targetType: 'tool', targetId: '100001', data: { items_count: 5 } });
 */
export async function track(
  eventType: AnalyticsEventType,
  options?: TrackOptions
): Promise<void> { // code_id:398
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[Analytics]', eventType, options);
    return;
  }

  // Fire and forget - never block the UI
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        ...options,
      }),
      keepalive: true, // Survives page unload
    });
  } catch {
    // Silent fail - analytics should never break the app
  }
}

/**
 * Helper: Track page view
 */
export function trackPageView(pathname: string): void { // code_id:399
  track('page_view', {
    targetType: 'page',
    targetId: pathname,
    data: { pathname },
  });
}

/**
 * Helper: Track exercise start
 */
export function trackExerciseStart(exerciseId: string): void { // code_id:400
  track('exercise_start', {
    targetType: 'exercise',
    targetId: exerciseId,
  });
}

/**
 * Helper: Track exercise complete
 */
export function trackExerciseComplete(
  exerciseId: string,
  durationMs: number,
  promptsAnswered: number
): void { // code_id:401
  track('exercise_complete', {
    targetType: 'exercise',
    targetId: exerciseId,
    data: {
      duration_ms: durationMs,
      prompts_answered: promptsAnswered,
    },
  });
}

/**
 * Helper: Track tool open
 */
export function trackToolOpen(toolId: string): void { // code_id:402
  track('tool_open', {
    targetType: 'tool',
    targetId: toolId,
  });
}

/**
 * Helper: Track tool submit
 */
export function trackToolSubmit(toolId: string, itemsCount?: number): void { // code_id:403
  track('tool_submit', {
    targetType: 'tool',
    targetId: toolId,
    data: itemsCount !== undefined ? { items_count: itemsCount } : undefined,
  });
}

/**
 * Helper: Track prompt submit (NO CONTENT)
 */
export function trackPromptSubmit(promptId: string): void { // code_id:404
  track('prompt_submit', {
    targetType: 'prompt',
    targetId: promptId,
  });
}

/**
 * Helper: Track error
 */
export function trackError(endpoint: string, status: number): void { // code_id:405
  track('error', {
    targetType: 'api',
    targetId: endpoint,
    data: {
      error_endpoint: endpoint,
      error_status: status,
    },
  });
}
