/**
 * DreamTree PII Encryption
 *
 * Client-side encryption for sensitive user data.
 * Uses AES-GCM with a key derived from user password.
 *
 * Architecture:
 * 1. Password → PBKDF2 → Wrapping Key
 * 2. Wrapping Key encrypts random Data Key
 * 3. Data Key encrypts PII fields
 *
 * This ensures:
 * - Password change only re-wraps the data key (no re-encryption of PII)
 * - Server never sees plaintext PII
 * - Password recovery loses encrypted data (intentional privacy tradeoff)
 */

// Encryption version for future algorithm rotation
const ENCRYPTION_VERSION = 1;

// PBKDF2 parameters
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-256';

// AES-GCM parameters
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Encrypted field format stored in database
 */
export interface EncryptedField {
  v: number; // version
  iv: string; // base64 IV
  ciphertext: string; // base64 ciphertext
}

/**
 * Derive a wrapping key from password using PBKDF2
 */
export async function deriveWrappingKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> { // code_id:411
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES key from password
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true, // extractable for wrapping
    ['wrapKey', 'unwrapKey']
  );
}

/**
 * Generate a random data key for encrypting PII
 */
export async function generateDataKey(): Promise<CryptoKey> { // code_id:412
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true, // extractable for wrapping
    ['encrypt', 'decrypt']
  );
}

/**
 * Wrap (encrypt) the data key with the wrapping key
 */
export async function wrapDataKey(
  dataKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<string> { // code_id:413
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const wrappedKey = await crypto.subtle.wrapKey('raw', dataKey, wrappingKey, {
    name: 'AES-GCM',
    iv,
  });

  // Combine IV and wrapped key, encode as base64
  const combined = new Uint8Array(iv.length + wrappedKey.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(wrappedKey), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Unwrap (decrypt) the data key with the wrapping key
 */
export async function unwrapDataKey(
  wrappedDataKey: string,
  wrappingKey: CryptoKey
): Promise<CryptoKey> { // code_id:414
  // Decode base64 and split IV from wrapped key
  const combined = Uint8Array.from(atob(wrappedDataKey), c => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const wrappedKey = combined.slice(IV_LENGTH);

  return crypto.subtle.unwrapKey(
    'raw',
    wrappedKey,
    wrappingKey,
    { name: 'AES-GCM', iv },
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a PII field
 */
export async function encryptField(
  plaintext: string,
  dataKey: CryptoKey
): Promise<string> { // code_id:415
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dataKey,
    encoder.encode(plaintext)
  );

  const encrypted: EncryptedField = {
    v: ENCRYPTION_VERSION,
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };

  return JSON.stringify(encrypted);
}

/**
 * Decrypt a PII field
 */
export async function decryptField(
  encryptedJson: string,
  dataKey: CryptoKey
): Promise<string> { // code_id:416
  const encrypted: EncryptedField = JSON.parse(encryptedJson);

  // Version check for future algorithm rotation
  if (encrypted.v !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version: ${encrypted.v}`);
  }

  const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0));

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    dataKey,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}

/**
 * Generate a random salt for PBKDF2
 */
export function generateSalt(): Uint8Array { // code_id:417
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Encode salt to base64 for storage
 */
export function encodeSalt(salt: Uint8Array): string { // code_id:418
  return btoa(String.fromCharCode(...salt));
}

/**
 * Decode salt from base64
 */
export function decodeSalt(saltBase64: string): Uint8Array { // code_id:419
  return Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
}

/**
 * Check if a field is encrypted
 */
export function isEncrypted(value: string | null): boolean { // code_id:420
  if (!value) return false;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed.v === 'number' && typeof parsed.iv === 'string' && typeof parsed.ciphertext === 'string';
  } catch {
    return false;
  }
}

/**
 * Hash an email address for lookup (deterministic, non-reversible)
 * Used for email lookup without storing plaintext email
 */
export async function hashEmail(email: string): Promise<string> { // code_id:421
  const normalizedEmail = email.toLowerCase().trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedEmail);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
