/**
 * AT Protocol integration module
 *
 * Enables DreamTree users to sync their data to the AT Protocol ecosystem,
 * providing true data ownership via their Personal Data Server (PDS).
 */

// Types
export type {
  AtpConnectionStatus,
  AtpSkillRecord,
  SyncRecordResult,
  SyncResult,
  OAuthState,
  SerializedSession,
} from './types';

// OAuth utilities
export {
  createOAuthState,
  consumeOAuthState,
  cleanupExpiredStates,
} from './oauth/state-store';

export {
  storeAtpSession,
  getAtpSession,
  getAtpConnectionStatus,
  setSyncEnabled,
  updateLastSync,
  deleteAtpConnection,
  updateAtpSession,
} from './oauth/session-store';

export {
  sanitizeRequest,
  edgeFetch,
  generateRandomString,
  generateCodeVerifier,
  generateCodeChallenge,
} from './oauth/polyfills';

// Client utilities
export {
  createAtpAgent,
  generateTid,
  tidFromDreamtreeId,
  syncSkillRecord,
  deleteSkillRecord,
  listSkillRecords,
  refreshSessionIfNeeded,
} from './client';

// Sync utilities
export {
  syncAllSkills,
  syncSingleSkill,
  queueAtpSkillSync,
} from './sync/skill-sync';
