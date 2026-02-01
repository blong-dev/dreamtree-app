import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDB } from '@/lib/db/connection';
import { getSessionData, decryptPII } from '@/lib/auth';
import { createDb } from '@/lib/db';
import { getDailyDos } from '@/lib/dailyDos';
import { getTOCData } from '@/lib/toc/get-toc-data';
import {
  DashboardPage,
  ProgressMetricData,
  UserPreview,
  BackgroundColorId,
  TextColorId,
  FontFamilyId,
} from '@/components/dashboard';
import { LandingPage } from '@/components/landing';


// Get user's current exercise (first uncompleted)
async function getCurrentExerciseId(db: ReturnType<typeof createDb>, userId: string): Promise<string> { // code_id:143
  try {
    const allExercises = await db.raw
      .prepare(
        `SELECT DISTINCT part || '.' || module || '.' || exercise as exercise_id
         FROM stem
         ORDER BY part, module, exercise`
      )
      .all<{ exercise_id: string }>();

    const completedExercises = await db.raw
      .prepare(
        `SELECT DISTINCT exercise_id
         FROM user_responses
         WHERE user_id = ?`
      )
      .bind(userId)
      .all<{ exercise_id: string }>();

    const completedIds = new Set(
      completedExercises.results?.map(r => r.exercise_id) || []
    );

    if (allExercises.results) {
      for (const ex of allExercises.results) {
        if (!completedIds.has(ex.exercise_id)) {
          return ex.exercise_id;
        }
      }
    }
  } catch (error) {
    console.error('Error getting current exercise:', error);
  }

  return '1.1.1';
}

// Get progress metrics for dashboard
async function getProgressMetrics(db: ReturnType<typeof createDb>, userId: string): Promise<ProgressMetricData[]> { // code_id:144
  try {
    // Get total exercises and completed count
    const totalExercises = await db.raw
      .prepare(
        `SELECT COUNT(DISTINCT part || '.' || module || '.' || exercise) as count
         FROM stem`
      )
      .first<{ count: number }>();

    const completedExercises = await db.raw
      .prepare(
        `SELECT COUNT(DISTINCT exercise_id) as count
         FROM user_responses WHERE user_id = ?`
      )
      .bind(userId)
      .first<{ count: number }>();

    const total = totalExercises?.count || 100;
    const completed = completedExercises?.count || 0;
    const percentage = Math.round((completed / total) * 100);

    // Get SOARED story count (schema consolidation: prompts now in tools table)
    const soaredCount = await db.raw
      .prepare(
        `SELECT COUNT(*) as count FROM user_responses ur
         JOIN tools t ON ur.tool_id = t.id
         WHERE ur.user_id = ? AND t.tool_type = 'textarea'`
      )
      .bind(userId)
      .first<{ count: number }>();

    return [
      { value: `${percentage}%`, label: 'Workbook Complete' },
      { value: soaredCount?.count || 0, label: 'SOARED Stories' },
      { value: completed, label: 'Exercises Done' },
      { value: 1, label: 'Day Streak' },
    ];
  } catch (error) {
    console.error('Error getting progress metrics:', error);
    return [
      { value: '0%', label: 'Workbook Complete' },
      { value: 0, label: 'SOARED Stories' },
      { value: 0, label: 'Exercises Done' },
      { value: 0, label: 'Day Streak' },
    ];
  }
}

export default async function HomePage() { // code_id:142
  // Get session from cookie
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('dt_session')?.value;

  // Show landing page for unauthenticated users
  if (!sessionId) {
    return <LandingPage />;
  }

  const rawDb = getDB();
  const sessionData = await getSessionData(rawDb, sessionId);

  // Show landing page if session is invalid
  if (!sessionData) {
    return <LandingPage />;
  }

  // Check if user has completed onboarding (has display name)
  const profile = await rawDb
    .prepare('SELECT display_name FROM user_profile WHERE user_id = ?')
    .bind(sessionData.user.id)
    .first<{ display_name: string | null }>();

  if (!profile?.display_name) {
    redirect('/onboarding');
  }

  // Decrypt display_name (it's encrypted PII)
  const decryptedName = await decryptPII(rawDb, sessionId, profile.display_name);

  const db = createDb(rawDb);
  const userId = sessionData.user.id;

  // Fetch data in parallel
  const [currentExerciseId, progressMetrics, tocParts] = await Promise.all([
    getCurrentExerciseId(db, userId),
    getProgressMetrics(db, userId),
    getTOCData(rawDb, userId),
  ]);

  // Build user preview with safe defaults
  const userPreview: UserPreview = {
    name: decryptedName || 'User',
    topSkills: {
      transferable: null,
      selfManagement: null,
      knowledge: null,
    },
    backgroundColor: (sessionData.settings?.background_color || 'ivory') as BackgroundColorId,
    textColor: (sessionData.settings?.text_color || 'charcoal') as TextColorId,
    fontFamily: (sessionData.settings?.font || 'inter') as FontFamilyId,
    textSize: sessionData.settings?.text_size ?? 1.0,
  };

  return (
    <DashboardPage
      userName={decryptedName || 'User'}
      userPreview={userPreview}
      dailyDos={getDailyDos(currentExerciseId)}
      progressMetrics={progressMetrics}
      tocParts={tocParts}
      currentExerciseId={currentExerciseId}
    />
  );
}
