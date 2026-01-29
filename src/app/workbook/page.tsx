/**
 * Workbook Page - Single Page Architecture
 *
 * The entire workbook is ONE page. Renders blocks 1..N+1
 * (completed + current) with hash navigation for bookmarking.
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db/connection';
import { getSessionData } from '@/lib/auth/session';
import { createDb } from '@/lib/db';
import { decryptPII } from '@/lib/auth/pii';
import { WorkbookClient } from './WorkbookClient';
import type { BlockWithResponse } from '@/components/workbook/types';
import type { BackgroundColorId, TextColorId, FontFamilyId } from '@/components/onboarding/types';

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

export default async function WorkbookPage() { // code_id:161
  // Get session from cookie
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('dt_session')?.value;

  if (!sessionId) {
    redirect('/login');
  }

  const rawDb = getDB();
  const sessionData = await getSessionData(rawDb, sessionId);

  if (!sessionData) {
    redirect('/login');
  }

  const db = createDb(rawDb);
  const userId = sessionData.user.id;

  // Fetch user's theme settings and saved position (BUG-357)
  let theme = null;
  let savedSequence = 0;
  try {
    const settingsRow = await db.raw
      .prepare('SELECT background_color, text_color, font, text_size, current_sequence FROM user_settings WHERE user_id = ?')
      .bind(userId)
      .first<{ background_color: string; text_color: string; font: string; text_size: number | null; current_sequence: number | null }>();

    if (settingsRow) {
      theme = {
        backgroundColor: settingsRow.background_color as BackgroundColorId,
        textColor: settingsRow.text_color as TextColorId,
        font: settingsRow.font as FontFamilyId,
        textSize: settingsRow.text_size ?? 1.0,
      };
      savedSequence = settingsRow.current_sequence || 0;
    }
  } catch (error) {
    console.error('Error fetching theme:', error);
  }

  // Find user's current progress (highest sequence with a response)
  // Simplified: Use stem_id JOIN when available, fallback to legacy compound key
  // Schema consolidation: prompt references removed, all inputs are now tools
  const progressResult = await db.raw
    .prepare(`
      SELECT MAX(s.sequence) as max_sequence
      FROM user_responses ur
      JOIN stem s ON (
        ur.stem_id = s.id
        OR (ur.stem_id IS NULL AND ur.tool_id IS NOT NULL AND s.block_type = 'tool' AND s.content_id = ur.tool_id
          AND ur.exercise_id = (s.part || '.' || s.module || '.' || s.exercise)
          AND (ur.activity_id = CAST(s.activity AS TEXT) OR (ur.activity_id IS NULL AND s.activity <= 1)))
      )
      WHERE ur.user_id = ?
    `)
    .bind(userId)
    .first<{ max_sequence: number | null }>();

  const responseProgress = progressResult?.max_sequence || 0;

  // Get total blocks count
  const totalResult = await db.raw
    .prepare('SELECT MAX(sequence) as total FROM stem WHERE part <= 2')
    .first<{ total: number }>();
  const totalBlocks = totalResult?.total || 0;

  // BUG-357: Determine target sequence
  // - responseProgress = highest sequence with a response (completed)
  // - savedSequence = current viewing position (from position API)
  // For responses: add +1 to show next block after last completed
  // For savedSequence: use directly since it's already the current position
  const progressBasedTarget = Math.min(responseProgress + 1, totalBlocks);
  const targetSequence = Math.max(progressBasedTarget, savedSequence);

  // Progress value for client = last "completed" sequence (targetSequence - 1)
  const progress = targetSequence > 0 ? targetSequence - 1 : 0;

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
            'inputConfig', t.input_config
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

  // Fetch all user responses
  // Now includes stem_id for simplified lookup
  const responses = await db.raw
    .prepare(`
      SELECT ur.id, ur.stem_id, ur.prompt_id, ur.tool_id, ur.exercise_id, ur.activity_id, ur.response_text
      FROM user_responses ur
      WHERE ur.user_id = ?
    `)
    .bind(userId)
    .all<{
      id: string;
      stem_id: number | null;
      prompt_id: number | null;
      tool_id: number | null;
      exercise_id: string;
      activity_id: string | null;
      response_text: string;
    }>();

  // Build response maps - prefer stem_id when available
  // Primary map: keyed by stem_id (new path)
  const responsesByStemId = new Map<number, { id: string; text: string }>();
  // Fallback map: keyed by compound key (legacy path for responses without stem_id)
  const toolResponses = new Map<string, { id: string; text: string }>();

  for (const r of responses.results || []) {
    if (r.stem_id) {
      responsesByStemId.set(r.stem_id, { id: r.id, text: r.response_text });
    }
    // Also populate legacy map for backward compatibility
    if (r.tool_id) {
      const activityKey = r.activity_id || '1';
      const key = `${r.tool_id}:${r.exercise_id}:${activityKey}`;
      toolResponses.set(key, { id: r.id, text: r.response_text });
    }
  }

  // Transform and merge blocks with responses
  const blocks: BlockWithResponse[] = await Promise.all(
    (stemRows.results || []).map(async (row) => {
      let content: BlockWithResponse['content'] = {};
      try {
        content = JSON.parse(row.content_json);
        // Parse nested inputConfig if it's a string (from SQLite JSON)
        const contentAny = content as Record<string, unknown>;
        if (typeof contentAny.inputConfig === 'string') {
          contentAny.inputConfig = JSON.parse(contentAny.inputConfig);
        }
      } catch {
        content = {};
      }

      const exerciseId = `${row.part}.${row.module}.${row.exercise}`;
      let response: string | null = null;
      let responseId: string | null = null;

      // Get response - prefer stem_id lookup (new path), fallback to compound key (legacy)
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
        const key = `${content.id}:${exerciseId}:${row.activity}`;
        const r = toolResponses.get(key);
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

  return (
    <WorkbookClient
      initialBlocks={blocks}
      initialProgress={progress}
      theme={theme}
    />
  );
}
