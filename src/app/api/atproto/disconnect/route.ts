/**
 * AT Protocol disconnect endpoint
 *
 * Removes the user's ATP connection from D1.
 * Does NOT delete their data from the PDS - that belongs to them.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { deleteAtpConnection } from '@/lib/atproto/oauth/session-store';

export const POST = withAuth(async (request, { userId, db }) => {
  try {
    await deleteAtpConnection(db, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ATP Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
});
