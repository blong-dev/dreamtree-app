/**
 * Workbook API - Single page architecture
 *
 * GET: Fetch blocks 1..N+1 (completed + current) with responses merged
 * Returns incremental data for the single-page workbook
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createDb } from '@/lib/db';
import { decryptPII } from '@/lib/auth/pii';

// Tool IDs that contain PII and should be decrypted
// IDs updated after schema consolidation (tools now 200001+)
const PII_TOOL_IDS = new Set([
  200006, // budget_calculator
  200018, // company_tracker
  200021, // contact_tracker
]);

interface StemRow {
  id: number;
  part: number;
  module: number;
  exercise: number;
  activity: number;
  sequence: number;
  block_type: string;
  content_id: number;
  connection_id: number | null;
  content_json: string;
}

interface BlockWithResponse {
  id: number;
  sequence: number;
  exerciseId: string;
  blockType: 'content' | 'tool';  // Schema consolidation: 'prompt' removed
  activityId: number;
  connectionId: number | null;
  content: {
    id?: number;
    type?: string;
    text?: string;
    // Tool fields (including simple inputs from former prompts)
    name?: string;
    description?: string;
    instructions?: string;
    toolType?: string;
    promptText?: string | null;
    inputConfig?: object;
  };
  response?: string | null;
  responseId?: string | null;
}

export const GET = withAuth(async (_request, { userId, db: rawDb, sessionId }) => {
  try {
    const db = createDb(rawDb);

    // Step 1: Find user's current progress (highest sequence with a response)
    // Simplified: Use stem_id JOIN when available, fallback to legacy compound key
    const progressResult = await db.raw
      .prepare(`
        SELECT MAX(s.sequence) as max_sequence
        FROM user_responses ur
        JOIN stem s ON (
          ur.stem_id = s.id
          OR (ur.stem_id IS NULL AND ur.tool_id IS NOT NULL AND s.block_type = 'tool' AND s.content_id = ur.tool_id)
        )
        WHERE ur.user_id = ?
      `)
      .bind(userId)
      .first<{ max_sequence: number | null }>();

    // Progress is the highest answered sequence, or 0 if no responses yet
    const progress = progressResult?.max_sequence || 0;

    // Step 2: Get total blocks count
    const totalResult = await db.raw
      .prepare('SELECT MAX(sequence) as total FROM stem WHERE part <= 2')
      .first<{ total: number }>();
    const totalBlocks = totalResult?.total || 0;

    // Step 3: Fetch blocks 1 through progress+1 (all completed + current)
    const targetSequence = Math.min(progress + 1, totalBlocks);

    // Schema consolidation: prompts table removed, all inputs are now tools
    const stemRows = await db.raw
      .prepare(`
        SELECT
          s.id,
          s.part,
          s.module,
          s.exercise,
          s.activity,
          s.sequence,
          s.block_type,
          s.content_id,
          s.connection_id,
          CASE s.block_type
            WHEN 'content' THEN json_object(
              'id', cb.id,
              'type', cb.content_type,
              'text', cb.content
            )
            WHEN 'tool' THEN json_object(
              'id', t.id,
              'name', t.name,
              'description', t.description,
              'instructions', t.instructions,
              'toolType', t.tool_type,
              'promptText', t.prompt_text,
              'inputConfig', json(t.input_config)
            )
          END as content_json
        FROM stem s
        LEFT JOIN content_blocks cb ON s.block_type = 'content' AND s.content_id = cb.id AND cb.is_active = 1
        LEFT JOIN tools t ON s.block_type = 'tool' AND s.content_id = t.id AND t.is_active = 1
        WHERE s.sequence <= ? AND s.part <= 2
        ORDER BY s.sequence
      `)
      .bind(targetSequence)
      .all<StemRow>();

    if (!stemRows.results) {
      return NextResponse.json({ blocks: [], progress: 0, hasMore: false });
    }

    // Step 4: Fetch all user responses for these blocks
    // Now includes stem_id for simplified lookup
    const responses = await db.raw
      .prepare(`
        SELECT ur.id, ur.stem_id, ur.prompt_id, ur.tool_id, ur.response_text
        FROM user_responses ur
        WHERE ur.user_id = ?
      `)
      .bind(userId)
      .all<{
        id: string;
        stem_id: number | null;
        prompt_id: number | null;
        tool_id: number | null;
        response_text: string;
      }>();

    // Build response maps - prefer stem_id when available
    // Primary map: keyed by stem_id (new path)
    const responsesByStemId = new Map<number, { id: string; text: string }>();
    // Fallback map: keyed by tool_id (legacy path for responses without stem_id)
    const toolResponses = new Map<number, { id: string; text: string }>();

    for (const r of responses.results || []) {
      if (r.stem_id) {
        responsesByStemId.set(r.stem_id, { id: r.id, text: r.response_text });
      }
      if (r.tool_id) {
        toolResponses.set(r.tool_id, { id: r.id, text: r.response_text });
      }
    }

    // Step 5: Transform and merge blocks with responses
    const blocks: BlockWithResponse[] = await Promise.all(
      stemRows.results.map(async (row) => {
        let content: BlockWithResponse['content'] = {};
        try {
          content = JSON.parse(row.content_json);
        } catch {
          content = {};
        }

        const exerciseId = `${row.part}.${row.module}.${row.exercise}`;
        let response: string | null = null;
        let responseId: string | null = null;

        // Get response - prefer stem_id lookup (new path), fallback to content_id (legacy)
        // row.id IS stem.id
        const stemResponse = responsesByStemId.get(row.id);
        if (stemResponse) {
          response = stemResponse.text;
          responseId = stemResponse.id;
          // Decrypt PII if needed for tools
          if (row.block_type === 'tool' && content.id && PII_TOOL_IDS.has(content.id)) {
            const decrypted = await decryptPII(rawDb, sessionId, stemResponse.text);
            if (decrypted) response = decrypted;
          }
        } else if (row.block_type === 'tool' && content.id) {
          // Legacy fallback for tools
          const r = toolResponses.get(content.id);
          if (r) {
            response = r.text;
            responseId = r.id;
            // Decrypt PII if needed
            if (PII_TOOL_IDS.has(content.id)) {
              const decrypted = await decryptPII(rawDb, sessionId, r.text);
              if (decrypted) response = decrypted;
            }
          }
        }

        return {
          id: row.id,
          sequence: row.sequence,
          exerciseId,
          blockType: row.block_type as 'content' | 'tool',
          activityId: row.activity,
          connectionId: row.connection_id,
          content,
          response,
          responseId,
        };
      })
    );

    return NextResponse.json({
      blocks,
      progress,
      hasMore: targetSequence < totalBlocks,
    });
  } catch (error) {
    console.error('Error fetching workbook:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workbook' },
      { status: 500 }
    );
  }
});
