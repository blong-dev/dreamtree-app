/**
 * Coming Soon Page
 *
 * Shown when users try to access features not yet available in production.
 * - Logged out: Shows waitlist form
 * - Logged in (not consented): Shows consent prompt
 * - Logged in (consented): Shows "already on list" message
 */

import Link from 'next/link';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db/connection';
import { getSessionData } from '@/lib/auth';
import { WaitlistForm } from '@/components/landing/WaitlistForm';
import { ConsentPrompt } from '@/components/landing/ConsentPrompt';

export default async function ComingSoonPage() { // code_id:912
  // Check for logged-in user
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('dt_session')?.value;

  let user: { id: string; marketing_consent: number } | null = null;

  if (sessionId) {
    try {
      const db = getDB();
      const sessionData = await getSessionData(db, sessionId);

      if (sessionData) {
        // Fetch consent status (not included in standard sessionData)
        const userRow = await db
          .prepare('SELECT id, marketing_consent FROM users WHERE id = ?')
          .bind(sessionData.user.id)
          .first<{ id: string; marketing_consent: number }>();

        if (userRow) {
          user = userRow;
        }
      }
    } catch (err) {
      console.error('[ComingSoon] Error fetching user:', err);
      // Fall through to show waitlist form
    }
  }

  return (
    <div className="coming-soon">
      <div className="coming-soon-content">
        <div className="coming-soon-icon">🌱</div>
        <h1>Coming Soon</h1>
        <p>
          The DreamTree workbook is still growing. We&apos;re putting the finishing
          touches on an experience that will help you discover meaningful work.
        </p>

        {user ? (
          user.marketing_consent === 1 ? (
            // Already opted in
            <div className="consent-prompt consent-prompt-success">
              <p>You&apos;re on the list. We&apos;ll let you know when we launch.</p>
            </div>
          ) : (
            // Logged in but not opted in
            <ConsentPrompt userId={user.id} />
          )
        ) : (
          // Not logged in - show waitlist form
          <>
            <p className="coming-soon-subtitle">
              Sign up to be notified when we launch.
            </p>
            <WaitlistForm
              source="coming-soon"
              placeholder="Enter your email"
              buttonText="Notify Me"
              successMessage="We'll let you know when we launch!"
            />
          </>
        )}

        <Link href="/" className="coming-soon-home">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
