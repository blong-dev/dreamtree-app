/**
 * AT Protocol skill sync endpoint
 *
 * Manually triggers a sync of all user skills to their PDS.
 * Used for testing and manual sync requests.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { syncAllSkills } from '@/lib/atproto/sync/skill-sync';
import { getAtpConnectionStatus } from '@/lib/atproto/oauth/session-store';

export const POST = withAuth(async (request, { userId, db }) => {
  try {
    // Check if user is connected
    const status = await getAtpConnectionStatus(db, userId);
    if (!status.connected) {
      return NextResponse.json(
        { error: 'Not connected to AT Protocol' },
        { status: 400 }
      );
    }

    // Sync all skills
    const result = await syncAllSkills(db, userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ATP Sync Skills] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync skills' },
      { status: 500 }
    );
  }
});
