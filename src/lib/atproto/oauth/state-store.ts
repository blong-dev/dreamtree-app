/**
 * D1-backed OAuth state storage
 *
 * Stores OAuth state and PKCE verifiers in D1 for the OAuth flow.
 * State expires after 10 minutes.
 */

import type { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';
import type { OAuthState } from '../types';

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Create a new OAuth state entry
 */
export async function createOAuthState(
  db: D1Database,
  userId: string,
  handle: string,
  codeVerifier: string
): Promise<string> { // code_id:889
  const id = nanoid();
  const state = nanoid(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STATE_EXPIRY_MS);

  await db
    .prepare(
      `INSERT INTO oauth_state (id, state, code_verifier, handle, user_id, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      state,
      codeVerifier,
      handle,
      userId,
      now.toISOString(),
      expiresAt.toISOString()
    )
    .run();

  return state;
}

/**
 * Validate and consume an OAuth state
 * Returns the state data if valid, null if invalid/expired
 */
export async function consumeOAuthState(
  db: D1Database,
  state: string
): Promise<OAuthState | null> {
  const row = await db
    .prepare(
      `SELECT id, state, code_verifier as codeVerifier, handle, user_id as userId,
              created_at as createdAt, expires_at as expiresAt
       FROM oauth_state
       WHERE state = ?`
    )
    .bind(state)
    .first<OAuthState>();

  if (!row) { // code_id:890
    return null;
  }

  // Check expiry
  if (new Date(row.expiresAt) < new Date()) {
    // Clean up expired state
    await db.prepare('DELETE FROM oauth_state WHERE id = ?').bind(row.id).run();
    return null;
  }

  // Delete the state (one-time use)
  await db.prepare('DELETE FROM oauth_state WHERE id = ?').bind(row.id).run();

  return row;
}

/**
 * Clean up expired OAuth states (called periodically)
 */
export async function cleanupExpiredStates(db: D1Database): Promise<number> { // code_id:891
  const result = await db
    .prepare('DELETE FROM oauth_state WHERE expires_at < ?')
    .bind(new Date().toISOString())
    .run();

  return (result as { changes?: number }).changes || 0;
}
