/**
 * Workbook response API routes
 *
 * B2: Standardized to use withAuth pattern (AUDIT-001)
 * Single Page Architecture: POST returns next block after save
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createDb } from '@/lib/db';
import { encryptPII, decryptPII } from '@/lib/auth/pii';
import { validateToolData } from '@/lib/validation';
import { writeToDomainTable } from '@/lib/domain-writers';
import { nanoid } from 'nanoid';
import '@/types/database'; // CloudflareEnv augmentation

// Tool IDs that contain PII and should be encrypted (IMP-048 Phase 2)
// IDs updated after schema consolidation (tools now 200001+)
const PII_TOOL_IDS = new Set([
  200006, // budget_calculator (monthly_expenses, annual_needs, hourly_batna)
  200018, // company_tracker (company details)
  200021, // contact_tracker (name, email, phone, etc.)
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

interface SaveResponseRequest {
  // New: Single identifier (preferred)
  stemId?: number;
  // Legacy: Compound key (for backward compatibility during transition)
  promptId?: number;
  toolId?: number;
  exerciseId?: string;
  activityId?: string;
  responseText: string;
}

export const POST = withAuth(async (request, { userId, db: rawDb, sessionId }) => {
  try {
    const db = createDb(rawDb);

    // Parse request body
    const body: SaveResponseRequest = await request.json();
    const { stemId, promptId, toolId, exerciseId, activityId, responseText } = body;

    // Validate: must have stemId OR (promptId|toolId + exerciseId)
    const hasLegacyKey = (promptId || toolId) && exerciseId;
    if (!stemId && !hasLegacyKey) {
      return NextResponse.json(
        { error: 'Must provide stemId or (promptId|toolId + exerciseId)' },
        { status: 400 }
      );
    }

    if (responseText === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: responseText' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const responseId = nanoid();

    // If stemId is provided, use the new simple path
    if (stemId) {
      // Look up stem to get block type and content_id for validation
      const stemRow = await db.raw
        .prepare('SELECT id, block_type, content_id, part, module, exercise, activity FROM stem WHERE id = ?')
        .bind(stemId)
        .first<{ id: number; block_type: string; content_id: number; part: number; module: number; exercise: number; activity: number }>();

      if (!stemRow) {
        return NextResponse.json(
          { error: 'Invalid stemId: stem not found' },
          { status: 400 }
        );
      }

      const isToolResponse = stemRow.block_type === 'tool';
      const contentId = stemRow.content_id;

      // Validate tool response data (IMP-043)
      let toolName: string | null = null;
      if (isToolResponse) {
        const toolRow = await db.raw
          .prepare('SELECT name FROM tools WHERE id = ?')
          .bind(contentId)
          .first<{ name: string }>();

        toolName = toolRow?.name || null;

        if (toolName) {
          try {
            const parsedData = JSON.parse(responseText);
            const validation = validateToolData(toolName, parsedData);
            if (!validation.valid) {
              return NextResponse.json(
                { error: `Invalid tool data: ${validation.error}` },
                { status: 400 }
              );
            }
          } catch {
            return NextResponse.json(
              { error: 'Invalid JSON in responseText' },
              { status: 400 }
            );
          }
        }
      }

      // Encrypt response for PII tools (IMP-048 Phase 2)
      let textToStore = responseText;
      if (isToolResponse && PII_TOOL_IDS.has(contentId)) {
        const encrypted = await encryptPII(rawDb, sessionId, responseText);
        if (encrypted) {
          textToStore = encrypted;
        }
      }

      // Simple lookup by stem_id
      const existing = await db.raw
        .prepare('SELECT id FROM user_responses WHERE user_id = ? AND stem_id = ?')
        .bind(userId, stemId)
        .first<{ id: string }>();

      let finalResponseId: string;

      if (existing) {
        // Update existing response
        await db.raw
          .prepare('UPDATE user_responses SET response_text = ?, updated_at = ? WHERE id = ?')
          .bind(textToStore, now, existing.id)
          .run();
        finalResponseId = existing.id;
      } else {
        // Insert new response with stem_id
        // Also populate legacy columns for backward compatibility
        const exerciseIdStr = `${stemRow.part}.${stemRow.module}.${stemRow.exercise}`;
        const activityIdStr = stemRow.activity.toString();

        await db.raw
          .prepare(`
            INSERT INTO user_responses (id, user_id, stem_id, prompt_id, tool_id, exercise_id, activity_id, response_text, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            responseId,
            userId,
            stemId,
            isToolResponse ? null : contentId,
            isToolResponse ? contentId : null,
            exerciseIdStr,
            activityIdStr,
            textToStore,
            now,
            now
          )
          .run();
        finalResponseId = responseId;
      }

      // Write to domain tables for connections (non-blocking)
      if (toolName) {
        await writeToDomainTable(rawDb, userId, stemId, toolName, responseText);
      }

      // Get the actual sequence from stem
      const seqResult = await db.raw
        .prepare('SELECT sequence FROM stem WHERE id = ?')
        .bind(stemId)
        .first<{ sequence: number }>();

      const currentSeq = seqResult?.sequence || 0;

      // Get total blocks count
      const totalResult = await db.raw
        .prepare('SELECT MAX(sequence) as total FROM stem WHERE part <= 2')
        .first<{ total: number }>();
      const totalBlocks = totalResult?.total || 0;

      // If there's a next block, fetch it
      let nextBlock: BlockWithResponse | null = null;

      // Schema consolidation: prompts table removed, all inputs are now tools
      // Use sequence > currentSeq to skip any gaps in the sequence
      const nextStemRow = await db.raw
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
          WHERE s.sequence > ? AND s.part <= 2
          ORDER BY s.sequence ASC
          LIMIT 1
        `)
        .bind(currentSeq)
        .first<StemRow>();

      if (nextStemRow) {
        let content: BlockWithResponse['content'] = {};
        try {
          content = JSON.parse(nextStemRow.content_json);
        } catch {
          content = {};
        }

        const nextExerciseId = `${nextStemRow.part}.${nextStemRow.module}.${nextStemRow.exercise}`;

        nextBlock = {
          id: nextStemRow.id,
          sequence: nextStemRow.sequence,
          exerciseId: nextExerciseId,
          blockType: nextStemRow.block_type as 'content' | 'tool',
          activityId: nextStemRow.activity,
          connectionId: nextStemRow.connection_id,
          content,
          response: null,
          responseId: null,
        };
      }

      return NextResponse.json({
        id: finalResponseId,
        stemId,
        responseText, // Return actual response for WorkbookView to use
        updated: !!existing,
        newProgress: currentSeq,
        nextBlock,
        hasMore: nextStemRow ? nextStemRow.sequence < totalBlocks : false,
      });
    }

    // Legacy path: use compound key (toolId + exerciseId + activityId)
    // Schema consolidation: promptId no longer supported, all inputs are tools
    if (!toolId) {
      return NextResponse.json(
        { error: 'promptId is no longer supported. Use toolId or stemId.' },
        { status: 400 }
      );
    }
    const contentId = toolId;
    const idColumn = 'tool_id';

    // Validate tool response data (IMP-043)
    // Legacy path only handles tools (promptId rejected above)
    let legacyToolName: string | null = null;
    if (toolId) {
      const toolRow = await db.raw
        .prepare('SELECT name FROM tools WHERE id = ?')
        .bind(toolId)
        .first<{ name: string }>();

      legacyToolName = toolRow?.name || null;

      if (legacyToolName) {
        try {
          const parsedData = JSON.parse(responseText);
          const validation = validateToolData(legacyToolName, parsedData);
          if (!validation.valid) {
            return NextResponse.json(
              { error: `Invalid tool data: ${validation.error}` },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: 'Invalid JSON in responseText' },
            { status: 400 }
          );
        }
      }
    }

    // Encrypt response for PII tools (IMP-048 Phase 2)
    // Legacy path only handles tools (promptId rejected above)
    let textToStore = responseText;
    if (PII_TOOL_IDS.has(toolId)) {
      const encrypted = await encryptPII(rawDb, sessionId, responseText);
      if (encrypted) {
        textToStore = encrypted;
      }
    }

    // Check if response already exists
    const existing = await db.raw
      .prepare(
        `SELECT id FROM user_responses
         WHERE user_id = ? AND ${idColumn} = ? AND exercise_id = ?
         AND (activity_id = ? OR (activity_id IS NULL AND ? IS NULL))`
      )
      .bind(userId, contentId, exerciseId, activityId || null, activityId || null)
      .first<{ id: string }>();

    let finalResponseId: string;

    // Look up stem_id for the response (to populate the new column)
    const [partStr, moduleStr, exerciseStr] = exerciseId!.split('.');
    const activityNum = activityId ? parseInt(activityId, 10) : null;
    const stemLookup = await db.raw
      .prepare(`
        SELECT id FROM stem
        WHERE block_type = 'tool' AND content_id = ?
          AND part = ? AND module = ? AND exercise = ?
          ${activityNum !== null ? 'AND activity = ?' : 'AND activity <= 1'}
          AND part <= 2
        LIMIT 1
      `)
      .bind(
        ...[
          contentId,
          parseInt(partStr, 10),
          parseInt(moduleStr, 10),
          parseInt(exerciseStr, 10),
          ...(activityNum !== null ? [activityNum] : []),
        ]
      )
      .first<{ id: number }>();

    const resolvedStemId = stemLookup?.id || null;

    if (existing) {
      // Update existing response (also set stem_id if not set)
      await db.raw
        .prepare(
          `UPDATE user_responses
           SET response_text = ?, updated_at = ?, stem_id = COALESCE(stem_id, ?)
           WHERE id = ?`
        )
        .bind(textToStore, now, resolvedStemId, existing.id)
        .run();

      finalResponseId = existing.id;
    } else {
      // Insert new response with tool_id and stem_id
      await db.raw
        .prepare(
          `INSERT INTO user_responses (id, user_id, stem_id, prompt_id, tool_id, exercise_id, activity_id, response_text, created_at, updated_at)
           VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`
        )
        .bind(responseId, userId, resolvedStemId, toolId, exerciseId, activityId || null, textToStore, now, now)
        .run();

      finalResponseId = responseId;
    }

    // Write to domain tables for connections (non-blocking)
    if (legacyToolName && resolvedStemId) {
      await writeToDomainTable(rawDb, userId, resolvedStemId, legacyToolName, responseText);
    }

    // Find the sequence of the block that was just answered
    const currentBlockResult = await db.raw
      .prepare(`
        SELECT sequence FROM stem
        WHERE block_type = 'tool' AND content_id = ?
          AND part = ? AND module = ? AND exercise = ?
          ${activityNum !== null ? 'AND activity = ?' : ''}
          AND part <= 2
        LIMIT 1
      `)
      .bind(
        ...[
          contentId,
          parseInt(partStr, 10),
          parseInt(moduleStr, 10),
          parseInt(exerciseStr, 10),
          ...(activityNum !== null ? [activityNum] : []),
        ]
      )
      .first<{ sequence: number }>();

    const currentSequence = currentBlockResult?.sequence || 0;

    // Get total blocks count
    const totalResult = await db.raw
      .prepare('SELECT MAX(sequence) as total FROM stem WHERE part <= 2')
      .first<{ total: number }>();
    const totalBlocks = totalResult?.total || 0;

    // If there's a next block, fetch it
    // Use sequence > currentSequence to skip any gaps in the sequence
    let nextBlock: BlockWithResponse | null = null;

    // Schema consolidation: prompts table removed, all inputs are now tools
    const nextStemRow = await db.raw
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
        WHERE s.sequence > ? AND s.part <= 2
        ORDER BY s.sequence ASC
        LIMIT 1
      `)
      .bind(currentSequence)
      .first<StemRow>();

    if (nextStemRow) {
      let content: BlockWithResponse['content'] = {};
      try {
        content = JSON.parse(nextStemRow.content_json);
      } catch {
        content = {};
      }

      const nextExerciseId = `${nextStemRow.part}.${nextStemRow.module}.${nextStemRow.exercise}`;

      nextBlock = {
        id: nextStemRow.id,
        sequence: nextStemRow.sequence,
        exerciseId: nextExerciseId,
        blockType: nextStemRow.block_type as 'content' | 'tool',
        activityId: nextStemRow.activity,
        connectionId: nextStemRow.connection_id,
        content,
        response: null,
        responseId: null,
      };
    }

    return NextResponse.json({
      id: finalResponseId,
      stemId: resolvedStemId,
      responseText, // Return actual response for WorkbookView to use
      updated: !!existing,
      newProgress: currentSequence,
      nextBlock,
      hasMore: nextStemRow ? nextStemRow.sequence < totalBlocks : false,
    });
  } catch (error) {
    console.error('Error saving response:', error);
    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 }
    );
  }
});

// PUT endpoint to update an existing response
// BUG-404: Extended to support toolId for tool editing
export const PUT = withAuth(async (request, { userId, db: rawDb, sessionId }) => {
  try {
    const db = createDb(rawDb);

    // Parse request body
    const body: SaveResponseRequest = await request.json();
    const { stemId, promptId, toolId, exerciseId, activityId, responseText } = body;

    // Validate: must have stemId OR (promptId|toolId + exerciseId)
    const hasLegacyKey = (promptId || toolId) && exerciseId;
    if (!stemId && !hasLegacyKey) {
      return NextResponse.json(
        { error: 'Must provide stemId or (promptId|toolId + exerciseId)' },
        { status: 400 }
      );
    }

    if (responseText === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: responseText' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // If stemId is provided, use the new simple path
    if (stemId) {
      // Look up stem to get block type and content_id for validation
      const stemRow = await db.raw
        .prepare('SELECT id, block_type, content_id FROM stem WHERE id = ?')
        .bind(stemId)
        .first<{ id: number; block_type: string; content_id: number }>();

      if (!stemRow) {
        return NextResponse.json(
          { error: 'Invalid stemId: stem not found' },
          { status: 400 }
        );
      }

      const isToolResponse = stemRow.block_type === 'tool';
      const contentId = stemRow.content_id;

      // Validate tool response data (IMP-043)
      let toolName: string | null = null;
      if (isToolResponse) {
        const toolRow = await db.raw
          .prepare('SELECT name FROM tools WHERE id = ?')
          .bind(contentId)
          .first<{ name: string }>();

        toolName = toolRow?.name || null;

        if (toolName) {
          try {
            const parsedData = JSON.parse(responseText);
            const validation = validateToolData(toolName, parsedData);
            if (!validation.valid) {
              return NextResponse.json(
                { error: `Invalid tool data: ${validation.error}` },
                { status: 400 }
              );
            }
          } catch {
            return NextResponse.json(
              { error: 'Invalid JSON in responseText' },
              { status: 400 }
            );
          }
        }
      }

      // Encrypt response for PII tools (IMP-048 Phase 2)
      let textToStore = responseText;
      if (isToolResponse && PII_TOOL_IDS.has(contentId)) {
        const encrypted = await encryptPII(rawDb, sessionId, responseText);
        if (encrypted) {
          textToStore = encrypted;
        }
      }

      // Simple lookup by stem_id
      const existing = await db.raw
        .prepare('SELECT id FROM user_responses WHERE user_id = ? AND stem_id = ?')
        .bind(userId, stemId)
        .first<{ id: string }>();

      if (!existing) {
        return NextResponse.json(
          { error: 'Response not found' },
          { status: 404 }
        );
      }

      // Update existing response
      await db.raw
        .prepare('UPDATE user_responses SET response_text = ?, updated_at = ? WHERE id = ?')
        .bind(textToStore, now, existing.id)
        .run();

      // Update domain tables for connections
      if (toolName) {
        await writeToDomainTable(rawDb, userId, stemId, toolName, responseText);
      }

      return NextResponse.json({
        id: existing.id,
        stemId,
        responseText, // Return actual response
        updated: true,
      });
    }

    // Legacy path: use compound key (toolId + exerciseId)
    // Schema consolidation: promptId no longer supported
    if (!toolId) {
      return NextResponse.json(
        { error: 'promptId is no longer supported. Use toolId or stemId.' },
        { status: 400 }
      );
    }
    const contentId = toolId;
    const idColumn = 'tool_id';

    // Validate tool response data (IMP-043)
    let legacyToolName: string | null = null;
    if (toolId) {
      const toolRow = await db.raw
        .prepare('SELECT name FROM tools WHERE id = ?')
        .bind(toolId)
        .first<{ name: string }>();

      legacyToolName = toolRow?.name || null;

      if (legacyToolName) {
        try {
          const parsedData = JSON.parse(responseText);
          const validation = validateToolData(legacyToolName, parsedData);
          if (!validation.valid) {
            return NextResponse.json(
              { error: `Invalid tool data: ${validation.error}` },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: 'Invalid JSON in responseText' },
            { status: 400 }
          );
        }
      }
    }

    // Encrypt response for PII tools (IMP-048 Phase 2)
    // Legacy path only handles tools (promptId rejected above)
    let textToStore = responseText;
    if (PII_TOOL_IDS.has(toolId)) {
      const encrypted = await encryptPII(rawDb, sessionId, responseText);
      if (encrypted) {
        textToStore = encrypted;
      }
    }

    // Check if response exists (include activityId in check for tools)
    const existing = await db.raw
      .prepare(
        `SELECT id, stem_id FROM user_responses
         WHERE user_id = ? AND ${idColumn} = ? AND exercise_id = ?
         AND (activity_id = ? OR (activity_id IS NULL AND ? IS NULL))`
      )
      .bind(userId, contentId, exerciseId, activityId || null, activityId || null)
      .first<{ id: string; stem_id: number | null }>();

    if (!existing) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Update existing response
    await db.raw
      .prepare(
        `UPDATE user_responses
         SET response_text = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(textToStore, now, existing.id)
      .run();

    // Update domain tables for connections
    if (legacyToolName && existing.stem_id) {
      await writeToDomainTable(rawDb, userId, existing.stem_id, legacyToolName, responseText);
    }

    return NextResponse.json({
      id: existing.id,
      stemId: existing.stem_id,
      responseText, // Return actual response
      updated: true,
    });
  } catch (error) {
    console.error('Error updating response:', error);
    return NextResponse.json(
      { error: 'Failed to update response' },
      { status: 500 }
    );
  }
});

// GET endpoint to fetch previous responses for an exercise
export const GET = withAuth(async (request, { userId, db: rawDb, sessionId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exerciseId');

    if (!exerciseId) {
      return NextResponse.json(
        { error: 'Missing exerciseId parameter' },
        { status: 400 }
      );
    }

    const db = createDb(rawDb);
    const responses = await db.raw
      .prepare(
        `SELECT id, prompt_id, tool_id, exercise_id, activity_id, response_text, created_at, updated_at
         FROM user_responses
         WHERE user_id = ? AND exercise_id = ?
         ORDER BY created_at`
      )
      .bind(userId, exerciseId)
      .all<{
        id: string;
        prompt_id: number | null;
        tool_id: number | null;
        exercise_id: string;
        activity_id: string | null;
        response_text: string;
        created_at: string;
        updated_at: string;
      }>();

    // Decrypt PII tool responses (IMP-048 Phase 2)
    const decryptedResponses = await Promise.all(
      (responses.results || []).map(async (response) => {
        if (response.tool_id && PII_TOOL_IDS.has(response.tool_id)) {
          const decrypted = await decryptPII(rawDb, sessionId, response.response_text);
          return { ...response, response_text: decrypted || response.response_text };
        }
        return response;
      })
    );

    return NextResponse.json({
      exerciseId,
      responses: decryptedResponses,
    });
  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    );
  }
});
