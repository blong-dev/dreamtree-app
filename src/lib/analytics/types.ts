/**
 * Analytics Types
 *
 * Controlled vocabulary for event tracking.
 * Privacy-first design: NO content, only metadata.
 */

// Event types - controlled vocabulary
export type AnalyticsEventType =
  | 'session_start'
  | 'page_view'
  | 'exercise_start'
  | 'exercise_complete'
  | 'prompt_view'
  | 'prompt_submit'
  | 'tool_open'
  | 'tool_submit'
  | 'error';

// Target types for events
export type AnalyticsTargetType =
  | 'exercise'
  | 'prompt'
  | 'tool'
  | 'page'
  | 'api';

// Allowed event data keys (privacy enforcement)
export const ALLOWED_EVENT_DATA_KEYS = [
  'duration_ms',
  'items_count',
  'prompts_answered',
  'scroll_depth',
  'error_status',
  'error_endpoint',
  'device_type',
  'pathname',
] as const;

export type AllowedEventDataKey = typeof ALLOWED_EVENT_DATA_KEYS[number];

// Event data interface (metadata only, NO content)
export interface EventData {
  duration_ms?: number;
  items_count?: number;
  prompts_answered?: number;
  scroll_depth?: number;
  error_status?: number;
  error_endpoint?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  pathname?: string;
}

// Track request interface
export interface TrackRequest {
  eventType: AnalyticsEventType;
  targetType?: AnalyticsTargetType;
  targetId?: string;
  data?: EventData;
}

// Track response interface
export interface TrackResponse {
  success: boolean;
  eventId?: string;
  error?: string;
}

// Analytics event record (database row)
export interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  session_id: string | null;
  event_type: AnalyticsEventType;
  target_type: AnalyticsTargetType | null;
  target_id: string | null;
  event_data: string | null; // JSON string
  created_at: string;
}

// Analytics aggregate record (database row)
export interface AnalyticsAggregate {
  id: string;
  metric_name: string;
  dimension: string | null;
  dimension_value: string | null;
  metric_value: number;
  period_start: string;
  period_end: string;
  computed_at: string;
}

/**
 * Validates that event data only contains allowed keys.
 * Prevents PII from being stored in analytics.
 */
export function validateEventData(data: unknown): data is EventData {
  if (!data) return true;
  if (typeof data !== 'object') return false;

  const keys = Object.keys(data);
  return keys.every(key =>
    (ALLOWED_EVENT_DATA_KEYS as readonly string[]).includes(key)
  );
}
