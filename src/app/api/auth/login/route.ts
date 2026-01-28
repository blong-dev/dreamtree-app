/**
 * POST /api/auth/login
 *
 * Authenticate user with email and password.
 * Includes rate limiting to prevent brute force attacks (IMP-039).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db/connection';
import {
  login,
  unwrapDataKeyFromAuth,
  storeDataKeyInSession,
  hashEmail,
  encryptField,
  isEncrypted,
  generateDataKey,
  deriveWrappingKey,
  wrapDataKey,
  generateSalt,
  encodeSalt,
} from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/auth/rate-limiter';
import '@/types/database'; // CloudflareEnv augmentation


interface LoginBody {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) { // code_id:102
  try {
    const body: LoginBody = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const db = getDB();

    // Check rate limit before attempting login
    const rateCheck = await checkRateLimit(db, email, 'login');
    if (!rateCheck.allowed) {
      const retryAfter = rateCheck.blockedUntil
        ? Math.ceil((rateCheck.blockedUntil.getTime() - Date.now()) / 1000)
        : 1800; // 30 minutes default
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }

    // Attempt login
    const result = await login(db, email, password);

    if (!result.success) {
      // Record failed attempt
      await recordFailedAttempt(db, email, 'login');
      return NextResponse.json(
        { error: result.error || 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Clear rate limit on successful login
    await clearRateLimit(db, email, 'login');

    // Unwrap and store data key in session for PII encryption (IMP-048)
    let dataKey = await unwrapDataKeyFromAuth(db, result.userId!, password);

    // If no data key exists (legacy user), generate one now
    if (!dataKey) {
      // Generate encryption keys for legacy user
      const salt = generateSalt();
      const wrappingKey = await deriveWrappingKey(password, salt);
      dataKey = await generateDataKey();
      const wrappedDataKey = await wrapDataKey(dataKey, wrappingKey);
      const storedKey = `${encodeSalt(salt)}:${wrappedDataKey}`;

      // Store wrapped key in auth table
      await db
        .prepare('UPDATE auth SET wrapped_data_key = ? WHERE user_id = ?')
        .bind(storedKey, result.userId)
        .run();
    }

    if (dataKey && result.sessionId) {
      await storeDataKeyInSession(db, result.sessionId, dataKey);

      // Migrate legacy plaintext email to encrypted (IMP-048 Phase 3)
      // Check if user's email is still plaintext (no email_hash)
      const emailRow = await db
        .prepare('SELECT id, email, email_hash FROM emails WHERE user_id = ? AND is_active = 1')
        .bind(result.userId)
        .first<{ id: string; email: string; email_hash: string | null }>();

      if (emailRow && !emailRow.email_hash && !isEncrypted(emailRow.email)) {
        // Legacy plaintext email - migrate it
        const normalizedEmail = emailRow.email.toLowerCase().trim();
        const emailHash = await hashEmail(normalizedEmail);
        const encryptedEmail = await encryptField(normalizedEmail, dataKey);

        await db
          .prepare('UPDATE emails SET email = ?, email_hash = ? WHERE id = ?')
          .bind(encryptedEmail, emailHash, emailRow.id)
          .run();
      }
    }

    // Set session cookie using next/headers
    const cookieStore = await cookies();
    cookieStore.set('dt_session', result.sessionId!, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      secure: process.env.NODE_ENV === 'production',
    });

    // Check if user has completed onboarding (has settings with name)
    // Note: display_name may be encrypted, so we just check if it exists (not null)
    const profile = await db
      .prepare('SELECT display_name FROM user_profile WHERE user_id = ?')
      .bind(result.userId)
      .first<{ display_name: string | null }>();

    // Check if display_name exists (encrypted or not)
    const hasName = profile?.display_name !== null && profile?.display_name !== '';

    return NextResponse.json({
      success: true,
      userId: result.userId,
      needsOnboarding: !hasName,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
