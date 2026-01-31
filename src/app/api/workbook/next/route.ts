/**
 * Fetch next block API
 *
 * GET: Returns the next block after a given sequence number
 * Used when advancing through content blocks without submitting responses
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createDb } from '@/lib/db';

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
  response: null;
  responseId: null;
}

export const GET = withAuth(async (request, { db: rawDb }) => {
  try {
    const { searchParams } = new URL(request.url);
    const afterSequence = parseInt(searchParams.get('after') || '0', 10);

    if (!afterSequence || afterSequence < 0) {
      return NextResponse.json(
        { error: 'Missing or invalid "after" parameter' },
        { status: 400 }
      );
    }

    const db = createDb(rawDb);

    // Get total blocks count
    const totalResult = await db.raw
      .prepare('SELECT MAX(sequence) as total FROM stem WHERE part <= 2')
      .first<{ total: number }>();
    const totalBlocks = totalResult?.total || 0;

    // Early exit if we're already past the last block
    if (afterSequence >= totalBlocks) {
      return NextResponse.json({
        nextBlock: null,
        hasMore: false,
      });
    }

    // Fetch the next block (schema consolidation: prompts table removed)
    // Use sequence > ? to skip any gaps in the sequence
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
      .bind(afterSequence)
      .first<StemRow>();

    if (!nextStemRow) {
      return NextResponse.json({
        nextBlock: null,
        hasMore: false,
      });
    }

    let content: BlockWithResponse['content'] = {};
    try {
      content = JSON.parse(nextStemRow.content_json);
    } catch {
      content = {};
    }

    const nextExerciseId = `${nextStemRow.part}.${nextStemRow.module}.${nextStemRow.exercise}`;

    const nextBlock: BlockWithResponse = {
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

    return NextResponse.json({
      nextBlock,
      hasMore: nextStemRow.sequence < totalBlocks,
    });
  } catch (error) {
    console.error('Error fetching next block:', error);
    return NextResponse.json(
      { error: 'Failed to fetch next block' },
      { status: 500 }
    );
  }
});
