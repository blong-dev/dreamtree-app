import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db/connection';
import { getExerciseFunnel } from '@/lib/analytics/server';

// Force dynamic rendering - required for D1 access
export const dynamic = 'force-dynamic';

/**
 * Admin Exercises Page
 *
 * Detailed exercise metrics with sorting.
 */
export default async function ExercisesPage() { // code_id:129
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

  // Calculate drop-off rates and sort by highest drop-off
  const exerciseMetrics = funnel
    .filter(e => e.starts > 0)
    .map(e => ({
      ...e,
      completionRate: e.starts > 0 ? (e.completions / e.starts) * 100 : 0,
      dropOffRate: e.starts > 0 ? ((e.starts - e.completions) / e.starts) * 100 : 0,
    }))
    .sort((a, b) => b.dropOffRate - a.dropOffRate);

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>DreamTree Admin</h1>
        <a href="/admin" className="admin-nav-link">Overview</a>
        <a href="/admin/funnel" className="admin-nav-link">Funnel</a>
        <a href="/admin/exercises" className="admin-nav-link active">Exercises</a>
        <a href="/admin/tools" className="admin-nav-link">Tools</a>
        <a href="/admin/errors" className="admin-nav-link">Errors</a>
      </header>

      <main className="admin-content">
        <h2>Exercise Metrics (Last 30 Days)</h2>
        <p className="admin-subtitle">Sorted by drop-off rate (highest first)</p>

        <section className="admin-section">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Started</th>
                  <th>Completed</th>
                  <th>Drop-off</th>
                </tr>
              </thead>
              <tbody>
                {exerciseMetrics.map((e) => (
                  <tr key={e.exercise_id} className={e.dropOffRate > 40 ? 'warning-row' : ''}>
                    <td>{e.exercise_id}</td>
                    <td>{e.starts}</td>
                    <td>{e.completions}</td>
                    <td>{e.dropOffRate.toFixed(0)}%</td>
                  </tr>
                ))}
                {exerciseMetrics.length === 0 && (
                  <tr>
                    <td colSpan={4} className="admin-empty">No exercise data yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
