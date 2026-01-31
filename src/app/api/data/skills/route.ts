import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';


export const GET = withAuth(async (_request, { userId, db }) => {
  try {
    // Fetch library skills + approved custom + user's own custom skills
    const result = await db
      .prepare(
        `SELECT id, name, category
         FROM skills
         WHERE is_custom = 0
            OR review_status = 'approved'
            OR created_by = ?
         ORDER BY category, name`
      )
      .bind(userId)
      .all<{ id: string; name: string; category: string }>();

    const skills = (result.results || []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      mastery: 0, // Default mastery - will be overridden by user data
    }));

    return NextResponse.json({ skills });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
});
