/**
 * POST /api/waitlist
 *
 * Capture email for waitlist. Stores in D1 and syncs to Loops.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDB, getEnv } from '@/lib/db/connection';

interface WaitlistBody {
  email: string;
  name?: string;
  source?: string;
}

// Augment CloudflareEnv for LOOPS_API_KEY
declare global {
  interface CloudflareEnv {
    LOOPS_API_KEY?: string;
  }
}

export async function POST(request: NextRequest) { // code_id:911
  try {
    const body: WaitlistBody = await request.json();
    const { email, name, source = 'landing' } = body;

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getDB();
    const loopsApiKey = getEnv('LOOPS_API_KEY');

    // Store in D1 (upsert - update if exists)
    let loopsSynced = 0;

    // Try to sync to Loops first
    if (loopsApiKey) {
      try {
        const loopsResponse = await fetch('https://app.loops.so/api/v1/contacts/create', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${loopsApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
            firstName: name || undefined,
            source: source,
            userGroup: 'waitlist',
          }),
        });

        if (loopsResponse.ok) {
          loopsSynced = 1;

          // Trigger welcome email automation (fire-and-forget, don't block signup)
          try {
            await fetch('https://app.loops.so/api/v1/events/send', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${loopsApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: normalizedEmail,
                eventName: 'Waitlist Welcome',
                eventProperties: {
                  date: new Date().toISOString(),
                },
              }),
            });
          } catch (eventErr) {
            console.error('[Waitlist] Loops event send failed:', eventErr);
            // Continue - contact was created, email will still be in waitlist
          }
        } else {
          const loopsError = await loopsResponse.text();
          console.error('[Waitlist] Loops sync failed:', loopsError);
        }
      } catch (loopsErr) {
        console.error('[Waitlist] Loops API error:', loopsErr);
        // Continue - we'll mark as unsynced and can retry later
      }
    } else {
      console.warn('[Waitlist] LOOPS_API_KEY not configured');
    }

    // Insert or update in D1
    // Use INSERT OR REPLACE to handle duplicates (same email, update other fields)
    await db
      .prepare(
        `INSERT INTO waitlist (email, name, source, loops_synced, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(email) DO UPDATE SET
           name = COALESCE(excluded.name, waitlist.name),
           loops_synced = excluded.loops_synced`
      )
      .bind(normalizedEmail, name || null, source, loopsSynced)
      .run();

    return NextResponse.json({
      success: true,
      synced: loopsSynced === 1,
    });
  } catch (error) {
    console.error('[Waitlist] Error:', error);
    return NextResponse.json(
      { error: 'Failed to join waitlist' },
      { status: 500 }
    );
  }
}
