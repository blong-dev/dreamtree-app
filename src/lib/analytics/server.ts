/**
 * Server-side Analytics Tracker
 *
 * For use in API routes and server components.
 * Writes directly to D1 database.
 */

import { nanoid } from 'nanoid';
import type { D1Database } from '@cloudflare/workers-types';
import type {
  AnalyticsEventType,
  AnalyticsTargetType,
  EventData,
  AnalyticsEvent,
} from './types';
import { validateEventData } from './types';

interface TrackServerOptions {
  userId?: string;
  sessionId?: string;
  targetType?: AnalyticsTargetType;
  targetId?: string;
  data?: EventData;
}

/**
 * Track an analytics event on the server.
 *
 * @returns The event ID if successful
 * @throws Error if event data validation fails
 */
export async function trackServer(
  db: D1Database,
  eventType: AnalyticsEventType,
  options: TrackServerOptions = {}
): Promise<string> { // code_id:391
  // Validate event data (privacy enforcement)
  if (options.data && !validateEventData(options.data)) {
    throw new Error('Invalid event data: contains disallowed keys');
  }

  const eventId = nanoid();
  const now = new Date().toISOString();

  await db
    .prepare(
      `
    INSERT INTO analytics_events
    (id, user_id, session_id, event_type, target_type, target_id, event_data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .bind(
      eventId,
      options.userId || null,
      options.sessionId || null,
      eventType,
      options.targetType || null,
      options.targetId || null,
      options.data ? JSON.stringify(options.data) : null,
      now
    )
    .run();

  return eventId;
}

/**
 * Query analytics events with filters.
 */
export async function queryEvents(
  db: D1Database,
  filters: {
    userId?: string;
    sessionId?: string;
    eventType?: AnalyticsEventType;
    targetType?: AnalyticsTargetType;
    targetId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<AnalyticsEvent[]> { // code_id:392
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.userId) {
    conditions.push('user_id = ?');
    params.push(filters.userId);
  }
  if (filters.sessionId) {
    conditions.push('session_id = ?');
    params.push(filters.sessionId);
  }
  if (filters.eventType) {
    conditions.push('event_type = ?');
    params.push(filters.eventType);
  }
  if (filters.targetType) {
    conditions.push('target_type = ?');
    params.push(filters.targetType);
  }
  if (filters.targetId) {
    conditions.push('target_id = ?');
    params.push(filters.targetId);
  }
  if (filters.startDate) {
    conditions.push('created_at >= ?');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push('created_at <= ?');
    params.push(filters.endDate);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 1000;
  const offset = filters.offset || 0;

  const result = await db
    .prepare(
      `
    SELECT * FROM analytics_events
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `
    )
    .bind(...params, limit, offset)
    .all();

  return (result.results || []) as unknown as AnalyticsEvent[];
}

/**
 * Count events by type within a date range.
 */
export async function countEventsByType(
  db: D1Database,
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const result = await db
    .prepare(
      `
    SELECT event_type, COUNT(*) as count
    FROM analytics_events
    WHERE created_at >= ? AND created_at <= ?
    GROUP BY event_type
  `
    )
    .bind(startDate, endDate)
    .all();

  const counts: Record<string, number> = {};
  for (const row of result.results || []) { // code_id:393
    const r = row as { event_type: string; count: number };
    counts[r.event_type] = r.count;
  }
  return counts;
}

/**
 * Get unique user count (DAU/WAU/MAU).
 */
export async function countUniqueUsers(
  db: D1Database,
  startDate: string,
  endDate: string
): Promise<number> { // code_id:394
  const result = await db
    .prepare(
      `
    SELECT COUNT(DISTINCT user_id) as count
    FROM analytics_events
    WHERE created_at >= ? AND created_at <= ?
    AND user_id IS NOT NULL
  `
    )
    .bind(startDate, endDate)
    .first();

  return (result?.count as number) || 0;
}

/**
 * Get exercise completion funnel data.
 */
export async function getExerciseFunnel(
  db: D1Database,
  startDate: string,
  endDate: string
): Promise<
  Array<{
    exercise_id: string;
    starts: number;
    completions: number;
  }>
> {
  const result = await db
    .prepare(
      `
    SELECT
      target_id as exercise_id,
      SUM(CASE WHEN event_type = 'exercise_start' THEN 1 ELSE 0 END) as starts,
      SUM(CASE WHEN event_type = 'exercise_complete' THEN 1 ELSE 0 END) as completions
    FROM analytics_events
    WHERE target_type = 'exercise'
    AND created_at >= ? AND created_at <= ?
    GROUP BY target_id
    ORDER BY target_id
  `
    )
    .bind(startDate, endDate)
    .all();

  return (result.results || []) as Array<{
    exercise_id: string;
    starts: number;
    completions: number;
  }>;
}

/**
 * Get tool usage stats.
 */
export async function getToolUsage(
  db: D1Database,
  startDate: string,
  endDate: string
): Promise<
  Array<{
    tool_id: string;
    opens: number;
    submits: number;
  }>
> {
  const result = await db
    .prepare(
      `
    SELECT
      target_id as tool_id,
      SUM(CASE WHEN event_type = 'tool_open' THEN 1 ELSE 0 END) as opens,
      SUM(CASE WHEN event_type = 'tool_submit' THEN 1 ELSE 0 END) as submits
    FROM analytics_events
    WHERE target_type = 'tool'
    AND created_at >= ? AND created_at <= ?
    GROUP BY target_id
    ORDER BY submits DESC
  `
    )
    .bind(startDate, endDate)
    .all();

  return (result.results || []) as Array<{
    tool_id: string;
    opens: number;
    submits: number;
  }>;
}

/**
 * Delete events older than retention period (90 days default).
 * Call from cron job.
 */
export async function purgeOldEvents(
  db: D1Database,
  retentionDays: number = 90
): Promise<number> { // code_id:397
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffIso = cutoffDate.toISOString();

  const result = await db
    .prepare(
      `
    DELETE FROM analytics_events
    WHERE created_at < ?
  `
    )
    .bind(cutoffIso)
    .run();

  return result.meta?.changes || 0;
}
