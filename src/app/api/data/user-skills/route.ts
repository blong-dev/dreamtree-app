/**
 * User Skills API
 *
 * Returns skills from Part b that have active evidence.
 * Includes both library skills (matched via fuzzy/exact) and custom skills.
 * Used by SkillMasteryRater (Part c) to pre-populate skills from Part b.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

interface SkillRow {
  id: string;
  name: string;
  mastery: number | null;
  frequency: number | null;
}

export const GET = withAuth(async (_request, { userId, db }) => {
  try {
    // Get skills that have active evidence from Part b (experience_task)
    // This includes both library skills and custom skills
    const result = await db
      .prepare(
        `SELECT DISTINCT s.id, s.name, us.mastery, us.frequency
         FROM user_skills us
         JOIN skills s ON us.skill_id = s.id
         WHERE us.user_id = ?
           AND us.evidence_count > 0
         ORDER BY s.name`
      )
      .bind(userId)
      .all<SkillRow>();

    const skills = (result.results || []).map((row) => ({
      id: row.id,
      name: row.name,
      mastery: row.mastery ?? 5, // Default to 5 (middle) if not rated yet
      frequency: row.frequency ?? 5, // Default to 5 (middle) if not rated yet
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
