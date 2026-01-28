/**
 * Skill sync logic
 *
 * Syncs user skills from D1 to their AT Protocol PDS.
 */

import type { D1Database } from '@cloudflare/workers-types';
import { createAtpAgent, syncSkillRecord, refreshSessionIfNeeded } from '../client';
import { getAtpSession, updateAtpSession, updateLastSync } from '../oauth/session-store';
import type { AtpSkillRecord, SyncResult } from '../types';

interface UserSkillRow {
  id: string;
  skill_id: string;
  skill_name: string;
  category: string | null;
  mastery: number | null;
  rank: number | null;
  evidence: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map D1 skill row to ATP skill record
 */
function mapSkillToAtpRecord(row: UserSkillRow): AtpSkillRecord { // code_id:895
  return {
    skillName: row.skill_name,
    skillId: row.skill_id,
    category: row.category as AtpSkillRecord['category'],
    mastery: row.mastery || undefined,
    rank: row.rank || undefined,
    evidence: row.evidence || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dreamtreeId: row.id,
  };
}

/**
 * Fetch all skills for a user from D1
 */
async function fetchUserSkills(db: D1Database, userId: string): Promise<UserSkillRow[]> { // code_id:896
  const result = await db
    .prepare(
      `SELECT us.id, us.skill_id, s.name as skill_name, us.category,
              us.mastery, us.rank, us.evidence, us.created_at, us.updated_at
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       WHERE us.user_id = ?
       ORDER BY us.rank ASC NULLS LAST, us.created_at ASC`
    )
    .bind(userId)
    .all<UserSkillRow>();

  return result.results || [];
}

/**
 * Sync all skills for a user to their PDS
 */
export async function syncAllSkills(
  db: D1Database,
  userId: string
): Promise<SyncResult> { // code_id:892
  const result: SyncResult = {
    synced: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Get ATP session
  const session = await getAtpSession(db, userId);
  if (!session) {
    return { ...result, errors: [{ dreamtreeId: '', error: 'No ATP connection' }] };
  }

  // Create agent and refresh session if needed
  const agent = await createAtpAgent(session);
  const refreshedSession = await refreshSessionIfNeeded(agent, session);

  if (!refreshedSession) {
    return { ...result, errors: [{ dreamtreeId: '', error: 'Session expired' }] };
  }

  // Update session if it was refreshed
  if (refreshedSession !== session) {
    await updateAtpSession(db, userId, refreshedSession);
  }

  // Fetch all skills
  const skills = await fetchUserSkills(db, userId);

  // Sync each skill
  for (const skill of skills) {
    const atpSkill = mapSkillToAtpRecord(skill);
    const syncResult = await syncSkillRecord(agent, atpSkill);

    if (syncResult.success) {
      result.synced++;
      if (syncResult.action === 'created') result.created++;
      if (syncResult.action === 'updated') result.updated++;
      if (syncResult.action === 'skipped') result.skipped++;
    } else {
      result.errors.push({
        dreamtreeId: syncResult.dreamtreeId,
        error: syncResult.error || 'Unknown error',
      });
    }
  }

  // Update last sync timestamp
  await updateLastSync(db, userId);

  return result;
}

/**
 * Sync a single skill (called after save in workbook)
 */
export async function syncSingleSkill(
  db: D1Database,
  userId: string,
  skillData: AtpSkillRecord
): Promise<SyncResult> { // code_id:893
  const result: SyncResult = {
    synced: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Get ATP session
  const session = await getAtpSession(db, userId);
  if (!session) {
    // User not connected to ATP - silent skip
    return { ...result, skipped: 1 };
  }

  // Create agent
  const agent = await createAtpAgent(session);

  try {
    const syncResult = await syncSkillRecord(agent, skillData);

    if (syncResult.success) {
      result.synced = 1;
      if (syncResult.action === 'created') result.created = 1;
      if (syncResult.action === 'updated') result.updated = 1;
    } else {
      result.errors.push({
        dreamtreeId: skillData.dreamtreeId,
        error: syncResult.error || 'Unknown error',
      });
    }
  } catch (error) {
    // Log but don't fail the D1 save
    console.error('[ATP Sync] Failed to sync skill:', error);
    result.errors.push({
      dreamtreeId: skillData.dreamtreeId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return result;
}

/**
 * Queue skill sync (fire and forget)
 * This is called from the workbook response API
 */
export async function queueAtpSkillSync(
  db: D1Database,
  userId: string,
  skillId: string,
  skillName: string,
  category?: string,
  mastery?: number,
  rank?: number
): Promise<void> { // code_id:894
  // Fire and forget - don't await
  syncSingleSkill(db, userId, {
    skillName,
    skillId,
    category: category as AtpSkillRecord['category'],
    mastery,
    rank,
    createdAt: new Date().toISOString(),
    dreamtreeId: skillId,
  }).catch((error) => {
    console.error('[ATP Sync] Background sync failed:', error);
  });
}
