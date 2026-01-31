/**
 * POST /api/onboarding
 *
 * Save user onboarding preferences (name, colors, font).
 *
 * B2: Standardized to use withAuth pattern (AUDIT-001)
 */

import { NextResponse } from 'next/server';
import { withAuth, encryptPII } from '@/lib/auth';
import '@/types/database'; // CloudflareEnv augmentation


interface OnboardingBody {
  name: string;
  backgroundColor: string;
  textColor: string;
  font: string;
  textSize?: number;
  animationSpeed?: string;
}

export const POST = withAuth(async (request, { userId, db, sessionId }) => {
  try {
    const body: OnboardingBody = await request.json();
    const { name, backgroundColor, textColor, font, textSize, animationSpeed } = body;

    // Validate required fields
    if (!name || !backgroundColor || !textColor || !font) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const sizeValue = textSize ?? 1.0;
    const speedValue = animationSpeed ?? 'normal';

    // Encrypt display_name before storing (IMP-048)
    const encryptedName = await encryptPII(db, sessionId, name.trim());

    // Update user_profile with encrypted name
    await db
      .prepare(
        'UPDATE user_profile SET display_name = ?, updated_at = ? WHERE user_id = ?'
      )
      .bind(encryptedName, now, userId)
      .run();

    // Update user_settings with visual preferences
    await db
      .prepare(
        `UPDATE user_settings
         SET background_color = ?, text_color = ?, font = ?, text_size = ?, animation_speed = ?, updated_at = ?
         WHERE user_id = ?`
      )
      .bind(backgroundColor, textColor, font, sizeValue, speedValue, now, userId)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
});
