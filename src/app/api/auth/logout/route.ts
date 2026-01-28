/**
 * POST /api/auth/logout
 *
 * Clear session and logout user.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db/connection';
import { deleteSession } from '@/lib/auth';
import '@/types/database'; // CloudflareEnv augmentation


export async function POST() { // code_id:134
  const clearCookie = async () => {
    const cookieStore = await cookies();
    cookieStore.set('dt_session', '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
    });
  };

  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('dt_session')?.value;

    if (sessionId) {
      // Delete session from database
      const db = getDB();
      await deleteSession(db, sessionId);
    }

    // Clear session cookie using set() with maxAge: 0
    await clearCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookie even if DB delete fails
    await clearCookie();

    return NextResponse.json({ success: true });
  }
}
