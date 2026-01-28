/**
 * AT Protocol client wrapper
 *
 * Wraps @atproto/api Agent with DreamTree-specific methods.
 * Handles authentication, session refresh, and record operations.
 */

import { AtpAgent } from '@atproto/api';
import type { SerializedSession, AtpSkillRecord, SyncRecordResult } from './types';

const COLLECTION_SKILL = 'com.dreamtree.skill';

/**
 * Create an authenticated ATP Agent from a stored session
 */
export async function createAtpAgent(session: SerializedSession): Promise<AtpAgent> { // code_id:869
  const agent = new AtpAgent({
    service: session.pdsUrl,
  });

  // Resume session from stored tokens
  await agent.resumeSession({
    did: session.did,
    handle: session.handle,
    accessJwt: session.accessJwt,
    refreshJwt: session.refreshJwt,
    active: true,
  });

  return agent;
}

/**
 * Generate a TID (timestamp-based ID) for record keys
 * TIDs are base32-sortable timestamps used in ATP
 */
export function generateTid(): string { // code_id:870
  const now = Date.now() * 1000; // microseconds
  const clockId = Math.floor(Math.random() * 1024);
  const tid = (BigInt(now) << BigInt(10)) | BigInt(clockId);
  return tid.toString(32).padStart(13, '2');
}

/**
 * Generate a deterministic TID from a DreamTree ID
 * This allows us to update/delete the same record
 */
export function tidFromDreamtreeId(dreamtreeId: string): string { // code_id:871
  // Hash the ID and use first 13 chars as TID-like key
  // This is deterministic so we can find/update the record later
  let hash = 0;
  for (let i = 0; i < dreamtreeId.length; i++) {
    const char = dreamtreeId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to base32 and pad to TID length
  const base32 = Math.abs(hash).toString(32);
  return base32.padStart(13, '2');
}

/**
 * Sync a single skill record to the user's PDS
 */
export async function syncSkillRecord(
  agent: AtpAgent,
  skill: AtpSkillRecord
): Promise<SyncRecordResult> { // code_id:872
  const rkey = tidFromDreamtreeId(skill.dreamtreeId);

  try {
    // Check if record exists
    let exists = false;
    try {
      await agent.com.atproto.repo.getRecord({
        repo: agent.session?.did || '',
        collection: COLLECTION_SKILL,
        rkey,
      });
      exists = true;
    } catch {
      // Record doesn't exist, that's fine
    }

    const record = {
      $type: COLLECTION_SKILL,
      skillName: skill.skillName,
      skillId: skill.skillId,
      category: skill.category,
      mastery: skill.mastery,
      rank: skill.rank,
      evidence: skill.evidence,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
      dreamtreeId: skill.dreamtreeId,
    };

    if (exists) {
      // Update existing record
      await agent.com.atproto.repo.putRecord({
        repo: agent.session?.did || '',
        collection: COLLECTION_SKILL,
        rkey,
        record,
      });

      return {
        success: true,
        action: 'updated',
        dreamtreeId: skill.dreamtreeId,
        atUri: `at://${agent.session?.did}/${COLLECTION_SKILL}/${rkey}`,
      };
    } else {
      // Create new record
      const result = await agent.com.atproto.repo.createRecord({
        repo: agent.session?.did || '',
        collection: COLLECTION_SKILL,
        rkey,
        record,
      });

      return {
        success: true,
        action: 'created',
        dreamtreeId: skill.dreamtreeId,
        atUri: result.data.uri,
      };
    }
  } catch (error) {
    return {
      success: false,
      action: 'error',
      dreamtreeId: skill.dreamtreeId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a skill record from the user's PDS
 */
export async function deleteSkillRecord(
  agent: AtpAgent,
  dreamtreeId: string
): Promise<SyncRecordResult> { // code_id:873
  const rkey = tidFromDreamtreeId(dreamtreeId);

  try {
    await agent.com.atproto.repo.deleteRecord({
      repo: agent.session?.did || '',
      collection: COLLECTION_SKILL,
      rkey,
    });

    return {
      success: true,
      action: 'updated', // "deleted" not in our type, using updated
      dreamtreeId,
    };
  } catch (error) {
    return {
      success: false,
      action: 'error',
      dreamtreeId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List all skill records from user's PDS
 */
export async function listSkillRecords(
  agent: AtpAgent
): Promise<AtpSkillRecord[]> { // code_id:874
  const did = agent.session?.did;
  if (!did) return [];

  try {
    const result = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: COLLECTION_SKILL,
      limit: 100,
    });

    return result.data.records.map((r) => r.value as unknown as AtpSkillRecord);
  } catch {
    return [];
  }
}

/**
 * Refresh the session if needed and return updated session
 */
export async function refreshSessionIfNeeded(
  agent: AtpAgent,
  currentSession: SerializedSession
): Promise<SerializedSession | null> {
  try {
    // Check if session is still valid
    await agent.getProfile({ actor: currentSession.did });
    return currentSession;
  } catch {
    // Try to refresh
    try {
      await agent.resumeSession({
        did: currentSession.did,
        handle: currentSession.handle,
        accessJwt: currentSession.accessJwt,
        refreshJwt: currentSession.refreshJwt,
        active: true,
      });

      if (agent.session) { // code_id:875
        return {
          did: agent.session.did,
          handle: agent.session.handle,
          pdsUrl: currentSession.pdsUrl,
          accessJwt: agent.session.accessJwt,
          refreshJwt: agent.session.refreshJwt,
        };
      }
    } catch {
      // Refresh failed
    }
    return null;
  }
}
