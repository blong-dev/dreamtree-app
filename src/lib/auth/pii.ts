/**
 * PII Encryption Helpers
 *
 * Server-side encryption for sensitive user data.
 * Uses the data key stored in the session.
 */

import type { D1Database } from '@cloudflare/workers-types';
import {
  encryptField,
  decryptField,
  isEncrypted,
  deriveWrappingKey,
  unwrapDataKey,
  decodeSalt,
} from './encryption';

/**
 * Get the data key from a session.
 * Returns null if session doesn't have a data key.
 */
export async function getDataKeyFromSession(
  db: D1Database,
  sessionId: string
): Promise<CryptoKey | null> {
  const session = await db
    .prepare('SELECT data_key FROM sessions WHERE id = ?')
    .bind(sessionId)
    .first();

  if (!session?.data_key) { // code_id:425
    return null;
  }

  // Decode the stored raw key bytes
  const keyBytes = Uint8Array.from(atob(session.data_key as string), c =>
    c.charCodeAt(0)
  );

  // Import as CryptoKey
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Store the data key in a session.
 * Called during login/signup after unwrapping the key.
 */
export async function storeDataKeyInSession(
  db: D1Database,
  sessionId: string,
  dataKey: CryptoKey
): Promise<void> { // code_id:426
  // Export the key to raw bytes
  const keyBytes = await crypto.subtle.exportKey('raw', dataKey);
  const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(keyBytes)));

  await db
    .prepare('UPDATE sessions SET data_key = ? WHERE id = ?')
    .bind(keyBase64, sessionId)
    .run();
}

/**
 * Get the data key from auth record using password.
 * Used during login to unwrap the stored data key.
 */
export async function unwrapDataKeyFromAuth(
  db: D1Database,
  userId: string,
  password: string
): Promise<CryptoKey | null> {
  const auth = await db
    .prepare('SELECT wrapped_data_key FROM auth WHERE user_id = ?')
    .bind(userId)
    .first();

  if (!auth?.wrapped_data_key) { // code_id:427
    return null;
  }

  const storedKey = auth.wrapped_data_key as string;
  const [saltBase64, wrappedDataKey] = storedKey.split(':');

  if (!saltBase64 || !wrappedDataKey) {
    return null;
  }

  const salt = decodeSalt(saltBase64);
  const wrappingKey = await deriveWrappingKey(password, salt);
  return unwrapDataKey(wrappedDataKey, wrappingKey);
}

/**
 * Encrypt a PII field using the session's data key.
 * Returns the encrypted JSON string or original value if no key available.
 */
export async function encryptPII(
  db: D1Database,
  sessionId: string,
  plaintext: string | null
): Promise<string | null> {
  if (!plaintext) return null;

  const dataKey = await getDataKeyFromSession(db, sessionId);
  if (!dataKey) { // code_id:428
    // No data key - return plaintext (graceful degradation)
    console.warn('No data key in session, storing plaintext');
    return plaintext;
  }

  return encryptField(plaintext, dataKey);
}

/**
 * Decrypt a PII field using the session's data key.
 * Returns the plaintext or original value if not encrypted/no key.
 */
export async function decryptPII(
  db: D1Database,
  sessionId: string,
  encryptedOrPlain: string | null
): Promise<string | null> {
  if (!encryptedOrPlain) return null;

  // Check if it's actually encrypted
  if (!isEncrypted(encryptedOrPlain)) { // code_id:429
    return encryptedOrPlain; // Return as-is (legacy plaintext)
  }

  const dataKey = await getDataKeyFromSession(db, sessionId);
  if (!dataKey) {
    // No data key - can't decrypt
    console.warn('No data key in session, cannot decrypt');
    return '[encrypted]';
  }

  return decryptField(encryptedOrPlain, dataKey);
}

/**
 * Batch decrypt multiple PII fields.
 */
export async function decryptPIIBatch(
  db: D1Database,
  sessionId: string,
  fields: Record<string, string | null>
): Promise<Record<string, string | null>> {
  const dataKey = await getDataKeyFromSession(db, sessionId);
  const result: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(fields)) { // code_id:430
    if (!value) {
      result[key] = null;
      continue;
    }

    if (!isEncrypted(value)) {
      result[key] = value;
      continue;
    }

    if (!dataKey) {
      result[key] = '[encrypted]';
      continue;
    }

    try {
      result[key] = await decryptField(value, dataKey);
    } catch (error) {
      console.error(`Failed to decrypt field ${key}:`, error);
      result[key] = '[decryption failed]';
    }
  }

  return result;
}

/**
 * PII fields that should be encrypted.
 * Used for validation and migration.
 */
export const PII_FIELDS = {
  user_profile: ['display_name'],
  user_budget: [
    'monthly_expenses',
    'annual_needs',
    'hourly_batna',
    'notes',
  ],
  user_contacts: [
    'name',
    'title',
    'company',
    'linkedin_url',
    'email',
    'phone',
    'notes',
  ],
  // Module 1.4 responses are identified by prompt_id, handled separately
} as const;
