/**
 * User Skills API
 *
 * Returns the current user's custom skills (from Part b tasks)
 * with their current mastery ratings.
 * Used by SkillMasteryRater to pre-populate skills from Part b.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createDb } from '@/lib/db';
import '@/types/database';

interface SkillRow {
  id: string;
  name: string;
  mastery: number | null;
}

export const GET = withAuth(async (_request, { userId, db: rawDb }) => {
  try {
    const db = createDb(rawDb);

    // Get custom skills created by this user, with their current mastery if set
    const result = await db.raw
      .prepare(
        `SELECT s.id, s.name, us.mastery
         FROM skills s
         LEFT JOIN user_skills us ON s.id = us.skill_id AND us.user_id = ?
         WHERE s.created_by = ?
         ORDER BY s.created_at`
      )
      .bind(userId, userId)
      .all<SkillRow>();

    const skills = (result.results || []).map((row) => ({
      id: row.id,
      name: row.name,
      mastery: row.mastery ?? 5, // Default to 5 (middle) if not rated yet
    }));

    return NextResponse.json({ skills });
  } catch (error) {
    console.error('Error fetching user skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
});
