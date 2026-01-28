/**
 * AT Protocol integration types
 *
 * Types for ATP OAuth sessions, connections, and sync operations.
 */

// ATP connection status
export interface AtpConnectionStatus {
  connected: boolean;
  did?: string;
  handle?: string;
  pdsUrl?: string;
  syncEnabled: boolean;
  lastSyncAt?: string;
}

// Skill record for ATP Lexicon (com.dreamtree.skill)
export interface AtpSkillRecord {
  skillName: string;
  skillId?: string;
  category?: 'transferable' | 'self_management' | 'knowledge';
  mastery?: number; // 1-5
  rank?: number;
  evidence?: string;
  createdAt: string;
  updatedAt?: string;
  dreamtreeId: string; // Links back to D1 record
}

// Sync result for a single record
export interface SyncRecordResult {
  success: boolean;
  action: 'created' | 'updated' | 'skipped' | 'error';
  dreamtreeId: string;
  atUri?: string;
  error?: string;
}

// Sync operation result
export interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ dreamtreeId: string; error: string }>;
}

// OAuth state stored in D1
export interface OAuthState {
  id: string;
  state: string;
  codeVerifier: string;
  handle: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

// Serialized session data for D1 storage
export interface SerializedSession {
  did: string;
  handle: string;
  pdsUrl: string;
  accessJwt: string;
  refreshJwt: string;
  dpopNonce?: string;
  expiresAt?: string;
}
