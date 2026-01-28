import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db/connection';
import { createDb } from '@/lib/db';


export async function GET() { // code_id:136
  try {
    const db = createDb(getDB());

    // Use the built-in getAllCompetencies method
    const competencies = await db.getAllCompetencies();

    return NextResponse.json({ competencies });
  } catch (error) {
    console.error('Error fetching competencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competencies' },
      { status: 500 }
    );
  }
}
