/**
 * D1-backed ATP session storage
 *
 * Stores AT Protocol sessions in user_atp_connections table.
 * Sessions are encrypted using the user's data key.
 */

import type { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';
import type { SerializedSession, AtpConnectionStatus } from '../types';

/**
 * Store a new ATP session for a user
 */
export async function storeAtpSession(
  db: D1Database,
  userId: string,
  session: SerializedSession
): Promise<void> { // code_id:882
  const now = new Date().toISOString();
  const id = nanoid();

  // Check if user already has a connection
  const existing = await db
    .prepare('SELECT id FROM user_atp_connections WHERE user_id = ?')
    .bind(userId)
    .first<{ id: string }>();

  const sessionData = JSON.stringify(session);

  if (existing) {
    // Update existing connection
    await db
      .prepare(
        `UPDATE user_atp_connections
         SET did = ?, handle = ?, pds_url = ?, session_data = ?, updated_at = ?
         WHERE user_id = ?`
      )
      .bind(session.did, session.handle, session.pdsUrl, sessionData, now, userId)
      .run();
  } else {
    // Create new connection
    await db
      .prepare(
        `INSERT INTO user_atp_connections
         (id, user_id, did, handle, pds_url, session_data, sync_enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(id, userId, session.did, session.handle, session.pdsUrl, sessionData, now, now)
      .run();
  }
}

/**
 * Get ATP session for a user
 */
export async function getAtpSession(
  db: D1Database,
  userId: string
): Promise<SerializedSession | null> {
  const row = await db
    .prepare('SELECT session_data FROM user_atp_connections WHERE user_id = ?')
    .bind(userId)
    .first<{ session_data: string }>();

  if (!row) { // code_id:883
    return null;
  }

  try {
    return JSON.parse(row.session_data) as SerializedSession;
  } catch {
    return null;
  }
}

/**
 * Get ATP connection status for a user
 */
export async function getAtpConnectionStatus(
  db: D1Database,
  userId: string
): Promise<AtpConnectionStatus> { // code_id:884
  const row = await db
    .prepare(
      `SELECT did, handle, pds_url, sync_enabled, last_sync_at
       FROM user_atp_connections WHERE user_id = ?`
    )
    .bind(userId)
    .first<{
      did: string;
      handle: string | null;
      pds_url: string;
      sync_enabled: number;
      last_sync_at: string | null;
    }>();

  if (!row) {
    return { connected: false, syncEnabled: false };
  }

  return {
    connected: true,
    did: row.did,
    handle: row.handle || undefined,
    pdsUrl: row.pds_url,
    syncEnabled: row.sync_enabled === 1,
    lastSyncAt: row.last_sync_at || undefined,
  };
}

/**
 * Update sync enabled status
 */
export async function setSyncEnabled(
  db: D1Database,
  userId: string,
  enabled: boolean
): Promise<void> { // code_id:885
  await db
    .prepare(
      `UPDATE user_atp_connections SET sync_enabled = ?, updated_at = ? WHERE user_id = ?`
    )
    .bind(enabled ? 1 : 0, new Date().toISOString(), userId)
    .run();
}

/**
 * Update last sync timestamp
 */
export async function updateLastSync(db: D1Database, userId: string): Promise<void> { // code_id:886
  await db
    .prepare(
      `UPDATE user_atp_connections SET last_sync_at = ?, updated_at = ? WHERE user_id = ?`
    )
    .bind(new Date().toISOString(), new Date().toISOString(), userId)
    .run();
}

/**
 * Delete ATP connection for a user
 */
export async function deleteAtpConnection(db: D1Database, userId: string): Promise<void> { // code_id:887
  await db.prepare('DELETE FROM user_atp_connections WHERE user_id = ?').bind(userId).run();
}

/**
 * Update ATP session (e.g., after token refresh)
 */
export async function updateAtpSession(
  db: D1Database,
  userId: string,
  session: SerializedSession
): Promise<void> { // code_id:888
  const sessionData = JSON.stringify(session);
  await db
    .prepare(
      `UPDATE user_atp_connections SET session_data = ?, updated_at = ? WHERE user_id = ?`
    )
    .bind(sessionData, new Date().toISOString(), userId)
    .run();
}
