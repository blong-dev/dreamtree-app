import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db/connection';
import { queryEvents } from '@/lib/analytics/server';

// Force dynamic rendering - required for D1 access
export const dynamic = 'force-dynamic';

/**
 * Admin Errors Page
 *
 * Recent error events for debugging.
 */
export default async function ErrorsPage() { // code_id:128
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

  // Get recent error events
  const errors = await queryEvents(db, {
    eventType: 'error',
    limit: 100,
  });

  // Parse event data for display
  const errorRows = errors.map(e => {
    let data: { error_endpoint?: string; error_status?: number } = {};
    try {
      data = e.event_data ? JSON.parse(e.event_data) : {};
    } catch {
      // Ignore parse errors
    }
    return {
      id: e.id,
      timestamp: e.created_at,
      endpoint: data.error_endpoint || e.target_id || 'unknown',
      status: data.error_status || 500,
      userId: e.user_id,
    };
  });

  // Group by endpoint for summary
  const byEndpoint: Record<string, number> = {};
  for (const err of errorRows) {
    byEndpoint[err.endpoint] = (byEndpoint[err.endpoint] || 0) + 1;
  }

  const endpointSummary = Object.entries(byEndpoint)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>DreamTree Admin</h1>
        <a href="/admin" className="admin-nav-link">Overview</a>
        <a href="/admin/funnel" className="admin-nav-link">Funnel</a>
        <a href="/admin/exercises" className="admin-nav-link">Exercises</a>
        <a href="/admin/tools" className="admin-nav-link">Tools</a>
        <a href="/admin/errors" className="admin-nav-link active">Errors</a>
      </header>

      <main className="admin-content">
        <h2>Error Log</h2>

        {/* Summary by endpoint */}
        <section className="admin-section">
          <h3>Errors by Endpoint</h3>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {endpointSummary.map(([endpoint, count]) => (
                  <tr key={endpoint}>
                    <td>{endpoint}</td>
                    <td>{count}</td>
                  </tr>
                ))}
                {endpointSummary.length === 0 && (
                  <tr>
                    <td colSpan={2} className="admin-empty">No errors recorded</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent errors */}
        <section className="admin-section">
          <h3>Recent Errors (Last 100)</h3>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Endpoint</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {errorRows.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.timestamp).toLocaleString()}</td>
                    <td>{e.status}</td>
                    <td>{e.endpoint}</td>
                    <td>{e.userId ? e.userId.slice(0, 8) + '...' : 'anonymous'}</td>
                  </tr>
                ))}
                {errorRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="admin-empty">No errors recorded</td>
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
