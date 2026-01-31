/**
 * DreamTree Session Management
 *
 * Handles anonymous and claimed user sessions.
 */

import { nanoid } from 'nanoid';
import type { D1Database } from '@cloudflare/workers-types';
import type { User, Session, UserSettings, AnimationSpeed } from '@/types/database';

const SESSION_COOKIE_NAME = 'dt_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

export interface SessionData {
  user: User;
  session: Session;
  settings: UserSettings;
}

/**
 * Create a new anonymous user with session
 */
export async function createAnonymousSession(db: D1Database): Promise<SessionData> { // code_id:434
  const userId = nanoid();
  const sessionId = nanoid();
  const now = new Date().toISOString();

  // Create user
  await db
    .prepare(
      `INSERT INTO users (id, is_anonymous, workbook_complete, created_at, updated_at)
       VALUES (?, 1, 0, ?, ?)`
    )
    .bind(userId, now, now)
    .run();

  // Create session
  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, created_at, last_seen_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(sessionId, userId, now, now)
    .run();

  // Create default settings
  await db
    .prepare(
      `INSERT INTO user_settings (user_id, background_color, text_color, font, text_size, created_at, updated_at)
       VALUES (?, 'ivory', 'charcoal', 'inter', 1.0, ?, ?)`
    )
    .bind(userId, now, now)
    .run();

  // Create user_profile row
  await db
    .prepare(
      `INSERT INTO user_profile (user_id, created_at, updated_at)
       VALUES (?, ?, ?)`
    )
    .bind(userId, now, now)
    .run();

  // Create user_values row
  await db
    .prepare(
      `INSERT INTO user_values (user_id, created_at, updated_at)
       VALUES (?, ?, ?)`
    )
    .bind(userId, now, now)
    .run();

  return {
    user: {
      id: userId,
      is_anonymous: 1,
      workbook_complete: 0,
      user_role: 'user', // Default role for new users
      marketing_consent: 0,
      consent_given_at: null,
      created_at: now,
      updated_at: now,
    },
    session: {
      id: sessionId,
      user_id: userId,
      created_at: now,
      last_seen_at: now,
    },
    settings: {
      user_id: userId,
      background_color: 'ivory',
      text_color: 'charcoal',
      font: 'inter',
      text_size: 1.0,
      animation_speed: 'normal',
      personality_type: null,
      created_at: now,
      updated_at: now,
    },
  };
}

// Debounce threshold for last_seen_at updates (5 minutes)
const LAST_SEEN_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Debounced update of session last_seen_at.
 * Only writes if more than 5 minutes stale.
 * Fire-and-forget to avoid blocking the response.
 */
function maybeUpdateLastSeen(
  db: D1Database,
  sessionId: string,
  lastSeenAt: string
): void {
  const lastSeenTime = new Date(lastSeenAt).getTime();
  const now = Date.now();

  // Only update if more than 5 minutes stale
  if (now - lastSeenTime < LAST_SEEN_THRESHOLD_MS) {
    return; // Skip the write entirely
  }

  // Fire-and-forget - don't await, don't block the response
  db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), sessionId)
    .run()
    .catch(() => {}); // Silent fail - not critical
}

// Row type for the joined session query
interface JoinedSessionRow {
  // Session fields
  session_id: string;
  user_id: string;
  session_created: string;
  last_seen_at: string;
  data_key: string | null;
  // User fields
  is_anonymous: number;
  workbook_complete: number;
  user_role: string;
  marketing_consent: number;
  consent_given_at: string | null;
  user_created: string;
  user_updated: string;
  // Settings fields
  background_color: string;
  text_color: string;
  font: string;
  text_size: number;
  animation_speed: string | null;
  personality_type: string | null;
  settings_created: string;
  settings_updated: string;
}

/**
 * Get session data from session ID
 *
 * OPTIMIZED: Uses single JOIN query instead of 3 separate queries.
 * last_seen_at is debounced (only updates if >5 min stale) to avoid
 * write lock contention under load.
 */
export async function getSessionData(
  db: D1Database,
  sessionId: string
): Promise<SessionData | null> {
  // ONE query instead of three
  const result = await db
    .prepare(`
      SELECT
        s.id as session_id, s.user_id, s.created_at as session_created,
        s.last_seen_at, s.data_key,
        u.is_anonymous, u.workbook_complete, u.user_role,
        u.marketing_consent, u.consent_given_at,
        u.created_at as user_created, u.updated_at as user_updated,
        us.background_color, us.text_color, us.font, us.text_size,
        us.animation_speed, us.personality_type, us.created_at as settings_created,
        us.updated_at as settings_updated
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      JOIN user_settings us ON u.id = us.user_id
      WHERE s.id = ?
    `)
    .bind(sessionId)
    .first<JoinedSessionRow>();

  if (!result) return null;

  // Debounced last_seen_at update (fire-and-forget)
  maybeUpdateLastSeen(db, sessionId, result.last_seen_at);

  // Reconstruct the SessionData shape from joined row
  return {
    session: {
      id: result.session_id,
      user_id: result.user_id,
      created_at: result.session_created,
      last_seen_at: result.last_seen_at,
      data_key: result.data_key,
    },
    user: {
      id: result.user_id,
      is_anonymous: result.is_anonymous,
      workbook_complete: result.workbook_complete,
      user_role: result.user_role as User['user_role'],
      marketing_consent: result.marketing_consent,
      consent_given_at: result.consent_given_at,
      created_at: result.user_created,
      updated_at: result.user_updated,
    },
    settings: {
      user_id: result.user_id,
      background_color: result.background_color,
      text_color: result.text_color,
      font: result.font,
      text_size: result.text_size,
      animation_speed: (result.animation_speed || 'normal') as AnimationSpeed,
      personality_type: result.personality_type,
      created_at: result.settings_created,
      updated_at: result.settings_updated,
    },
  };
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(db: D1Database, sessionId: string): Promise<void> { // code_id:436
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

/**
 * Create session cookie header
 */
export function createSessionCookie(sessionId: string): string { // code_id:437
  return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}; Secure`;
}

/**
 * Clear session cookie header
 */
export function clearSessionCookie(): string { // code_id:438
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}

/**
 * Parse session ID from cookie header
 */
export function getSessionIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => { // code_id:439
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  return cookies[SESSION_COOKIE_NAME] || null;
}
