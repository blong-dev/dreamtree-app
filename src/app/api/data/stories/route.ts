/**
 * User Stories API
 *
 * Returns the current user's SOARED stories from user_stories table.
 * Used by SkillsPerStoryBuilder to pre-populate stories from Part 3.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createDb } from '@/lib/db';
import '@/types/database';

interface StoryRow {
  id: string;
  experience_id: string | null;
  title: string | null;
  situation: string;
  obstacle: string;
  action: string;
  result: string;
  evaluation: string;
  discovery: string;
}

export const GET = withAuth(async (_request, { userId, db: rawDb }) => {
  try {
    const db = createDb(rawDb);

    const result = await db.raw
      .prepare(
        `SELECT id, experience_id, title, situation, obstacle, action, result, evaluation, discovery
         FROM user_stories
         WHERE user_id = ?
         ORDER BY created_at ASC`
      )
      .bind(userId)
      .all<StoryRow>();

    const stories = (result.results || []).map((row) => ({
      id: row.id,
      experienceId: row.experience_id,
      title: row.title,
      situation: row.situation,
      obstacle: row.obstacle,
      action: row.action,
      result: row.result,
      evaluation: row.evaluation,
      discovery: row.discovery,
    }));

    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
});
