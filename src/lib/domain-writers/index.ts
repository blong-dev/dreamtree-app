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
  data: unknown
) => Promise<void>;

/**
 * Main entry point - routes tool data to appropriate domain writer
 */
export async function writeToDomainTable(
  db: D1Database,
  userId: string,
  _stemId: number, // Kept for API compatibility but not used
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
    await writer(db, userId, data);
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
  data: unknown
): Promise<void> {
  const story = data as SOAREDData;
  const now = new Date().toISOString();

  // Use title as natural key for upsert (or insert if no title)
  if (story.title) {
    const existing = await db
      .prepare('SELECT id FROM user_stories WHERE user_id = ? AND title = ?')
      .bind(userId, story.title)
      .first<{ id: string }>();

    if (existing) {
      await db
        .prepare(`
          UPDATE user_stories
          SET situation = ?, obstacle = ?, action = ?,
              result = ?, evaluation = ?, discovery = ?, story_type = ?,
              updated_at = ?
          WHERE id = ?
        `)
        .bind(
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
  }

  // Insert new story
  await db
    .prepare(`
      INSERT INTO user_stories
      (id, user_id, title, situation, obstacle, action, result, evaluation, discovery, story_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      nanoid(),
      userId,
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
// ============================================================

interface SkillTaggerData {
  selectedSkillIds: string[];
}

async function writeSkills(
  db: D1Database,
  userId: string,
  data: unknown
): Promise<void> {
  const { selectedSkillIds } = data as SkillTaggerData;
  const now = new Date().toISOString();

  // Upsert each skill using ON CONFLICT
  for (let i = 0; i < selectedSkillIds.length; i++) {
    const skillId = selectedSkillIds[i];

    // Look up skill to get category
    const skill = await db
      .prepare('SELECT category FROM skills WHERE id = ?')
      .bind(skillId)
      .first<{ category: string | null }>();

    // Use INSERT OR REPLACE to handle the UNIQUE(user_id, skill_id) constraint
    await db
      .prepare(`
        INSERT INTO user_skills (id, user_id, skill_id, category, rank, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, skill_id) DO UPDATE SET
          rank = excluded.rank,
          updated_at = excluded.updated_at
      `)
      .bind(
        nanoid(),
        userId,
        skillId,
        skill?.category || 'transferable',
        i + 1,
        now,
        now
      )
      .run();
  }
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
  data: unknown
): Promise<void> {
  const { entries } = data as FlowTrackerData;
  const now = new Date().toISOString();

  for (const entry of entries) {
    // Check if this activity+date already exists
    const existing = await db
      .prepare('SELECT id FROM user_flow_logs WHERE user_id = ? AND activity = ? AND logged_date = ?')
      .bind(userId, entry.activity, entry.date)
      .first<{ id: string }>();

    if (existing) {
      // Update existing entry
      await db
        .prepare(`
          UPDATE user_flow_logs
          SET energy = ?, focus = ?
          WHERE id = ?
        `)
        .bind(entry.energy, entry.focus, existing.id)
        .run();
    } else {
      // Insert new entry
      await db
        .prepare(`
          INSERT INTO user_flow_logs (id, user_id, activity, energy, focus, logged_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          entry.id || nanoid(),
          userId,
          entry.activity,
          entry.energy,
          entry.focus,
          entry.date,
          now
        )
        .run();
    }
  }
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
        INSERT INTO user_settings (user_id, background_color, text_color, font, personality_type, created_at, updated_at)
        VALUES (?, 'ivory', 'charcoal', 'inter', ?, ?, ?)
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
  data: unknown
): Promise<void> {
  const { options } = data as CareerAssessmentData;
  const now = new Date().toISOString();

  // Delete existing options and insert new ones (assessment is a complete snapshot)
  await db
    .prepare('DELETE FROM user_career_options WHERE user_id = ?')
    .bind(userId)
    .run();

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    await db
      .prepare(`
        INSERT INTO user_career_options
        (id, user_id, title, description, rank, coherence_score, work_needs_score, life_needs_score, unknowns_score, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
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
      .run();
  }
}

// ============================================================
// COMPETENCY ASSESSMENT → user_competency_scores
// Replace all scores for user (assessment is a snapshot)
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
  data: unknown
): Promise<void> {
  const { scores } = data as CompetencyAssessmentData;
  const now = new Date().toISOString();

  // Delete existing scores and insert new ones (assessment is a complete snapshot)
  await db
    .prepare('DELETE FROM user_competency_scores WHERE user_id = ?')
    .bind(userId)
    .run();

  for (const score of scores) {
    await db
      .prepare(`
        INSERT INTO user_competency_scores (id, user_id, competency_id, level, assessed_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(
        nanoid(),
        userId,
        score.competencyId,
        score.score,
        now
      )
      .run();
  }
}

// ============================================================
// EXPERIENCE BUILDER → user_experiences
// Exercise 1.1.1 Part a: List jobs, projects, education
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
  data: unknown
): Promise<void> {
  const { experiences } = data as ExperienceBuilderData;
  const now = new Date().toISOString();

  // Get existing experience IDs for this user
  const existingResult = await db
    .prepare('SELECT id FROM user_experiences WHERE user_id = ?')
    .bind(userId)
    .all<{ id: string }>();

  const existingIds = new Set((existingResult.results || []).map(r => r.id));
  const newIds = new Set(experiences.map(e => e.id));

  // Delete experiences that were removed (check for linked skills first)
  for (const existingId of existingIds) {
    if (!newIds.has(existingId)) {
      // Check if this experience has linked skills
      const linkedSkills = await db
        .prepare('SELECT COUNT(*) as count FROM user_experience_skills WHERE experience_id = ?')
        .bind(existingId)
        .first<{ count: number }>();

      if (linkedSkills && linkedSkills.count > 0) {
        // Delete the junction records first (cascade)
        await db
          .prepare('DELETE FROM user_experience_skills WHERE experience_id = ?')
          .bind(existingId)
          .run();
      }

      // Now delete the experience
      await db
        .prepare('DELETE FROM user_experiences WHERE id = ?')
        .bind(existingId)
        .run();
    }
  }

  // Upsert each experience
  for (const exp of experiences) {
    if (existingIds.has(exp.id)) {
      // Update existing
      await db
        .prepare(`
          UPDATE user_experiences
          SET title = ?, organization = ?, experience_type = ?,
              start_date = ?, end_date = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
        `)
        .bind(
          exp.title,
          exp.organization || null,
          exp.experienceType,
          exp.startDate || null,
          exp.endDate === 'present' ? null : (exp.endDate || null),
          now,
          exp.id,
          userId
        )
        .run();
    } else {
      // Insert new
      await db
        .prepare(`
          INSERT INTO user_experiences
          (id, user_id, title, organization, experience_type, start_date, end_date, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
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
        .run();
    }
  }
}

// ============================================================
// TASKS PER EXPERIENCE BUILDER → skills + user_experience_skills
// Exercise 1.1.1 Part b: For each experience, list tasks
// Tasks become custom skills linked to the experience
// ============================================================

interface TaskEntry {
  id: string;
  value: string;
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
  data: unknown
): Promise<void> {
  const { experiencesWithTasks } = data as TasksPerExperienceData;
  const now = new Date().toISOString();

  // Process each experience
  for (const expWithTasks of experiencesWithTasks) {
    const experienceId = expWithTasks.experience.id;

    // Get existing skills linked to this experience
    const existingResult = await db
      .prepare(`
        SELECT ues.id as junction_id, s.id as skill_id, s.name
        FROM user_experience_skills ues
        JOIN skills s ON ues.skill_id = s.id
        WHERE ues.experience_id = ? AND s.created_by = ?
      `)
      .bind(experienceId, userId)
      .all<{ junction_id: string; skill_id: string; name: string }>();

    const existingSkills = existingResult.results || [];
    const existingNames = new Map(existingSkills.map(s => [s.name.toLowerCase(), s]));
    const newNames = new Set(expWithTasks.tasks.map(t => t.value.toLowerCase()));

    // Delete junction records for tasks that were removed
    for (const existing of existingSkills) {
      if (!newNames.has(existing.name.toLowerCase())) {
        // Remove junction record
        await db
          .prepare('DELETE FROM user_experience_skills WHERE id = ?')
          .bind(existing.junction_id)
          .run();

        // Check if skill is used elsewhere, if not delete it
        const usageCount = await db
          .prepare('SELECT COUNT(*) as count FROM user_experience_skills WHERE skill_id = ?')
          .bind(existing.skill_id)
          .first<{ count: number }>();

        if (usageCount && usageCount.count === 0) {
          // Also delete from user_skills (mastery ratings) to maintain referential integrity
          await db
            .prepare('DELETE FROM user_skills WHERE skill_id = ?')
            .bind(existing.skill_id)
            .run();

          // Now safe to delete the skill itself
          await db
            .prepare('DELETE FROM skills WHERE id = ?')
            .bind(existing.skill_id)
            .run();
        }
      }
    }

    // Add new tasks as skills
    for (const task of expWithTasks.tasks) {
      const taskNameLower = task.value.toLowerCase();

      if (!existingNames.has(taskNameLower)) {
        // Check if this skill name already exists for this user (from another experience)
        const existingSkill = await db
          .prepare('SELECT id FROM skills WHERE name = ? AND created_by = ?')
          .bind(task.value, userId)
          .first<{ id: string }>();

        let skillId: string;

        if (existingSkill) {
          skillId = existingSkill.id;
        } else {
          // Create new custom skill
          skillId = nanoid();
          await db
            .prepare(`
              INSERT INTO skills (id, name, category, is_custom, created_by, review_status, created_at)
              VALUES (?, ?, 'transferable', 1, ?, 'pending', ?)
            `)
            .bind(skillId, task.value, userId, now)
            .run();
        }

        // Check if junction already exists (skill might be linked via another path)
        const existingJunction = await db
          .prepare('SELECT id FROM user_experience_skills WHERE experience_id = ? AND skill_id = ?')
          .bind(experienceId, skillId)
          .first<{ id: string }>();

        if (!existingJunction) {
          // Create junction record
          await db
            .prepare(`
              INSERT INTO user_experience_skills (id, experience_id, skill_id, created_at)
              VALUES (?, ?, ?, ?)
            `)
            .bind(nanoid(), experienceId, skillId, now)
            .run();
        }
      }
    }
  }
}

// ============================================================
// SKILL MASTERY RATER → user_skills
// Exercise 1.1.1 Part c: Rate mastery of all skills
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
  data: unknown
): Promise<void> {
  const { skills } = data as SkillMasteryRaterData;
  const now = new Date().toISOString();

  for (const skill of skills) {
    // Check if user_skill record exists
    const existing = await db
      .prepare('SELECT id FROM user_skills WHERE user_id = ? AND skill_id = ?')
      .bind(userId, skill.id)
      .first<{ id: string }>();

    if (existing) {
      // Update mastery
      await db
        .prepare('UPDATE user_skills SET mastery = ?, updated_at = ? WHERE id = ?')
        .bind(skill.mastery, now, existing.id)
        .run();
    } else {
      // Look up skill category
      const skillRow = await db
        .prepare('SELECT category FROM skills WHERE id = ?')
        .bind(skill.id)
        .first<{ category: string | null }>();

      // Create new user_skill record
      await db
        .prepare(`
          INSERT INTO user_skills (id, user_id, skill_id, category, mastery, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          nanoid(),
          userId,
          skill.id,
          skillRow?.category || 'transferable',
          skill.mastery,
          now,
          now
        )
        .run();
    }
  }
}
