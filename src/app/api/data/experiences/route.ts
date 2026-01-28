/**
 * User Experiences API
 *
 * Returns the current user's experiences from user_experiences table.
 * Used by TasksPerExperienceBuilder to pre-populate experiences from Part a.
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createDb } from '@/lib/db';
import '@/types/database';

interface ExperienceRow {
  id: string;
  title: string;
  organization: string | null;
  experience_type: string;
  start_date: string | null;
  end_date: string | null;
}

export const GET = withAuth(async (_request, { userId, db: rawDb }) => {
  try {
    const db = createDb(rawDb);

    const result = await db.raw
      .prepare(
        `SELECT id, title, organization, experience_type, start_date, end_date
         FROM user_experiences
         WHERE user_id = ?
         ORDER BY start_date DESC, created_at DESC`
      )
      .bind(userId)
      .all<ExperienceRow>();

    const experiences = (result.results || []).map((row) => ({
      id: row.id,
      title: row.title,
      organization: row.organization || '',
      experienceType: row.experience_type,
      startDate: row.start_date || '',
      endDate: row.end_date === null ? 'present' : (row.end_date || ''),
    }));

    return NextResponse.json({ experiences });
  } catch (error) {
    console.error('Error fetching experiences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiences' },
      { status: 500 }
    );
  }
});
