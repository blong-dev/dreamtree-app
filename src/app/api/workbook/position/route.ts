/**
 * Workbook Position API (BUG-357)
 *
 * Tracks exact block position for workbook return.
 * Position only increases (one-way ratchet).
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

interface PositionRequest {
  sequence: number;
}

export const POST = withAuth(async (request, { userId, db }) => {
  try {
    const body = await request.json() as PositionRequest;
    const { sequence } = body;

    if (typeof sequence !== 'number' || sequence < 1) {
      return NextResponse.json(
        { error: 'Invalid sequence' },
        { status: 400 }
      );
    }

    // Get current sequence (one-way ratchet - only update if higher)
    const current = await db
      .prepare('SELECT current_sequence FROM user_settings WHERE user_id = ?')
      .bind(userId)
      .first<{ current_sequence: number | null }>();

    const currentSeq = current?.current_sequence || 0;

    // Only update if new sequence is higher
    if (sequence > currentSeq) {
      const now = new Date().toISOString();
      await db
        .prepare(`
          INSERT INTO user_settings (user_id, current_sequence, created_at, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            current_sequence = excluded.current_sequence,
            updated_at = excluded.updated_at
        `)
        .bind(userId, sequence, now, now)
        .run();

      return NextResponse.json({ sequence, updated: true });
    }

    return NextResponse.json({ sequence: currentSeq, updated: false });
  } catch (error) {
    console.error('Error updating position:', error);
    return NextResponse.json(
      { error: 'Failed to update position' },
      { status: 500 }
    );
  }
});
