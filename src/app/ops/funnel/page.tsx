import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db/connection';
import { getExerciseFunnel } from '@/lib/analytics/server';

// Force dynamic rendering - required for D1 access
export const dynamic = 'force-dynamic';

/**
 * Admin Funnel Page
 *
 * Shows completion funnel by part/module/exercise.
 */
export default async function FunnelPage() { // code_id:130
  const db = getDB();

  // Check authentication
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('dt_session')?.value;

  if (!sessionId) {
    redirect('/login');
  }

  const session = await db
    .prepare('SELECT user_id FROM sessions WHERE id = ?')
    .bind(sessionId)
    .first();

  if (!session) {
    redirect('/login');
  }

  // Date range: last 30 days
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const funnel = await getExerciseFunnel(db, monthAgo, nowIso);

  // Group by part
  const parts: Record<string, typeof funnel> = {};
  for (const item of funnel) {
    const part = item.exercise_id?.split('.')[0] || 'unknown';
    if (!parts[part]) parts[part] = [];
    parts[part].push(item);
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>DreamTree Admin</h1>
        <a href="/ops" className="admin-nav-link">Overview</a>
        <a href="/ops/funnel" className="admin-nav-link active">Funnel</a>
        <a href="/ops/exercises" className="admin-nav-link">Exercises</a>
        <a href="/ops/tools" className="admin-nav-link">Tools</a>
        <a href="/ops/errors" className="admin-nav-link">Errors</a>
      </header>

      <main className="admin-content">
        <h2>Completion Funnel (Last 30 Days)</h2>

        {Object.entries(parts).sort().map(([part, exercises]) => (
          <section key={part} className="admin-section">
            <h3>Part {part}</h3>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Exercise</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {exercises.sort((a, b) => a.exercise_id.localeCompare(b.exercise_id)).map((e) => (
                    <tr key={e.exercise_id}>
                      <td>{e.exercise_id}</td>
                      <td>{e.starts}</td>
                      <td>{e.completions}</td>
                      <td>{e.starts > 0 ? ((e.completions / e.starts) * 100).toFixed(0) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {Object.keys(parts).length === 0 && (
          <p className="admin-empty">No funnel data yet. Events will appear as users progress through exercises.</p>
        )}
      </main>
    </div>
  );
}
