/**
 * Domain Writers
 *
 * After saving tool JSON to user_responses, these functions
 * parse the JSON and write normalized data to domain tables.
 * This enables connections to pre-populate downstream tools.
 *
 * Note: Works with existing schema - no stem_id columns in domain tables.
 * Uses natural keys (user_id + skill_id, etc.) for upsert logic.
 */

import type { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';

// Tool names that need domain table writes
const DOMAIN_WRITERS: Record<string, DomainWriter> = {
  'soared_form': writeSOAREDStory,
  'skill_tagger': writeSkills,
  'life_dashboard': writeLifeDashboard,
  'flow_tracker': writeFlowEntries,
  'mbti_selector': writeMBTICode,
  'budget_calculator': writeBudget,
  'career_assessment': writeCareerOptions,
  'competency_assessment': writeCompetencyScores,
  'experience_builder': writeExperiences,
  'tasks_per_experience_builder': writeTasksPerExperience,
  'skill_mastery_rater': writeSkillMastery,
};

type DomainWriter = (
  db: D1Database,
  userId: string,
  stemId: number,
  data: unknown
) => Promise<void>;

/**
 * Main entry point - routes tool data to appropriate domain writer
 */
export async function writeToDomainTable(
  db: D1Database,
  userId: string,
  stemId: number,
  toolName: string,
  responseText: string
): Promise<void> {
  const normalizedName = toolName.toLowerCase().replace(/-/g, '_');
  const writer = DOMAIN_WRITERS[normalizedName];

  if (!writer) {
    // Tool doesn't need domain writes (list_builder, ranking_grid, etc.)
    return;
  }

  try {
    const data = JSON.parse(responseText);
    await writer(db, userId, stemId, data);
  } catch (err) {
    console.error(`[DomainWriter] Failed to write ${toolName} to domain table:`, err);
    // Don't throw - domain write failure shouldn't break the save
  }
}

// ============================================================
// SOARED FORM → user_stories
// ============================================================

interface SOAREDData {
  title: string;
  situation: string;
  obstacle: string;
  action: string;
  result: string;
  evaluation: string;
  discovery: string;
  storyType: 'challenge' | 'reframe' | 'other';
}

async function writeSOAREDStory(
  db: D1Database,
  userId: string,
  stemId: number,
  data: unknown
): Promise<void> {
  const story = data as SOAREDData;
  const now = new Date().toISOString();

  // Use stem_id as the key for upsert (each SOARED form instance is unique by stem)
  const existing = await db
    .prepare('SELECT id FROM user_stories WHERE user_id = ? AND stem_id = ?')
    .bind(userId, stemId)
    .first<{ id: string }>();

  if (existing) {
    // Update existing story (title can change freely now)
    await db
      .prepare(`
        UPDATE user_stories
        SET title = ?, situation = ?, obstacle = ?, action = ?,
            result = ?, evaluation = ?, discovery = ?, story_type = ?,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(
        story.title || null,
        story.situation,
        story.obstacle,
        story.action,
        story.result,
        story.evaluation,
        story.discovery,
        story.storyType,
        now,
        existing.id
      )
      .run();
    return;
  }

  // Insert new story with stem_id
  await db
    .prepare(`
      INSERT INTO user_stories
      (id, user_id, stem_id, title, situation, obstacle, action, result, evaluation, discovery, story_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      nanoid(),
      userId,
      stemId,
      story.title || null,
      story.situation,
      story.obstacle,
      story.action,
      story.result,
      story.evaluation,
      story.discovery,
      story.storyType,
      now,
      now
    )
    .run();
}

// ============================================================
// SKILL TAGGER → user_skills
// Uses UNIQUE(user_id, skill_id) for natural upsert
// OPTIMIZED: Pre-fetch all skill categories, batch all upserts
// ============================================================

interface SkillTaggerData {
  selectedSkillIds: string[];
}

async function writeSkills(
  db: D1Database,
  userId: string,
  _stemId: number,
  data: unknown
): Promise<void> {
  const { selectedSkillIds } = data as SkillTaggerData;
  if (selectedSkillIds.length === 0) return;

  const now = new Date().toISOString();

  // 1. Fetch all skill categories in ONE query
  const placeholders = selectedSkillIds.map(() => '?').join(',');
  const skillsResult = await db
    .prepare(`SELECT id, category FROM skills WHERE id IN (${placeholders})`)
    .bind(...selectedSkillIds)
    .all<{ id: string; category: string | null }>();

  const skillMap = new Map(
    (skillsResult.results || []).map(s => [s.id, s.category])
  );

  // 2. Build batch statements for all upserts
  const statements = selectedSkillIds.map((skillId, i) =>
    db.prepare(`
      INSERT INTO user_skills (id, user_id, skill_id, category, rank, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, skill_id) DO UPDATE SET
        rank = excluded.rank,
        updated_at = excluded.updated_at
    `).bind(
      nanoid(),
      userId,
      skillId,
      skillMap.get(skillId) || 'transferable',
      i + 1,
      now,
      now
    )
  );

  // 3. Execute atomically (1 round-trip)
  await db.batch(statements);
}

// ============================================================
// LIFE DASHBOARD → user_profile
// ============================================================

interface LifeDashboardData {
  work: number | null;
  play: number | null;
  love: number | null;
  health: number | null;
}

async function writeLifeDashboard(
  db: D1Database,
  userId: string,
  _stemId: number,
  data: unknown
): Promise<void> {
  const dashboard = data as LifeDashboardData;
  const now = new Date().toISOString();

  // Check if profile exists (user_id is primary key)
  const existing = await db
    .prepare('SELECT user_id FROM user_profile WHERE user_id = ?')
    .bind(userId)
    .first();

  if (existing) {
    await db
      .prepare(`
        UPDATE user_profile
        SET life_dashboard_work = ?, life_dashboard_play = ?,
            life_dashboard_love = ?, life_dashboard_health = ?,
            updated_at = ?
        WHERE user_id = ?
      `)
      .bind(
        dashboard.work,
        dashboard.play,
        dashboard.love,
        dashboard.health,
        now,
        userId
      )
      .run();
  } else {
    await db
      .prepare(`
        INSERT INTO user_profile
        (user_id, life_dashboard_work, life_dashboard_play, life_dashboard_love, life_dashboard_health, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        userId,
        dashboard.work,
        dashboard.play,
        dashboard.love,
        dashboard.health,
        now,
        now
      )
      .run();
  }
}

// ============================================================
// FLOW TRACKER → user_flow_logs
// Entries accumulate - use activity + date as natural key
// OPTIMIZED: Pre-fetch existing entries, batch all writes
// ============================================================

interface FlowEntry {
  id: string;
  date: string;
  activity: string;
  energy: number;
  focus: number;
  notes?: string;
}

interface FlowTrackerData {
  entries: FlowEntry[];
}

async function writeFlowEntries(
  db: D1Database,
  userId: string,
  _stemId: number,
  data: unknown
): Promise<void> {
  const { entries } = data as FlowTrackerData;
  if (entries.length === 0) return;

  const now = new Date().toISOString();

  // 1. Pre-fetch all existing entries for this user
  const existingResult = await db
    .prepare('SELECT id, activity, logged_date FROM user_flow_logs WHERE user_id = ?')
    .bind(userId)
    .all<{ id: string; activity: string; logged_date: string }>();

  // Build lookup map: "activity|date" -> id
  const existingMap = new Map<string, string>();
  for (const row of existingResult.results || []) {
    existingMap.set(`${row.activity}|${row.logged_date}`, row.id);
  }

  // 2. Build batch statements
  const statements = entries.map(entry => {
    const key = `${entry.activity}|${entry.date}`;
    const existingId = existingMap.get(key);

    if (existingId) {
      // Update existing entry
      return db
        .prepare('UPDATE user_flow_logs SET energy = ?, focus = ? WHERE id = ?')
        .bind(entry.energy, entry.focus, existingId);
    } else {
      // Insert new entry
      return db
        .prepare(`
          INSERT INTO user_flow_logs (id, user_id, activity, energy, focus, logged_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(entry.id || nanoid(), userId, entry.activity, entry.energy, entry.focus, entry.date, now);
    }
  });

  // 3. Execute atomically
  await db.batch(statements);
}

// ============================================================
// MBTI SELECTOR → user_settings
// ============================================================

interface MBTIData {
  selectedCode: string | null;
}

async function writeMBTICode(
  db: D1Database,
  userId: string,
  _stemId: number,
  data: unknown
): Promise<void> {
  const { selectedCode } = data as MBTIData;
  const now = new Date().toISOString();

  // user_settings should exist from onboarding, but handle missing case
  const existing = await db
    .prepare('SELECT user_id FROM user_settings WHERE user_id = ?')
    .bind(userId)
    .first();

  if (existing) {
    await db
      .prepare('UPDATE user_settings SET personality_type = ?, updated_at = ? WHERE user_id = ?')
      .bind(selectedCode, now, userId)
      .run();
  } else {
    await db
      .prepare(`
        INSERT INTO user_settings (user_id, background_color, text_color, font, text_size, personality_type, created_at, updated_at)
        VALUES (?, 'ivory', 'charcoal', 'inter', 1.0, ?, ?, ?)
      `)
      .bind(userId, selectedCode, now, now)
      .run();
  }
}

// ============================================================
// BUDGET CALCULATOR → user_budget
// user_id is primary key - simple upsert
// ============================================================

interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  isEssential: boolean;
}

interface BudgetData {
  grossMonthlyIncome: number;
  grossYearlyIncome: number;
  incomeInputMode: 'monthly' | 'yearly';
  filingStatus: string;
  stateCode: string | null;
  expenses: ExpenseItem[];
  notes: string;
}

async function writeBudget(
  db: D1Database,
  userId: string,
  _stemId: number,
  data: unknown
): Promise<void> {
  const budget = data as BudgetData;
  const now = new Date().toISOString();

  // Calculate totals from expenses
  const monthlyExpenses = budget.expenses.reduce((sum, e) => sum + e.amount, 0);
  const annualNeeds = monthlyExpenses * 12;
  // Rough hourly BATNA: annual / 2080 work hours
  const hourlyBatna = Math.round(annualNeeds / 2080);

  // user_id is primary key - use INSERT OR REPLACE
  await db
    .prepare(`
      INSERT INTO user_budget (user_id, monthly_expenses, annual_needs, hourly_batna, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        monthly_expenses = excluded.monthly_expenses,
        annual_needs = excluded.annual_needs,
        hourly_batna = excluded.hourly_batna,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `)
    .bind(userId, monthlyExpenses, annualNeeds, hourlyBatna, budget.notes || null, now, now)
    .run();
}

// ============================================================
// CAREER ASSESSMENT → user_career_options
// Replace all options for user (assessment is a snapshot)
// OPTIMIZED: DELETE + all INSERTs in single atomic batch
// ============================================================

interface CareerOption {
  id: string;
  title: string;
  description?: string;
  coherenceScore?: number | null;
  workNeedsScore?: number | null;
  lifeNeedsScore?: number | null;
  unknownsScore?: number | null;
  rank?: number | null;
}

interface CareerAssessmentData {
  options: CareerOption[];
}

async function writeCareerOptions(
  db: D1Database,
  userId: string,
  _stemId: number,
  data: unknown
): Promise<void> {
  const { options } = data as CareerAssessmentData;
  const now = new Date().toISOString();

  // DELETE + all INSERTs in single atomic batch
  // If any INSERT fails, DELETE rolls back too
  const statements = [
    db.prepare('DELETE FROM user_career_options WHERE user_id = ?').bind(userId),
    ...options.map((opt, i) =>
      db.prepare(`
        INSERT INTO user_career_options
        (id, user_id, title, description, rank, coherence_score, work_needs_score, life_needs_score, unknowns_score, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        opt.id || nanoid(),
        userId,
        opt.title,
        opt.description || null,
        opt.rank ?? (i + 1),
        opt.coherenceScore ?? null,
        opt.workNeedsScore ?? null,
        opt.lifeNeedsScore ?? null,
        opt.unknownsScore ?? null,
        now,
        now
      )
    )
  ];

  await db.batch(statements);
}

// ============================================================
// COMPETENCY ASSESSMENT → user_competency_scores
// Replace all scores for user (assessment is a snapshot)
// OPTIMIZED: DELETE + all INSERTs in single atomic batch
// ============================================================

interface CompetencyScore {
  competencyId: string;
  score: number;
  notes?: string;
}

interface CompetencyAssessmentData {
  scores: CompetencyScore[];
}

async function writeCompetencyScores(
  db: D1Database,
  userId: string,
  _stemId: number,
  data: unknown
): Promise<void> {
  const { scores } = data as CompetencyAssessmentData;
  const now = new Date().toISOString();

  // DELETE + all INSERTs in single atomic batch
  const statements = [
    db.prepare('DELETE FROM user_competency_scores WHERE user_id = ?').bind(userId),
    ...scores.map(score =>
      db.prepare(`
        INSERT INTO user_competency_scores (id, user_id, competency_id, level, assessed_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(nanoid(), userId, score.competencyId, score.score, now)
    )
  ];

  await db.batch(statements);
}

// ============================================================
// EXPERIENCE BUILDER → user_experiences
// Exercise 1.1.1 Part a: List jobs, projects, education
// OPTIMIZED: Pre-fetch existing data, batch all writes
// ============================================================

interface ExperienceEntry {
  id: string;
  title: string;
  organization: string;
  experienceType: 'job' | 'education' | 'project' | 'other';
  startDate: string;
  endDate: string;
}

interface ExperienceBuilderData {
  experiences: ExperienceEntry[];
}

async function writeExperiences(
  db: D1Database,
  userId: string,
  _stemId: number,
  data: unknown
): Promise<void> {
  const { experiences } = data as ExperienceBuilderData;
  const now = new Date().toISOString();

  // 1. Get existing experience IDs for this user
  const existingResult = await db
    .prepare('SELECT id FROM user_experiences WHERE user_id = ?')
    .bind(userId)
    .all<{ id: string }>();

  const existingIds = new Set((existingResult.results || []).map(r => r.id));
  const newIds = new Set(experiences.map(e => e.id));

  // Find IDs to delete
  const idsToDelete = Array.from(existingIds).filter(id => !newIds.has(id));

  // 2. Build all statements
  const statements: ReturnType<D1Database['prepare']>[] = [];

  // Handle deleted experiences - mark associated skill_evidence as inactive
  if (idsToDelete.length > 0) {
    const deletePlaceholders = idsToDelete.map(() => '?').join(',');

    // Find all active skill_evidence for these experiences
    const evidenceResult = await db
      .prepare(`
        SELECT id, user_skill_id FROM skill_evidence
        WHERE source_type = 'experience_task'
          AND source_id IN (${deletePlaceholders})
          AND is_active = 1
      `)
      .bind(...idsToDelete)
      .all<{ id: string; user_skill_id: string }>();

    // Mark evidence as inactive and decrement counts
    const userSkillsToDecrement = new Set<string>();
    for (const evidence of evidenceResult.results || []) {
      statements.push(
        db.prepare(`
          UPDATE skill_evidence SET is_active = 0, removed_at = ? WHERE id = ?
        `).bind(now, evidence.id)
      );
      userSkillsToDecrement.add(evidence.user_skill_id);
    }

    for (const userSkillId of userSkillsToDecrement) {
      statements.push(
        db.prepare(`
          UPDATE user_skills SET evidence_count = evidence_count - 1, updated_at = ? WHERE id = ?
        `).bind(now, userSkillId)
      );
    }

    // Delete the experiences themselves
    for (const idToDelete of idsToDelete) {
      statements.push(
        db.prepare('DELETE FROM user_experiences WHERE id = ?').bind(idToDelete)
      );
    }
  }

  // Upsert each experience
  for (const exp of experiences) {
    if (existingIds.has(exp.id)) {
      // Update existing
      statements.push(
        db.prepare(`
          UPDATE user_experiences
          SET title = ?, organization = ?, experience_type = ?,
              start_date = ?, end_date = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
        `).bind(
          exp.title,
          exp.organization || null,
          exp.experienceType,
          exp.startDate || null,
          exp.endDate === 'present' ? null : (exp.endDate || null),
          now,
          exp.id,
          userId
        )
      );
    } else {
      // Insert new
      statements.push(
        db.prepare(`
          INSERT INTO user_experiences
          (id, user_id, title, organization, experience_type, start_date, end_date, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          exp.id,
          userId,
          exp.title,
          exp.organization || null,
          exp.experienceType,
          exp.startDate || null,
          exp.endDate === 'present' ? null : (exp.endDate || null),
          now,
          now
        )
      );
    }
  }

  // 3. Execute all writes atomically
  if (statements.length > 0) {
    await db.batch(statements);
  }
}

// ============================================================
// TASKS PER EXPERIENCE BUILDER → skills + user_skills + skill_evidence
// Exercise 1.1.1 Part b: For each experience, list tasks
// Tasks become skills with evidence linking them to experiences
// OPTIMIZED: Pre-fetch all data, batch all writes
// ============================================================

interface TaskEntry {
  id: string;
  value: string;
  // Match metadata from SkillInput (for skill_evidence)
  skillId?: string | null;      // Existing skill ID if matched
  matchType?: 'exact' | 'fuzzy' | 'custom';
  matchScore?: number;          // 0-1 confidence
  inputValue?: string;          // Original input before autocomplete
}

interface ExperienceWithTasks {
  experience: ExperienceEntry;
  tasks: TaskEntry[];
}

interface TasksPerExperienceData {
  experiencesWithTasks: ExperienceWithTasks[];
}

async function writeTasksPerExperience(
  db: D1Database,
  userId: string,
  _stemId: number,
  data: unknown
): Promise<void> {
  const { experiencesWithTasks } = data as TasksPerExperienceData;
  if (experiencesWithTasks.length === 0) return;

  const now = new Date().toISOString();
  const experienceIds = experiencesWithTasks.map(e => e.experience.id);

  // Phase 1: Pre-fetch ALL existing data in bulk queries

  // 1a. Get all active skill_evidence for these experiences (source_type = 'experience_task')
  const expPlaceholders = experienceIds.map(() => '?').join(',');
  const existingEvidenceResult = await db
    .prepare(`
      SELECT se.id as evidence_id, se.source_id as experience_id, se.user_skill_id, us.skill_id, s.name
      FROM skill_evidence se
      JOIN user_skills us ON se.user_skill_id = us.id
      JOIN skills s ON us.skill_id = s.id
      WHERE se.source_type = 'experience_task'
        AND se.source_id IN (${expPlaceholders})
        AND se.is_active = 1
        AND us.user_id = ?
    `)
    .bind(...experienceIds, userId)
    .all<{ evidence_id: string; experience_id: string; user_skill_id: string; skill_id: string; name: string }>();

  // 1b. Get all custom skills created by this user (for reuse across experiences)
  const customSkillsResult = await db
    .prepare('SELECT id, name FROM skills WHERE created_by = ?')
    .bind(userId)
    .all<{ id: string; name: string }>();

  // 1c. Get user's existing user_skills records
  const userSkillRecordsResult = await db
    .prepare('SELECT id, skill_id FROM user_skills WHERE user_id = ?')
    .bind(userId)
    .all<{ id: string; skill_id: string }>();

  // Build lookup structures
  // Map: experienceId -> Map<skillNameLower, {evidence_id, user_skill_id, skill_id}>
  const existingByExperience = new Map<string, Map<string, { evidence_id: string; user_skill_id: string; skill_id: string }>>();
  for (const row of existingEvidenceResult.results || []) {
    if (!existingByExperience.has(row.experience_id)) {
      existingByExperience.set(row.experience_id, new Map());
    }
    existingByExperience.get(row.experience_id)!.set(
      row.name.toLowerCase(),
      { evidence_id: row.evidence_id, user_skill_id: row.user_skill_id, skill_id: row.skill_id }
    );
  }

  // Map: skillNameLower -> skillId (all user's custom skills in skills table)
  const customSkillsByName = new Map<string, string>(
    (customSkillsResult.results || []).map(s => [s.name.toLowerCase(), s.id])
  );

  // Map: skillId -> userSkillId (user's existing user_skills records)
  const userSkillBySkillId = new Map<string, string>(
    (userSkillRecordsResult.results || []).map(r => [r.skill_id, r.id])
  );

  // Track user_skill_ids that need evidence_count decremented
  const userSkillsToDecrement = new Set<string>();

  // Phase 2: Build all batch statements in memory (no queries)
  const statements: ReturnType<D1Database['prepare']>[] = [];
  const newSkillsCreated = new Map<string, string>(); // track skills we're creating in this batch
  const newUserSkillsCreated = new Map<string, string>(); // track user_skills we're creating: skillId -> userSkillId

  for (const expWithTasks of experiencesWithTasks) {
    const experienceId = expWithTasks.experience.id;
    const existingForExp = existingByExperience.get(experienceId) || new Map();
    const newTaskNames = new Set(expWithTasks.tasks.map(t => t.value.toLowerCase()));

    // Find evidence to deactivate (tasks removed)
    for (const [nameLower, { evidence_id, user_skill_id }] of existingForExp) {
      if (!newTaskNames.has(nameLower)) {
        // Mark evidence as inactive (never delete - harvest for analysis)
        statements.push(
          db.prepare(`
            UPDATE skill_evidence SET is_active = 0, removed_at = ? WHERE id = ?
          `).bind(now, evidence_id)
        );
        userSkillsToDecrement.add(user_skill_id);
      }
    }

    // Find tasks to add
    for (const task of expWithTasks.tasks) {
      const taskNameLower = task.value.toLowerCase();

      if (!existingForExp.has(taskNameLower)) {
        // Determine skill ID: use provided skillId (from fuzzy match) or find/create custom
        let skillId: string;
        const matchType = task.matchType || 'custom';
        const matchScore = task.matchScore ?? 0;
        const inputValue = task.inputValue || task.value;

        if (task.skillId && (matchType === 'exact' || matchType === 'fuzzy')) {
          // Use existing library skill from fuzzy/exact match
          skillId = task.skillId;
        } else {
          // Custom skill: check if we already have one with this name
          skillId = customSkillsByName.get(taskNameLower) || newSkillsCreated.get(taskNameLower) || '';

          if (!skillId) {
            // Create new custom skill
            skillId = nanoid();
            statements.push(
              db.prepare(`
                INSERT INTO skills (id, name, category, is_custom, created_by, review_status, created_at)
                VALUES (?, ?, 'transferable', 1, ?, 'pending', ?)
              `).bind(skillId, task.value, userId, now)
            );
            newSkillsCreated.set(taskNameLower, skillId);
            customSkillsByName.set(taskNameLower, skillId);
          }
        }

        // Find or create user_skill record
        let userSkillId = userSkillBySkillId.get(skillId) || newUserSkillsCreated.get(skillId);

        if (!userSkillId) {
          // Create new user_skill record (mastery=NULL means not yet rated)
          userSkillId = nanoid();
          statements.push(
            db.prepare(`
              INSERT INTO user_skills (id, user_id, skill_id, category, mastery, evidence_count, created_at, updated_at)
              VALUES (?, ?, ?, 'transferable', NULL, 1, ?, ?)
            `).bind(userSkillId, userId, skillId, now, now)
          );
          newUserSkillsCreated.set(skillId, userSkillId);
          userSkillBySkillId.set(skillId, userSkillId);
        } else {
          // Increment evidence_count on existing user_skill
          statements.push(
            db.prepare(`
              UPDATE user_skills SET evidence_count = evidence_count + 1, updated_at = ? WHERE id = ?
            `).bind(now, userSkillId)
          );
        }

        // Create skill_evidence record with match metadata
        statements.push(
          db.prepare(`
            INSERT INTO skill_evidence (id, user_skill_id, source_type, source_id, input_value, match_type, match_score, is_active, created_at)
            VALUES (?, ?, 'experience_task', ?, ?, ?, ?, 1, ?)
          `).bind(nanoid(), userSkillId, experienceId, inputValue, matchType, matchScore, now)
        );
      }
    }
  }

  // Add decrement statements for removed evidence
  for (const userSkillId of userSkillsToDecrement) {
    statements.push(
      db.prepare(`
        UPDATE user_skills SET evidence_count = evidence_count - 1, updated_at = ? WHERE id = ?
      `).bind(now, userSkillId)
    );
  }

  // Phase 3: Execute main batch
  if (statements.length > 0) {
    await db.batch(statements);
  }

  // Note: We no longer delete orphaned skills. Skills stay in user_skills even at
  // evidence_count=0 (skill stays in profile). Evidence records are never deleted
  // (kept for analysis with is_active=0).
}

// ============================================================
// SKILL MASTERY RATER → user_skills
// Exercise 1.1.1 Part c: Rate mastery of all skills
// OPTIMIZED: Pre-fetch existing records and categories, batch all writes
// ============================================================

interface SkillWithMastery {
  id: string;
  name: string;
  mastery: number; // 1-10
}

interface SkillMasteryRaterData {
  skills: SkillWithMastery[];
}

async function writeSkillMastery(
  db: D1Database,
  userId: string,
  _stemId: number,
  data: unknown
): Promise<void> {
  const { skills } = data as SkillMasteryRaterData;
  if (skills.length === 0) return;

  const now = new Date().toISOString();
  const skillIds = skills.map(s => s.id);

  // 1. Pre-fetch existing user_skills for these skills
  const existingResult = await db
    .prepare('SELECT id, skill_id FROM user_skills WHERE user_id = ?')
    .bind(userId)
    .all<{ id: string; skill_id: string }>();

  const existingBySkillId = new Map<string, string>(
    (existingResult.results || []).map(r => [r.skill_id, r.id])
  );

  // 2. Pre-fetch skill categories for any skills we might need to insert
  const newSkillIds = skillIds.filter(id => !existingBySkillId.has(id));
  const categoryMap = new Map<string, string>();

  if (newSkillIds.length > 0) {
    const placeholders = newSkillIds.map(() => '?').join(',');
    const categoriesResult = await db
      .prepare(`SELECT id, category FROM skills WHERE id IN (${placeholders})`)
      .bind(...newSkillIds)
      .all<{ id: string; category: string | null }>();

    for (const row of categoriesResult.results || []) {
      categoryMap.set(row.id, row.category || 'transferable');
    }
  }

  // 3. Build batch statements
  const statements = skills.map(skill => {
    const existingId = existingBySkillId.get(skill.id);

    if (existingId) {
      // Update existing
      return db
        .prepare('UPDATE user_skills SET mastery = ?, updated_at = ? WHERE id = ?')
        .bind(skill.mastery, now, existingId);
    } else {
      // Insert new
      return db
        .prepare(`
          INSERT INTO user_skills (id, user_id, skill_id, category, mastery, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          nanoid(),
          userId,
          skill.id,
          categoryMap.get(skill.id) || 'transferable',
          skill.mastery,
          now,
          now
        );
    }
  });

  // 4. Execute atomically
  await db.batch(statements);
}
