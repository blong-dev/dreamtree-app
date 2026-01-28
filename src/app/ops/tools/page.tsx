import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db/connection';
import { getToolUsage } from '@/lib/analytics/server';

// Force dynamic rendering - required for D1 access
export const dynamic = 'force-dynamic';

/**
 * Admin Tools Page
 *
 * Tool usage statistics.
 */
export default async function ToolsPage() { // code_id:132
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

  const toolUsage = await getToolUsage(db, monthAgo, nowIso);

  // Calculate save rates
  const toolMetrics = toolUsage.map(t => ({
    ...t,
    saveRate: t.opens > 0 ? (t.submits / t.opens) * 100 : 0,
  }));

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>DreamTree Admin</h1>
        <a href="/ops" className="admin-nav-link">Overview</a>
        <a href="/ops/funnel" className="admin-nav-link">Funnel</a>
        <a href="/ops/exercises" className="admin-nav-link">Exercises</a>
        <a href="/ops/tools" className="admin-nav-link active">Tools</a>
        <a href="/ops/errors" className="admin-nav-link">Errors</a>
      </header>

      <main className="admin-content">
        <h2>Tool Usage (Last 30 Days)</h2>
        <p className="admin-subtitle">Sorted by submits (highest first)</p>

        <section className="admin-section">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tool ID</th>
                  <th>Opens</th>
                  <th>Submits</th>
                  <th>Save Rate</th>
                </tr>
              </thead>
              <tbody>
                {toolMetrics.map((t) => (
                  <tr key={t.tool_id} className={t.saveRate < 60 ? 'warning-row' : ''}>
                    <td>{t.tool_id}</td>
                    <td>{t.opens}</td>
                    <td>{t.submits}</td>
                    <td>{t.saveRate.toFixed(0)}%</td>
                  </tr>
                ))}
                {toolMetrics.length === 0 && (
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
