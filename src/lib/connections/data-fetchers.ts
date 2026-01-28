// DreamTree Connection Data Fetchers
// Extracted from resolver.ts for maintainability (B3 refactor)

import type { D1Database } from '@cloudflare/workers-types';
import type {
  SOAREDStory,
  RankedSkill,
  FlowActivity,
  Experience,
  CareerOption,
  BudgetData,
} from './types';

// ============================================================
// SKILL FETCHERS
// ============================================================

export async function fetchTransferableSkills(
  db: D1Database,
  userId: string,
  filter?: string
): Promise<RankedSkill[]> { // code_id:117
  let query = `
    SELECT us.id, us.skill_id, s.name, us.category, us.mastery, us.rank
    FROM user_skills us
    JOIN skills s ON us.skill_id = s.id
    WHERE us.user_id = ? AND us.category = 'transferable'
  `;

  if (filter === 'top_10_by_mastery') {
    query += ` ORDER BY us.mastery DESC, us.rank ASC LIMIT 10`;
  } else {
    query += ` ORDER BY us.rank ASC`;
  }

  const result = await db.prepare(query).bind(userId).all();

  return result.results.map((row) => ({
    id: row.id as string,
    skillId: row.skill_id as string,
    name: row.name as string,
    category: 'transferable' as const,
    mastery: row.mastery as 1 | 2 | 3 | 4 | 5,
    rank: row.rank as number,
  }));
}

export async function fetchSoftSkills(
  db: D1Database,
  userId: string
): Promise<RankedSkill[]> { // code_id:443
  const result = await db
    .prepare(
      `SELECT us.id, us.skill_id, s.name, us.category, us.mastery, us.rank
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = ? AND us.category = 'self_management'
       ORDER BY us.rank ASC`
    )
    .bind(userId)
    .all();

  return result.results.map((row) => ({
    id: row.id as string,
    skillId: row.skill_id as string,
    name: row.name as string,
    category: 'self_management' as const,
    mastery: row.mastery as 1 | 2 | 3 | 4 | 5,
    rank: row.rank as number,
  }));
}

export async function fetchAllSkills(
  db: D1Database,
  userId: string
): Promise<RankedSkill[]> { // code_id:444
  const result = await db
    .prepare(
      `SELECT us.id, us.skill_id, s.name, us.category, us.mastery, us.rank
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = ?
       ORDER BY us.category, us.rank ASC`
    )
    .bind(userId)
    .all();

  return result.results.map((row) => ({
    id: row.id as string,
    skillId: row.skill_id as string,
    name: row.name as string,
    category: row.category as 'transferable' | 'self_management' | 'knowledge',
    mastery: row.mastery as 1 | 2 | 3 | 4 | 5,
    rank: row.rank as number,
  }));
}

export async function fetchKnowledgeSkills(
  db: D1Database,
  userId: string
): Promise<RankedSkill[]> { // code_id:445
  const result = await db
    .prepare(
      `SELECT us.id, us.skill_id, s.name, us.category, us.mastery, us.rank
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = ? AND us.category = 'knowledge'
       ORDER BY us.rank ASC`
    )
    .bind(userId)
    .all();

  return result.results.map((row) => ({
    id: row.id as string,
    skillId: row.skill_id as string,
    name: row.name as string,
    category: 'knowledge' as const,
    mastery: row.mastery as 1 | 2 | 3 | 4 | 5,
    rank: row.rank as number,
  }));
}

// ============================================================
// STORY & EXPERIENCE FETCHERS
// ============================================================

export async function fetchSOAREDStories(
  db: D1Database,
  userId: string,
  filter?: string
): Promise<SOAREDStory[] | SOAREDStory | null> { // code_id:118
  const result = await db
    .prepare(
      `SELECT id, experience_id, title, situation, obstacle, action,
              result, evaluation, discovery
       FROM user_stories
       WHERE user_id = ?
       ORDER BY created_at ASC`
    )
    .bind(userId)
    .all();

  const stories = result.results.map((row) => ({
    id: row.id as string,
    experienceId: row.experience_id as string | null,
    title: row.title as string | null,
    situation: row.situation as string,
    obstacle: row.obstacle as string,
    action: row.action as string,
    result: row.result as string,
    evaluation: row.evaluation as string,
    discovery: row.discovery as string,
  }));

  // Handle index_N filter to return single story at index N
  if (filter && filter.startsWith('index_')) {
    const indexStr = filter.replace('index_', '');
    const index = parseInt(indexStr, 10);
    if (!isNaN(index) && index >= 0 && index < stories.length) {
      return stories[index];
    }
    return null; // Out of bounds or invalid index
  }

  return stories;
}

export async function fetchExperiences(
  db: D1Database,
  userId: string,
  type?: 'job' | 'education'
): Promise<Experience[]> { // code_id:446
  // Use parameterized query to prevent SQL injection (IMP-037)
  // Type is validated to only allow 'job' or 'education'
  const validTypes = ['job', 'education'] as const;
  const safeType = type && validTypes.includes(type) ? type : null;

  let result;
  if (safeType) {
    result = await db
      .prepare(
        `SELECT id, title, organization, experience_type, start_date, end_date, description
         FROM user_experiences
         WHERE user_id = ? AND experience_type = ?
         ORDER BY start_date DESC`
      )
      .bind(userId, safeType)
      .all();
  } else {
    result = await db
      .prepare(
        `SELECT id, title, organization, experience_type, start_date, end_date, description
         FROM user_experiences
         WHERE user_id = ?
         ORDER BY start_date DESC`
      )
      .bind(userId)
      .all();
  }

  return result.results.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    organization: row.organization as string | null,
    type: row.experience_type as 'job' | 'education' | 'project' | 'other',
    startDate: row.start_date as string | null,
    endDate: row.end_date as string | null,
    description: row.description as string | null,
  }));
}

// ============================================================
// FLOW & ACTIVITY FETCHERS
// ============================================================

export async function fetchFlowActivities(
  db: D1Database,
  userId: string,
  filter?: string
): Promise<FlowActivity[]> { // code_id:119
  let query = `
    SELECT id, activity, energy, focus, logged_date
    FROM user_flow_logs
    WHERE user_id = ?
  `;

  if (filter === 'high_energy_high_captivation') {
    query += ` AND energy >= 1 AND focus >= 4`;
  }

  query += ` ORDER BY logged_date DESC`;

  const result = await db.prepare(query).bind(userId).all();

  return result.results.map((row) => ({
    id: row.id as string,
    activity: row.activity as string,
    energy: row.energy as -2 | -1 | 0 | 1 | 2,
    focus: row.focus as 1 | 2 | 3 | 4 | 5,
    loggedDate: row.logged_date as string,
    isHighFlow: (row.energy as number) >= 1 && (row.focus as number) >= 4,
  }));
}

// ============================================================
// VALUES FETCHERS
// ============================================================

export async function fetchValuesCompass(
  db: D1Database,
  userId: string
): Promise<string | null> {
  const result = await db
    .prepare(`SELECT compass_statement FROM user_values WHERE user_id = ?`)
    .bind(userId)
    .first<{ compass_statement: string | null }>();

  return result?.compass_statement || null;
}

export async function fetchWorkValues(
  db: D1Database,
  userId: string
): Promise<string | null> {
  const result = await db
    .prepare(`SELECT work_values FROM user_values WHERE user_id = ?`)
    .bind(userId)
    .first<{ work_values: string | null }>();

  return result?.work_values || null;
}

export async function fetchLifeValues(
  db: D1Database,
  userId: string
): Promise<string | null> {
  const result = await db
    .prepare(`SELECT life_values FROM user_values WHERE user_id = ?`)
    .bind(userId)
    .first<{ life_values: string | null }>();

  return result?.life_values || null;
}

// ============================================================
// CAREER FETCHERS
// ============================================================

export async function fetchCareerOptions(
  db: D1Database,
  userId: string
): Promise<CareerOption[]> { // code_id:449
  const result = await db
    .prepare(
      `SELECT id, title, description, rank, coherence_score,
              work_needs_score, life_needs_score, unknowns_score
       FROM user_career_options
       WHERE user_id = ?
       ORDER BY rank ASC`
    )
    .bind(userId)
    .all();

  return result.results.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    rank: row.rank as 1 | 2 | 3,
    coherenceScore: row.coherence_score as number | null,
    workNeedsScore: row.work_needs_score as number | null,
    lifeNeedsScore: row.life_needs_score as number | null,
    unknownsScore: row.unknowns_score as number | null,
  }));
}

// ============================================================
// BUDGET & LOCATION FETCHERS
// ============================================================

export async function fetchBudget(
  db: D1Database,
  userId: string
): Promise<BudgetData | null> {
  const result = await db
    .prepare(
      `SELECT monthly_expenses, annual_needs, hourly_batna, benefits_needed
       FROM user_budget WHERE user_id = ?`
    )
    .bind(userId)
    .first<{
      monthly_expenses: number | null;
      annual_needs: number | null;
      hourly_batna: number | null;
      benefits_needed: string | null;
    }>();

  if (!result || !result.monthly_expenses) return null;

  return {
    monthlyExpenses: result.monthly_expenses,
    annualNeeds: result.annual_needs || 0,
    hourlyBatna: result.hourly_batna || 0,
    benefitsNeeded: result.benefits_needed,
  };
}

export async function fetchLocations(
  db: D1Database,
  userId: string
): Promise<Array<{ id: string; name: string; rank: number }>> {
  const result = await db
    .prepare(
      `SELECT id, location_name, rank
       FROM user_locations
       WHERE user_id = ?
       ORDER BY rank ASC`
    )
    .bind(userId)
    .all();

  return result.results.map((row) => ({
    id: row.id as string,
    name: row.location_name as string,
    rank: row.rank as number,
  }));
}

// ============================================================
// SETTINGS & PROFILE FETCHERS
// ============================================================

export async function fetchMBTICode(
  db: D1Database,
  userId: string
): Promise<string | null> {
  const result = await db
    .prepare(`SELECT personality_type FROM user_settings WHERE user_id = ?`)
    .bind(userId)
    .first<{ personality_type: string | null }>();

  return result?.personality_type || null;
}

export async function fetchLifeDashboard(
  db: D1Database,
  userId: string
): Promise<{ work: number; play: number; love: number; health: number } | null> {
  const result = await db
    .prepare(
      `SELECT life_dashboard_work, life_dashboard_play,
              life_dashboard_love, life_dashboard_health
       FROM user_profile WHERE user_id = ?`
    )
    .bind(userId)
    .first<{
      life_dashboard_work: number | null;
      life_dashboard_play: number | null;
      life_dashboard_love: number | null;
      life_dashboard_health: number | null;
    }>();

  if (!result || result.life_dashboard_work === null) return null;

  return {
    work: result.life_dashboard_work,
    play: result.life_dashboard_play || 0,
    love: result.life_dashboard_love || 0,
    health: result.life_dashboard_health || 0,
  };
}

export async function fetchProfileText(
  db: D1Database,
  userId: string,
  field?: string
): Promise<Record<string, string | null> | string | null> {
  // If specific field requested, return just that
  if (field) { // code_id:454
    const validFields = [
      'identity_story',
      'allegory',
      'headline',
      'summary',
      'value_proposition',
    ];
    if (!validFields.includes(field)) return null;

    const result = await db
      .prepare(`SELECT ${field} FROM user_profile WHERE user_id = ?`)
      .bind(userId)
      .first<Record<string, string | null>>();

    return result?.[field] || null;
  }

  // Otherwise return all profile text fields
  const result = await db
    .prepare(
      `SELECT identity_story, allegory, headline, summary, value_proposition
       FROM user_profile WHERE user_id = ?`
    )
    .bind(userId)
    .first<{
      identity_story: string | null;
      allegory: string | null;
      headline: string | null;
      summary: string | null;
      value_proposition: string | null;
    }>();

  if (!result) return null;

  return {
    identityStory: result.identity_story,
    allegory: result.allegory,
    headline: result.headline,
    summary: result.summary,
    valueProposition: result.value_proposition,
  };
}

// ============================================================
// COMPETENCY & IDEA FETCHERS
// ============================================================

export async function fetchCompetencyScores(
  db: D1Database,
  userId: string
): Promise<Array<{ competencyId: number; level: number; notes: string | null }>> {
  const result = await db
    .prepare(
      `SELECT competency_id, level, notes
       FROM user_competency_scores
       WHERE user_id = ?
       ORDER BY competency_id ASC`
    )
    .bind(userId)
    .all();

  return result.results.map((row) => ({
    competencyId: row.competency_id as number,
    level: row.level as number,
    notes: row.notes as string | null,
  }));
}

export async function fetchIdeaTrees(
  db: D1Database,
  userId: string
): Promise<Array<{ id: string; title: string; nodes: unknown[]; edges: unknown[] }>> {
  // Fetch trees
  const trees = await db
    .prepare(
      `SELECT id, title, created_at
       FROM user_idea_trees
       WHERE user_id = ?
       ORDER BY created_at ASC`
    )
    .bind(userId)
    .all();

  // For each tree, fetch nodes and edges
  const result = await Promise.all(
    trees.results.map(async (tree) => { // code_id:456
      const treeId = tree.id as string;

      const nodes = await db
        .prepare(
          `SELECT id, label, x, y, parent_id
           FROM user_idea_nodes
           WHERE tree_id = ?`
        )
        .bind(treeId)
        .all();

      const edges = await db
        .prepare(
          `SELECT id, source_node_id, target_node_id
           FROM user_idea_edges
           WHERE tree_id = ?`
        )
        .bind(treeId)
        .all();

      return {
        id: treeId,
        title: tree.title as string,
        nodes: nodes.results,
        edges: edges.results,
      };
    })
  );

  return result;
}

// ============================================================
// LIST FETCHERS
// ============================================================

export async function fetchUserLists(
  db: D1Database,
  userId: string,
  listType?: string
): Promise<Array<{ id: string; name: string; type: string; items: Array<{ id: string; content: string; rank: number }> }>> {
  // Use parameterized query to prevent SQL injection (IMP-038)
  // Validate listType against allowed patterns (alphanumeric + underscore only)
  const safeListType = listType && /^[a-zA-Z0-9_]+$/.test(listType) ? listType : null;

  let lists;
  if (safeListType) { // code_id:121
    lists = await db
      .prepare(
        `SELECT id, name, list_type
         FROM user_lists
         WHERE user_id = ? AND list_type = ?
         ORDER BY created_at ASC`
      )
      .bind(userId, safeListType)
      .all();
  } else {
    lists = await db
      .prepare(
        `SELECT id, name, list_type
         FROM user_lists
         WHERE user_id = ?
         ORDER BY created_at ASC`
      )
      .bind(userId)
      .all();
  }

  // For each list, fetch items
  const result = await Promise.all(
    lists.results.map(async (list) => {
      const listId = list.id as string;

      const items = await db
        .prepare(
          `SELECT id, content, rank
           FROM user_list_items
           WHERE list_id = ?
           ORDER BY rank ASC`
        )
        .bind(listId)
        .all();

      return {
        id: listId,
        name: list.name as string,
        type: list.list_type as string,
        items: items.results.map((item) => ({
          id: item.id as string,
          content: item.content as string,
          rank: item.rank as number,
        })),
      };
    })
  );

  return result;
}
