/**
 * Rate Limiter for Auth Routes
 *
 * Uses D1 to track failed auth attempts and block brute force attacks.
 *
 * Configuration:
 * - 5 attempts per email per 15 minutes
 * - 30 minute block after exceeding threshold
 */

import { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';

// Rate limit configuration
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const BLOCK_MINUTES = 30;

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  blockedUntil?: Date;
}

/**
 * Check if an auth attempt is allowed
 */
export async function checkRateLimit(
  db: D1Database,
  identifier: string,  // email address
  endpoint: 'login' | 'signup'
): Promise<RateLimitResult> { // code_id:431
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);

  // Check for existing rate limit record
  const existing = await db
    .prepare(
      `SELECT id, attempt_count, first_attempt_at, blocked_until
       FROM rate_limits
       WHERE identifier = ? AND endpoint = ?`
    )
    .bind(identifier.toLowerCase(), endpoint)
    .first<{
      id: string;
      attempt_count: number;
      first_attempt_at: string;
      blocked_until: string | null;
    }>();

  if (!existing) {
    // No record - first attempt, always allowed
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if currently blocked
  if (existing.blocked_until) {
    const blockedUntil = new Date(existing.blocked_until);
    if (blockedUntil > now) {
      // Still blocked
      return {
        allowed: false,
        remainingAttempts: 0,
        blockedUntil,
      };
    }
    // Block expired - reset the record
    await db
      .prepare('DELETE FROM rate_limits WHERE id = ?')
      .bind(existing.id)
      .run();
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if window has expired
  const firstAttempt = new Date(existing.first_attempt_at);
  if (firstAttempt < windowStart) {
    // Window expired - reset the record
    await db
      .prepare('DELETE FROM rate_limits WHERE id = ?')
      .bind(existing.id)
      .run();
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Within window - check attempt count
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - existing.attempt_count);

  if (existing.attempt_count >= MAX_ATTEMPTS) {
    // Exceeded limit - should be blocked (this shouldn't normally happen
    // as we block on recordFailedAttempt, but handle edge case)
    return {
      allowed: false,
      remainingAttempts: 0,
    };
  }

  return { allowed: true, remainingAttempts };
}

/**
 * Record a failed auth attempt
 */
export async function recordFailedAttempt(
  db: D1Database,
  identifier: string,  // email address
  endpoint: 'login' | 'signup'
): Promise<RateLimitResult> { // code_id:432
  const now = new Date().toISOString();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);

  // Check for existing rate limit record
  const existing = await db
    .prepare(
      `SELECT id, attempt_count, first_attempt_at
       FROM rate_limits
       WHERE identifier = ? AND endpoint = ?`
    )
    .bind(identifier.toLowerCase(), endpoint)
    .first<{
      id: string;
      attempt_count: number;
      first_attempt_at: string;
    }>();

  if (!existing) {
    // Create new record
    await db
      .prepare(
        `INSERT INTO rate_limits (id, identifier, endpoint, attempt_count, first_attempt_at, last_attempt_at)
         VALUES (?, ?, ?, 1, ?, ?)`
      )
      .bind(nanoid(), identifier.toLowerCase(), endpoint, now, now)
      .run();

    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  // Check if window has expired
  const firstAttempt = new Date(existing.first_attempt_at);
  if (firstAttempt < windowStart) {
    // Window expired - reset the record
    await db
      .prepare(
        `UPDATE rate_limits
         SET attempt_count = 1, first_attempt_at = ?, last_attempt_at = ?, blocked_until = NULL
         WHERE id = ?`
      )
      .bind(now, now, existing.id)
      .run();

    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  // Increment attempt count
  const newCount = existing.attempt_count + 1;
  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - newCount);

  if (newCount >= MAX_ATTEMPTS) {
    // Block the identifier
    const blockedUntil = new Date(Date.now() + BLOCK_MINUTES * 60 * 1000);
    await db
      .prepare(
        `UPDATE rate_limits
         SET attempt_count = ?, last_attempt_at = ?, blocked_until = ?
         WHERE id = ?`
      )
      .bind(newCount, now, blockedUntil.toISOString(), existing.id)
      .run();

    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil,
    };
  }

  // Update attempt count
  await db
    .prepare(
      `UPDATE rate_limits
       SET attempt_count = ?, last_attempt_at = ?
       WHERE id = ?`
    )
    .bind(newCount, now, existing.id)
    .run();

  return { allowed: true, remainingAttempts };
}

/**
 * Clear rate limit on successful auth (optional, helps legitimate users)
 */
export async function clearRateLimit(
  db: D1Database,
  identifier: string,
  endpoint: 'login' | 'signup'
): Promise<void> { // code_id:433
  await db
    .prepare('DELETE FROM rate_limits WHERE identifier = ? AND endpoint = ?')
    .bind(identifier.toLowerCase(), endpoint)
    .run();
}
