/**
 * Analytics Module
 *
 * Privacy-first analytics for DreamTree.
 * Tracks user behavior without capturing content.
 */

// Types
export type {
  AnalyticsEventType,
  AnalyticsTargetType,
  EventData,
  TrackRequest,
  TrackResponse,
  AnalyticsEvent,
  AnalyticsAggregate,
  AllowedEventDataKey,
} from './types';

export { ALLOWED_EVENT_DATA_KEYS, validateEventData } from './types';

// Client-side tracking
export {
  track,
  trackPageView,
  trackExerciseStart,
  trackExerciseComplete,
  trackToolOpen,
  trackToolSubmit,
  trackPromptSubmit,
  trackError,
} from './track';

// Server-side tracking (re-export for convenience, but typically import from './server')
export {
  trackServer,
  queryEvents,
  countEventsByType,
  countUniqueUsers,
  getExerciseFunnel,
  getToolUsage,
  purgeOldEvents,
} from './server';
