/**
 * DreamTree Password Management
 *
 * Password hashing and verification using bcrypt.
 */

import bcrypt from 'bcryptjs';

// Cloudflare Workers have limited CPU time (~10-50ms)
// Salt rounds of 10 provides good security while staying within limits
// Existing hashes with higher rounds will still verify (cost stored in hash)
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> { // code_id:422
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> { // code_id:423
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) { // code_id:424
    errors.push('Password must be at least 8 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
