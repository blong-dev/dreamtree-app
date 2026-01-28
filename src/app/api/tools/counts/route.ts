/**
 * GET /api/tools/counts
 * Fetch counts of tool responses per tool type for the current user.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (_request, { userId, db }) => {
  try {
    // Get counts of tool responses grouped by tool name
    const result = await db
      .prepare(`
        SELECT t.name as tool_name, COUNT(ur.id) as count
        FROM user_responses ur
        JOIN tools t ON ur.tool_id = t.id
        WHERE ur.user_id = ? AND ur.tool_id IS NOT NULL
        GROUP BY t.name
      `)
      .bind(userId)
      .all<{ tool_name: string; count: number }>();

    // Convert to a map of tool_name -> count
    const counts: Record<string, number> = {};
    for (const row of result.results || []) {
      // Normalize tool name to match the format used in the UI
      const normalizedName = row.tool_name.toLowerCase().replace(/-/g, '_');
      counts[normalizedName] = row.count;
    }

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Error fetching tool counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tool counts' },
      { status: 500 }
    );
  }
});
