/**
 * GET /api/profile/export
 * Export all user data for download.
 */

import { NextResponse } from 'next/server';
import { withAuth, decryptPII, isEncrypted } from '@/lib/auth';

export const GET = withAuth(async (_request, { userId, db, sessionId }) => {
  try {
    // Fetch all user data including email
    const [profile, settings, values, skills, responses, stories, experiences, emails] = await Promise.all([
      db.prepare('SELECT * FROM user_profile WHERE user_id = ?').bind(userId).first(),
      db.prepare('SELECT * FROM user_settings WHERE user_id = ?').bind(userId).first(),
      db.prepare('SELECT * FROM user_values WHERE user_id = ?').bind(userId).first(),
      db.prepare('SELECT us.*, s.name as skill_name FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.user_id = ?').bind(userId).all(),
      db.prepare('SELECT * FROM user_responses WHERE user_id = ?').bind(userId).all(),
      db.prepare('SELECT * FROM user_stories WHERE user_id = ?').bind(userId).all(),
      db.prepare('SELECT * FROM user_experiences WHERE user_id = ?').bind(userId).all(),
      db.prepare('SELECT email, is_active FROM emails WHERE user_id = ?').bind(userId).all<{ email: string; is_active: number }>(),
    ]);

    // Decrypt PII fields (IMP-048)
    const decryptedDisplayName = profile?.display_name
      ? await decryptPII(db, sessionId, profile.display_name as string)
      : null;

    // Decrypt emails (may be encrypted or plaintext for legacy accounts)
    const decryptedEmails = await Promise.all(
      (emails.results || []).map(async (e) => ({
        email: isEncrypted(e.email) ? await decryptPII(db, sessionId, e.email) : e.email,
        is_active: e.is_active,
      }))
    );

    // Decrypt PII tool responses (budget, contacts)
    // IDs updated after schema consolidation (tools now 200001+)
    const PII_TOOL_IDS = new Set([200006, 200018, 200021]);
    const decryptedResponses = await Promise.all(
      (responses.results || []).map(async (r: { tool_id?: number; response_text?: string }) => {
        if (r.tool_id && PII_TOOL_IDS.has(r.tool_id) && r.response_text) {
          const decrypted = await decryptPII(db, sessionId, r.response_text);
          return { ...r, response_text: decrypted };
        }
        return r;
      })
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: profile ? { ...profile, display_name: decryptedDisplayName } : null,
      settings: settings || null,
      values: values || null,
      skills: skills.results || [],
      responses: decryptedResponses,
      stories: stories.results || [],
      experiences: experiences.results || [],
      emails: decryptedEmails,
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting profile:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
});
