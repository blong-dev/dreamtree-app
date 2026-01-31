/**
 * POST /api/auth/signup
 *
 * Create a new user account with email and password.
 * Includes rate limiting to prevent signup spam (IMP-039).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDB, getEnv } from '@/lib/db/connection';
import { nanoid } from 'nanoid';
import {
  hashPassword,
  validatePasswordStrength,
  deriveWrappingKey,
  generateDataKey,
  wrapDataKey,
  generateSalt,
  encodeSalt,
  storeDataKeyInSession,
  hashEmail,
  encryptField,
} from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/auth/rate-limiter';
import '@/types/database'; // CloudflareEnv augmentation


interface SignupBody {
  email: string;
  password: string;
  marketingConsent?: boolean;
}

// Augment CloudflareEnv for LOOPS_API_KEY
declare global {
  interface CloudflareEnv {
    LOOPS_API_KEY?: string;
  }
}

export async function POST(request: NextRequest) { // code_id:135
  try {
    const body: SignupBody = await request.json();
    const { email, password, marketingConsent = false } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      );
    }

    const db = getDB();

    // Check rate limit before attempting signup
    const rateCheck = await checkRateLimit(db, email, 'signup');
    if (!rateCheck.allowed) {
      const retryAfter = rateCheck.blockedUntil
        ? Math.ceil((rateCheck.blockedUntil.getTime() - Date.now()) / 1000)
        : 1800; // 30 minutes default
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }
    const normalizedEmail = email.toLowerCase().trim();

    // Hash email for lookup (IMP-048 Phase 3)
    const emailHash = await hashEmail(normalizedEmail);

    // Check if email is already taken
    // First try by email_hash (new encrypted system), then fallback to plaintext (legacy)
    let existingEmail = await db
      .prepare('SELECT id FROM emails WHERE email_hash = ?')
      .bind(emailHash)
      .first()
      .catch(() => null); // Handle case where email_hash column doesn't exist yet

    // Fallback: check plaintext email for legacy/pre-migration databases
    if (!existingEmail) {
      existingEmail = await db
        .prepare('SELECT id FROM emails WHERE email = ?')
        .bind(normalizedEmail)
        .first();
    }

    if (existingEmail) {
      // Record failed attempt (someone may be probing for existing emails)
      await recordFailedAttempt(db, normalizedEmail, 'signup');
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const userId = nanoid();
    const sessionId = nanoid();
    const authId = nanoid();
    const emailId = nanoid();

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate encryption keys for PII
    const salt = generateSalt();
    const wrappingKey = await deriveWrappingKey(password, salt);
    const dataKey = await generateDataKey();
    const wrappedDataKey = await wrapDataKey(dataKey, wrappingKey);
    const storedKey = `${encodeSalt(salt)}:${wrappedDataKey}`;

    // Check if email_hash column exists (migration 0015)
    // This determines whether to use encrypted or plaintext email storage
    let hasEmailHashColumn = false;
    try {
      await db.prepare("SELECT email_hash FROM emails LIMIT 0").all();
      hasEmailHashColumn = true;
    } catch {
      // Column doesn't exist - use legacy schema
      hasEmailHashColumn = false;
    }

    // Prepare email record based on schema version
    let emailInsert;
    if (hasEmailHashColumn) {
      // New schema: store encrypted email with hash for lookup (IMP-048 Phase 3)
      const encryptedEmail = await encryptField(normalizedEmail, dataKey);
      emailInsert = db
        .prepare(
          `INSERT INTO emails (id, user_id, email, email_hash, is_active, added_at)
           VALUES (?, ?, ?, ?, 1, ?)`
        )
        .bind(emailId, userId, encryptedEmail, emailHash, now);
    } else {
      // Legacy schema: store plaintext email (pre-migration 0015)
      emailInsert = db
        .prepare(
          `INSERT INTO emails (id, user_id, email, is_active, added_at)
           VALUES (?, ?, ?, 1, ?)`
        )
        .bind(emailId, userId, normalizedEmail, now);
    }

    // Execute all 7 inserts as a batch transaction (IMP-044)
    // If any insert fails, none persist — no orphan records
    await db.batch([
      // 1. Create user (not anonymous)
      db
        .prepare(
          `INSERT INTO users (id, is_anonymous, workbook_complete, marketing_consent, consent_given_at, created_at, updated_at)
           VALUES (?, 0, 0, ?, ?, ?, ?)`
        )
        .bind(userId, marketingConsent ? 1 : 0, marketingConsent ? now : null, now, now),

      // 2. Create auth record
      db
        .prepare(
          `INSERT INTO auth (id, user_id, type, password_hash, wrapped_data_key, created_at, updated_at)
           VALUES (?, ?, 'password', ?, ?, ?, ?)`
        )
        .bind(authId, userId, passwordHash, storedKey, now, now),

      // 3. Create email record (encrypted or plaintext based on schema version)
      emailInsert,

      // 4. Create session
      db
        .prepare(
          `INSERT INTO sessions (id, user_id, created_at, last_seen_at)
           VALUES (?, ?, ?, ?)`
        )
        .bind(sessionId, userId, now, now),

      // 5. Create default settings
      db
        .prepare(
          `INSERT INTO user_settings (user_id, background_color, text_color, font, text_size, created_at, updated_at)
           VALUES (?, 'ivory', 'charcoal', 'inter', 1.0, ?, ?)`
        )
        .bind(userId, now, now),

      // 6. Create user_profile row (name is collected during onboarding)
      db
        .prepare(
          `INSERT INTO user_profile (user_id, display_name, created_at, updated_at)
           VALUES (?, NULL, ?, ?)`
        )
        .bind(userId, now, now),

      // 7. Create user_values row
      db
        .prepare(
          `INSERT INTO user_values (user_id, created_at, updated_at)
           VALUES (?, ?, ?)`
        )
        .bind(userId, now, now),
    ]);

    // Clear rate limit on successful signup
    await clearRateLimit(db, normalizedEmail, 'signup');

    // Sync to Loops if user consented to marketing emails
    const loopsApiKey = getEnv('LOOPS_API_KEY');
    if (marketingConsent && loopsApiKey) {
      try {
        const loopsResponse = await fetch('https://app.loops.so/api/v1/contacts/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${loopsApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
            source: 'signup',
            userGroup: 'signup-opted-in',
          }),
        });

        if (!loopsResponse.ok) {
          const loopsError = await loopsResponse.text();
          console.error('[Signup] Loops sync failed:', loopsError);
        }
      } catch (loopsErr) {
        console.error('[Signup] Loops API error:', loopsErr);
        // Non-fatal - user account created successfully
      }
    }

    // Store data key in session for PII encryption (IMP-048)
    // This may fail if migration 0013 hasn't been applied yet - graceful fallback
    try {
      await storeDataKeyInSession(db, sessionId, dataKey);
    } catch {
      // Session doesn't have data_key column yet - non-fatal
      console.warn('[Signup] Could not store data key in session (migration 0013 not applied)');
    }

    // Set session cookie using next/headers
    const cookieStore = await cookies();
    cookieStore.set('dt_session', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      secure: process.env.NODE_ENV === 'production',
    });

    return NextResponse.json({
      success: true,
      userId,
      needsOnboarding: true,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
