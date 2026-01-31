import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { D1Database } from '@cloudflare/workers-types';
import { getDB } from '@/lib/db/connection';
import { getSessionData, decryptPII } from '@/lib/auth';
import { createDb } from '@/lib/db';
import { getDailyDos } from '@/lib/dailyDos';
import {
  DashboardPage,
  ProgressMetricData,
  TOCPartData,
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

// Static part titles (small fixed set)
const PART_TITLES: Record<number, string> = {
  1: 'Part 1: Roots',
  2: 'Part 2: Trunk',
  3: 'Part 3: Branches',
};

// Get TOC data for dashboard
async function getTOCData(db: D1Database, userId: string): Promise<TOCPartData[]> { // code_id:145
  try {
    // 1. Get all unique exercises from stem
    const allExercises = await db
      .prepare(`
        SELECT DISTINCT part, module, exercise,
               part || '.' || module || '.' || exercise as exercise_id,
               MIN(sequence) as first_seq
        FROM stem
        GROUP BY part, module, exercise
        ORDER BY first_seq
      `)
      .all<{ part: number; module: number; exercise: number; exercise_id: string; first_seq: number }>();

    // 2. Get titles from content_blocks
    // First try headings at activity=0, then fall back to first instruction
    const titleRows = await db
      .prepare(`
        WITH exercise_headings AS (
          SELECT s.part, s.module, s.exercise,
                 s.part || '.' || s.module || '.' || s.exercise as exercise_id,
                 cb.content as title,
                 MIN(s.sequence) as first_seq
          FROM stem s
          JOIN content_blocks cb ON s.content_id = cb.id AND cb.is_active = 1
          WHERE s.block_type = 'content'
            AND cb.content_type = 'heading'
            AND s.activity = 0
          GROUP BY s.part, s.module, s.exercise
        ),
        exercise_instructions AS (
          SELECT s.part, s.module, s.exercise,
                 s.part || '.' || s.module || '.' || s.exercise as exercise_id,
                 SUBSTR(cb.content, 1, 60) as title,
                 MIN(s.sequence) as first_seq
          FROM stem s
          JOIN content_blocks cb ON s.content_id = cb.id AND cb.is_active = 1
          WHERE s.block_type = 'content'
            AND cb.content_type = 'instruction'
            AND s.activity = 0
          GROUP BY s.part, s.module, s.exercise
        )
        SELECT exercise_id, title, first_seq FROM exercise_headings
        UNION ALL
        SELECT ei.exercise_id, ei.title, ei.first_seq
        FROM exercise_instructions ei
        WHERE ei.exercise_id NOT IN (SELECT exercise_id FROM exercise_headings)
        ORDER BY first_seq
      `)
      .all<{ exercise_id: string; title: string; first_seq: number }>();

    // Build title map from query results
    const titleMap = new Map<string, string>();
    for (const row of titleRows.results || []) {
      // Clean up instruction titles - trim trailing ellipsis if cut mid-word
      let title = row.title;
      if (title.length >= 60 && !title.endsWith('.')) {
        const lastSpace = title.lastIndexOf(' ');
        if (lastSpace > 40) {
          title = title.substring(0, lastSpace) + '...';
        }
      }
      titleMap.set(row.exercise_id, title);
    }

    // 3. Get completed exercises for this user
    const completed = await db
      .prepare(`
        SELECT DISTINCT exercise_id
        FROM user_responses
        WHERE user_id = ?
      `)
      .bind(userId)
      .all<{ exercise_id: string }>();

    const completedSet = new Set(completed.results?.map(r => r.exercise_id) || []);
    const exercises = allExercises.results || [];

    // 4. Build hierarchy with status calculation
    // Create ordered list of exercise IDs
    const orderedExerciseIds = exercises.map(e => e.exercise_id);

    // Calculate exercise statuses
    const exerciseStatuses = new Map<string, 'locked' | 'available' | 'in-progress' | 'complete'>();

    for (let i = 0; i < orderedExerciseIds.length; i++) {
      const exerciseId = orderedExerciseIds[i];

      if (completedSet.has(exerciseId)) {
        exerciseStatuses.set(exerciseId, 'complete');
      } else if (i === 0) {
        // First exercise is always available if not complete
        exerciseStatuses.set(exerciseId, 'available');
      } else {
        // Check if previous exercise is complete
        const prevExerciseId = orderedExerciseIds[i - 1];
        if (completedSet.has(prevExerciseId)) {
          exerciseStatuses.set(exerciseId, 'available');
        } else {
          exerciseStatuses.set(exerciseId, 'locked');
        }
      }
    }

    // Group exercises by part and module
    const partMap = new Map<number, Map<number, typeof exercises>>();

    for (const ex of exercises) {
      if (!partMap.has(ex.part)) {
        partMap.set(ex.part, new Map());
      }
      const moduleMap = partMap.get(ex.part)!;
      if (!moduleMap.has(ex.module)) {
        moduleMap.set(ex.module, []);
      }
      moduleMap.get(ex.module)!.push(ex);
    }

    // Build TOCPartData array
    const tocParts: TOCPartData[] = [];

    for (const [partNum, moduleMap] of [...partMap.entries()].sort((a, b) => a[0] - b[0])) {
      const modules: TOCPartData['modules'] = [];
      let partCompletedCount = 0;
      let partTotalCount = 0;

      for (const [moduleNum, moduleExercises] of [...moduleMap.entries()].sort((a, b) => a[0] - b[0])) {
        const moduleId = `${partNum}.${moduleNum}`;
        // Get module title from first exercise (exercise=0 is typically the module intro)
        const moduleTitle = titleMap.get(`${partNum}.${moduleNum}.0`) || `Module ${moduleNum}`;

        const exerciseData = moduleExercises.map(ex => ({
          id: ex.exercise_id,
          title: titleMap.get(ex.exercise_id) || `Exercise ${ex.exercise}`,
          status: exerciseStatuses.get(ex.exercise_id) || 'locked' as const,
        }));

        // Calculate module status from exercises
        const moduleCompletedCount = exerciseData.filter(e => e.status === 'complete').length;
        const moduleHasAvailable = exerciseData.some(e => e.status === 'available');
        const moduleHasInProgress = exerciseData.some(e => e.status === 'in-progress');

        let moduleStatus: 'locked' | 'available' | 'in-progress' | 'complete';
        if (moduleCompletedCount === exerciseData.length) {
          moduleStatus = 'complete';
        } else if (moduleHasInProgress || moduleHasAvailable) {
          moduleStatus = 'in-progress';
        } else if (exerciseData[0]?.status === 'available') {
          moduleStatus = 'available';
        } else {
          moduleStatus = 'locked';
        }

        modules.push({
          id: moduleId,
          title: moduleTitle,
          status: moduleStatus,
          exercises: exerciseData,
        });

        partCompletedCount += moduleCompletedCount;
        partTotalCount += exerciseData.length;
      }

      // Calculate part status and progress
      const partProgress = partTotalCount > 0 ? Math.round((partCompletedCount / partTotalCount) * 100) : 0;
      const partHasInProgress = modules.some(m => m.status === 'in-progress');
      const partAllComplete = modules.every(m => m.status === 'complete');
      const partHasAvailable = modules.some(m => m.status === 'available');

      let partStatus: 'locked' | 'available' | 'in-progress' | 'complete';
      if (partAllComplete && modules.length > 0) {
        partStatus = 'complete';
      } else if (partHasInProgress) {
        partStatus = 'in-progress';
      } else if (partHasAvailable || modules[0]?.status === 'available') {
        partStatus = 'available';
      } else {
        partStatus = 'locked';
      }

      tocParts.push({
        id: String(partNum),
        title: PART_TITLES[partNum] || `Part ${partNum}`,
        progress: partProgress,
        status: partStatus,
        modules,
      });
    }

    return tocParts;
  } catch (error) {
    console.error('Error getting TOC data:', error);
    // Return minimal fallback
    return [
      {
        id: '1',
        title: 'Part 1: Roots',
        progress: 0,
        status: 'available',
        modules: [],
      },
      {
        id: '2',
        title: 'Part 2: Trunk',
        progress: 0,
        status: 'locked',
        modules: [],
      },
      {
        id: '3',
        title: 'Part 3: Branches',
        progress: 0,
        status: 'locked',
        modules: [],
      },
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
