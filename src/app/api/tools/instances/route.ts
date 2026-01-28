/**
 * GET /api/tools/instances?toolType=<type>
 * Fetch tool instances for a specific tool type.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

interface ToolResponseRow {
  id: string;
  tool_id: number;
  tool_name: string;
  exercise_id: string | null;
  response_text: string | null;
  created_at: string;
  updated_at: string;
}

export const GET = withAuth(async (request, { userId, db }) => {
  try {
    const { searchParams } = new URL(request.url);
    const toolType = searchParams.get('toolType');

    if (!toolType) {
      return NextResponse.json({ error: 'Missing toolType parameter' }, { status: 400 });
    }

    // Normalize tool type for database lookup
    const normalizedToolType = toolType.toLowerCase().replace(/_/g, '-');

    // Get tool instances from user_responses joined with tools
    const result = await db
      .prepare(`
        SELECT ur.id, ur.tool_id, t.name as tool_name, ur.exercise_id, ur.response_text, ur.created_at, ur.updated_at
        FROM user_responses ur
        JOIN tools t ON ur.tool_id = t.id
        WHERE ur.user_id = ?
          AND ur.tool_id IS NOT NULL
          AND (LOWER(REPLACE(t.name, '-', '_')) = ? OR LOWER(REPLACE(t.name, '_', '-')) = ?)
        ORDER BY ur.updated_at DESC
      `)
      .bind(userId, toolType.toLowerCase(), normalizedToolType)
      .all<ToolResponseRow>();

    // Transform to instances format
    const instances = (result.results || []).map((row, index) => {
      // Try to extract a title from the response_text (which is JSON)
      let title = `Entry ${index + 1}`;
      try {
        if (row.response_text) {
          const data = JSON.parse(row.response_text);
          // Try common title fields
          title = data.title || data.name || data.situation || `Entry ${index + 1}`;
          if (typeof title !== 'string') {
            title = `Entry ${index + 1}`;
          }
          // Truncate long titles
          if (title.length > 50) {
            title = title.substring(0, 47) + '...';
          }
        }
      } catch (err) {
        console.error(`[Tools API] Failed to parse tool instance ${row.id}:`, err);
      }

      return {
        id: row.id,
        title,
        source: row.exercise_id ? 'workbook' : 'user',
        sourceLocation: row.exercise_id ? `Exercise ${row.exercise_id}` : undefined,
        lastEdited: row.updated_at,
      };
    });

    return NextResponse.json({ instances });
  } catch (error) {
    console.error('Error fetching tool instances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instances' },
      { status: 500 }
    );
  }
});
