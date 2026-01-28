/**
 * POST /api/user/consent
 *
 * Update marketing consent for logged-in users.
 * Syncs to Loops.so when user opts in.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import '@/types/database';

// Augment CloudflareEnv for LOOPS_API_KEY
declare global {
  interface CloudflareEnv {
    LOOPS_API_KEY?: string;
  }
}

interface ConsentBody {
  consent: boolean;
}

export const POST = withAuth(async (request, { userId, db, env }) => {
  try {
    const body: ConsentBody = await request.json();
    const { consent } = body;

    if (typeof consent !== 'boolean') {
      return NextResponse.json(
        { error: 'consent must be a boolean' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Update user's marketing consent
    await db
      .prepare(`
        UPDATE users
        SET marketing_consent = ?,
            consent_given_at = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(consent ? 1 : 0, consent ? now : null, userId)
      .run();

    // Sync to Loops if user is opting in
    if (consent && env.LOOPS_API_KEY) {
      // Fetch user's email for Loops
      const emailResult = await db
        .prepare('SELECT email FROM emails WHERE user_id = ? AND is_active = 1')
        .bind(userId)
        .first<{ email: string }>();

      if (emailResult?.email) {
        try {
          const loopsResponse = await fetch('https://app.loops.so/api/v1/contacts/create', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.LOOPS_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: emailResult.email,
              source: 'coming-soon',
              userGroup: 'account-opted-in',
            }),
          });

          if (!loopsResponse.ok) {
            const loopsError = await loopsResponse.text();
            console.error('[Consent] Loops sync failed:', loopsError);
          }
        } catch (loopsErr) {
          console.error('[Consent] Loops API error:', loopsErr);
          // Non-fatal - consent was saved successfully
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Consent] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update consent' },
      { status: 500 }
    );
  }
});
