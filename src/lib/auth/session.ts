/**
 * DreamTree Session Management
 *
 * Handles anonymous and claimed user sessions.
 */

import { nanoid } from 'nanoid';
import type { D1Database } from '@cloudflare/workers-types';
import type { User, Session, UserSettings } from '@/types/database';

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
      `INSERT INTO user_settings (user_id, background_color, text_color, font, created_at, updated_at)
       VALUES (?, 'ivory', 'charcoal', 'inter', ?, ?)`
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
      personality_type: null,
      created_at: now,
      updated_at: now,
    },
  };
}

/**
 * Get session data from session ID
 */
export async function getSessionData(
  db: D1Database,
  sessionId: string
): Promise<SessionData | null> {
  // Get session
  const session = await db
    .prepare('SELECT * FROM sessions WHERE id = ?')
    .bind(sessionId)
    .first<Session>();

  if (!session) return null;

  // Get user
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(session.user_id)
    .first<User>();

  if (!user) return null;

  // Get settings
  const settings = await db
    .prepare('SELECT * FROM user_settings WHERE user_id = ?')
    .bind(user.id)
    .first<UserSettings>();

  if (!settings) return null;

  // Update last_seen_at
  await db
    .prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), sessionId)
    .run();

  return { user, session, settings };
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
