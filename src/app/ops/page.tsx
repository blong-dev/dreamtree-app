import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db/connection';

// Force dynamic rendering - required for D1 access
export const dynamic = 'force-dynamic';
import {
  countUniqueUsers,
  countEventsByType,
  getExerciseFunnel,
  getToolUsage,
} from '@/lib/analytics/server';

/**
 * Admin Dashboard Overview
 *
 * Shows key metrics: DAU, WAU, MAU, completion funnel, top drop-offs, tool usage.
 * Protected route - requires admin access.
 */
export default async function AdminPage() { // code_id:131
  const db = getDB();

  // Check authentication
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('dt_session')?.value;

  if (!sessionId) {
    redirect('/login');
  }

  // Verify session and check admin status
  // For now, any authenticated user can view admin (TODO: add admin role)
  const session = await db
    .prepare('SELECT user_id FROM sessions WHERE id = ?')
    .bind(sessionId)
    .first();

  if (!session) {
    redirect('/login');
  }

  // Date ranges
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  // Fetch metrics
  const [dau, wau, mau, eventCounts, funnel, toolUsage] = await Promise.all([
    countUniqueUsers(db, todayStart, nowIso),
    countUniqueUsers(db, weekAgo, nowIso),
    countUniqueUsers(db, monthAgo, nowIso),
    countEventsByType(db, monthAgo, nowIso),
    getExerciseFunnel(db, monthAgo, nowIso),
    getToolUsage(db, monthAgo, nowIso),
  ]);

  // Calculate total users (from users table)
  const totalUsersResult = await db
    .prepare('SELECT COUNT(*) as count FROM users')
    .first();
  const totalUsers = (totalUsersResult?.count as number) || 0;

  // Top drop-off exercises (high start, low completion)
  const dropOffExercises = funnel
    .filter(e => e.starts > 0)
    .map(e => ({
      ...e,
      dropOffRate: e.starts > 0 ? ((e.starts - e.completions) / e.starts) * 100 : 0,
    }))
    .sort((a, b) => b.dropOffRate - a.dropOffRate)
    .slice(0, 5);

  // Top tools by usage
  const topTools = toolUsage.slice(0, 5);

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>DreamTree Admin</h1>
        <a href="/ops" className="admin-nav-link active">Overview</a>
        <a href="/ops/funnel" className="admin-nav-link">Funnel</a>
        <a href="/ops/exercises" className="admin-nav-link">Exercises</a>
        <a href="/ops/tools" className="admin-nav-link">Tools</a>
        <a href="/ops/errors" className="admin-nav-link">Errors</a>
      </header>

      <main className="admin-content">
        {/* Key Metrics */}
        <section className="admin-metrics">
          <div className="metric-card">
            <span className="metric-label">DAU</span>
            <span className="metric-value">{dau}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">WAU</span>
            <span className="metric-value">{wau}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">MAU</span>
            <span className="metric-value">{mau}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Total Users</span>
            <span className="metric-value">{totalUsers}</span>
          </div>
        </section>

        {/* Event Counts */}
        <section className="admin-section">
          <h2>Events (Last 30 Days)</h2>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(eventCounts).map(([type, count]) => (
                  <tr key={type}>
                    <td>{type}</td>
                    <td>{count}</td>
                  </tr>
                ))}
                {Object.keys(eventCounts).length === 0 && (
                  <tr>
                    <td colSpan={2} className="admin-empty">No events recorded yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Drop-off Exercises */}
        <section className="admin-section">
          <h2>Top Drop-off Exercises</h2>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Starts</th>
                  <th>Completions</th>
                  <th>Drop-off</th>
                </tr>
              </thead>
              <tbody>
                {dropOffExercises.map((e) => (
                  <tr key={e.exercise_id}>
                    <td>{e.exercise_id}</td>
                    <td>{e.starts}</td>
                    <td>{e.completions}</td>
                    <td>{e.dropOffRate.toFixed(0)}%</td>
                  </tr>
                ))}
                {dropOffExercises.length === 0 && (
                  <tr>
                    <td colSpan={4} className="admin-empty">No exercise data yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Tools */}
        <section className="admin-section">
          <h2>Most Used Tools</h2>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Opens</th>
                  <th>Submits</th>
                  <th>Save Rate</th>
                </tr>
              </thead>
              <tbody>
                {topTools.map((t) => (
                  <tr key={t.tool_id}>
                    <td>{t.tool_id}</td>
                    <td>{t.opens}</td>
                    <td>{t.submits}</td>
                    <td>{t.opens > 0 ? ((t.submits / t.opens) * 100).toFixed(0) : 0}%</td>
                  </tr>
                ))}
                {topTools.length === 0 && (
                  <tr>
                    <td colSpan={4} className="admin-empty">No tool data yet</td>
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
