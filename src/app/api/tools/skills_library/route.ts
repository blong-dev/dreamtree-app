/**
 * GET /api/tools/skills_library
 * Fetch all skills and user's tagged skill IDs.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

interface SkillRow {
  id: string;
  name: string;
  category: string;
}

interface UserSkillRow {
  skill_id: string;
}

export const GET = withAuth(async (_request, { userId, db }) => {
  try {
    // Fetch all skills
    const skillsResult = await db
      .prepare(
        `SELECT id, name, category
         FROM skills
         WHERE is_custom = 0 OR review_status = 'approved'
         ORDER BY category, name`
      )
      .all<SkillRow>();

    const skills = (skillsResult.results || []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category as 'transferable' | 'self_management' | 'knowledge',
    }));

    // Fetch user's tagged skill IDs
    const userSkillsResult = await db
      .prepare('SELECT skill_id FROM user_skills WHERE user_id = ?')
      .bind(userId)
      .all<UserSkillRow>();

    const userSkillIds = (userSkillsResult.results || []).map((row) => row.skill_id);

    return NextResponse.json({ skills, userSkillIds });
  } catch (error) {
    console.error('Error fetching skills library:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills library' },
      { status: 500 }
    );
  }
});
