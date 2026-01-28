/**
 * AT Protocol status endpoint
 *
 * Returns the current ATP connection status for the authenticated user.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getAtpConnectionStatus } from '@/lib/atproto/oauth/session-store';

export const GET = withAuth(async (request, { userId, db }) => {
  try {
    const status = await getAtpConnectionStatus(db, userId);

    return NextResponse.json(status);
  } catch (error) {
    console.error('[ATP Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
});
