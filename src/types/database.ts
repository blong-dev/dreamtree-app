// DreamTree Database Types
// Generated from schema: migrations/0001_initial.sql

import type { D1Database } from '@cloudflare/workers-types';

// ============================================================
// CORE TABLES
// ============================================================

// User roles for RBAC (BUG-206)
export type UserRole = 'user' | 'admin' | 'coach' | 'org';

export interface User {
  id: string;
  is_anonymous: number; // 0 or 1
  workbook_complete: number; // 0 or 1
  user_role: UserRole; // Added in migration 0016
  marketing_consent: number; // 0 or 1 - email marketing opt-in
  consent_given_at: string | null; // ISO 8601 - when consent was given (legal records)
  created_at: string; // ISO 8601
  updated_at: string;
}

export interface Auth {
  id: string;
  user_id: string;
  type: 'password' | 'passkey' | 'wallet';
  password_hash: string | null;
  wrapped_data_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Email {
  id: string;
  user_id: string;
  email: string;
  is_active: number; // 0 or 1
  added_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  created_at: string;
  last_seen_at: string;
  data_key?: string | null;  // PII encryption key (stored when user logs in)
}

export interface UserSettings {
  user_id: string;
  background_color: string;
  text_color: string;
  font: string;
  text_size: number; // Multiplier: 0.8 = 80%, 1.0 = 100%, 1.2 = 120%
  personality_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserModule {
  user_id: string;
  module_id: string;
  first_completed_at: string;
  last_modified_at: string;
}

// ============================================================
// USER DATA TABLES (Tier 1)
// ============================================================

export interface UserProfile {
  user_id: string;
  headline: string | null;
  summary: string | null;
  identity_story: string | null;
  allegory: string | null;
  value_proposition: string | null;
  life_dashboard_work: number | null; // 1-10
  life_dashboard_play: number | null;
  life_dashboard_love: number | null;
  life_dashboard_health: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserValues {
  user_id: string;
  work_values: string | null;
  life_values: string | null;
  compass_statement: string | null;
  created_at: string;
  updated_at: string;
}

export type SkillCategory = 'transferable' | 'self_management' | 'knowledge';

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  category: SkillCategory | null;
  mastery: number | null; // 1-5
  evidence: string | null;
  rank: number | null;
  evidence_count: number; // derived count of evidence records
  created_at: string;
  updated_at: string;
}

export type SkillEvidenceSourceType = 'experience_task' | 'story_skill' | 'explicit_tag' | 'assessment';
export type SkillEvidenceMatchType = 'exact' | 'fuzzy' | 'custom';

export interface SkillEvidence {
  id: string;
  user_skill_id: string | null; // FK to user_skills (nullable, linked after creation)
  source_type: SkillEvidenceSourceType;
  source_id: string | null; // experience_id, story_id, stem_id, etc.
  input_value: string | null; // exactly what user typed (harvest)
  match_type: SkillEvidenceMatchType | null;
  match_score: number | null; // 0-1 confidence
  is_active: number; // 1=active, 0=removed (never delete, just deactivate)
  removed_at: string | null; // timestamp when removed (null if active)
  created_at: string;
}

export type StoryType = 'challenge' | 'reframe' | 'other';

export interface UserStory {
  id: string;
  user_id: string;
  experience_id: string | null;
  title: string | null;
  situation: string | null;
  obstacle: string | null;
  action: string | null;
  result: string | null;
  evaluation: string | null;
  discovery: string | null;
  story_type: StoryType | null;
  created_at: string;
  updated_at: string;
}

export type ExperienceType = 'job' | 'education' | 'project' | 'other';

export interface UserExperience {
  id: string;
  user_id: string;
  title: string;
  organization: string | null;
  experience_type: ExperienceType | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserExperienceSkill {
  id: string;
  experience_id: string;
  skill_id: string;
  created_at: string;
}

export interface UserLocation {
  id: string;
  user_id: string;
  name: string;
  rank: number | null;
  traits_liked: string | null;
  traits_disliked: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCareerOption {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  rank: number | null; // 1-3
  coherence_score: number | null;
  work_needs_score: number | null;
  life_needs_score: number | null;
  unknowns_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserBudget {
  user_id: string;
  monthly_expenses: number | null;
  annual_needs: number | null;
  hourly_batna: number | null;
  benefits_needed: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFlowLog {
  id: string;
  user_id: string;
  activity: string;
  energy: number | null; // -2 to +2
  focus: number | null; // 1-5
  logged_date: string;
  created_at: string;
}

export interface UserCompany {
  id: string;
  user_id: string;
  name: string;
  status: string | null;
  research_notes: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserContact {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  title: string | null;
  relationship_status: string | null;
  notes: string | null;
  linkedin_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserJob {
  id: string;
  user_id: string;
  company_id: string | null;
  title: string;
  posting_url: string | null;
  application_status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserIdeaTree {
  id: string;
  user_id: string;
  name: string | null;
  root_node_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserIdeaNode {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface UserIdeaEdge {
  id: string;
  tree_id: string;
  from_node_id: string;
  to_node_id: string;
  created_at: string;
}

export interface UserCompetencyScore {
  id: string;
  user_id: string;
  competency_id: string;
  score: number; // 1-5
  assessed_at: string;
}

// ============================================================
// USER DATA TABLES (Tier 2)
// ============================================================

export interface UserResponse {
  id: string;
  user_id: string;
  stem_id: number | null; // Primary identifier for response lookup
  prompt_id: number | null; // @deprecated - all prompts migrated to tools (migration 0027)
  tool_id: number | null; // Used for all tool responses (including former prompts)
  exercise_id: string | null; // Legacy: kept for backward compatibility
  activity_id: string | null; // Legacy: kept for backward compatibility
  response_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserList {
  id: string;
  user_id: string;
  name: string;
  context: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserListItem {
  id: string;
  list_id: string;
  content: string;
  position: number;
  created_at: string;
}

export interface UserChecklist {
  id: string;
  user_id: string;
  prompt_id: number; // @deprecated - use tool_id instead (migration 0028)
  tool_id: number | null; // Tool ID for the checkbox (migrated from prompt_id)
  exercise_id: string | null;
  checked: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

// ============================================================
// CONTENT TABLES
// ============================================================

// Block type - 'prompt' removed in schema consolidation (migration 0024-0029)
export type BlockType = 'content' | 'tool';

export interface Stem {
  id: number;
  part: number;
  module: number;
  exercise: number;
  activity: number;
  sequence: number;
  block_type: BlockType;
  content_id: number | null;
  connection_id: number | null;
}

export type ContentType = 'heading' | 'instruction' | 'note' | 'quote' | 'transition' | 'celebration';

export interface ContentBlock {
  id: number;
  content_type: ContentType;
  content: string;
  version: number;
  is_active: number; // 0 or 1
}

// Tool types - 'interactive' for complex tools, simple types for former prompts
export type ToolType = 'interactive' | 'text_input' | 'textarea' | 'slider' | 'checkbox' | 'checkbox_group' | 'radio' | 'select';

export type ReminderFrequency = 'daily' | 'weekly' | 'monthly';

export interface Tool {
  id: number;
  name: string;
  description: string | null;
  instructions: string | null;
  icon_name: string | null;
  has_reminder: number; // 0 or 1
  reminder_frequency: ReminderFrequency | null;
  reminder_prompt: string | null;
  unlocks_at_exercise: string | null;
  // Schema consolidation: former prompts are now tools with tool_type
  tool_type: ToolType;
  prompt_text: string | null;  // Label for simple inputs (NULL if preceding content has instruction)
  input_config: string | null; // JSON config for simple inputs (min, max, options, etc.)
  version: number;
  is_active: number;
}

export type ConnectionType = 'forward' | 'backward' | 'internal' | 'resource' | 'framework';

export interface Connection {
  id: number;
  source_block_id: number | null;
  target_block_id: number | null;
  source_location: string | null;
  target_location: string | null;
  connection_type: ConnectionType;
  data_object: string | null;
  source_tool_id: number | null;
  transform: string | null;
  implementation_notes: string | null;
}

export interface DataObject {
  id: number;
  name: string;
  created_in: string;
  reused_in: string | null;
  data_type: string;
  implementation_notes: string | null;
}

export interface OngoingPractice {
  id: number;
  name: string;
  established_in: string;
  used_by: string | null;
  frequency: string;
  purpose: string | null;
}

// ============================================================
// REFERENCE TABLES
// ============================================================

export interface PersonalityType {
  code: string; // e.g., "ENFP"
  name: string; // e.g., "The Campaigner"
  summary: string;
}

export type CompetencyCategory = 'delivery' | 'interpersonal' | 'strategic';

export interface Competency {
  id: string;
  name: string;
  definition: string;
  category: CompetencyCategory;
  sort_order: number;
  relevant_modules: string | null; // JSON array
}

export interface CompetencyLevel {
  id: string;
  competency_id: string;
  level: number; // 1-5
  description: string;
  job_context: string | null;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory | null;
  is_custom: number; // 0 or 1
  created_by: string | null;
  review_status: ReviewStatus | null;
  created_at: string;
}

// ============================================================
// ATTRIBUTION TABLES
// ============================================================

export interface Reference {
  id: string;
  citation_number: number;
  author_surname: string;
  full_citation: string;
  short_citation: string;
  category: string | null;
  metadata: string | null; // JSON
  created_at: string;
}

export type UsageType = 'direct_quote' | 'framework' | 'concept' | 'adaptation' | 'inspiration';

export interface ContentSource {
  id: string;
  exercise_id: string;
  reference_id: string;
  usage_type: UsageType;
  notes: string | null;
}

// ============================================================
// AT PROTOCOL TABLES
// ============================================================

export interface UserAtpConnection {
  id: string;
  user_id: string;
  did: string; // e.g., "did:plc:abc123..."
  handle: string | null; // e.g., "alice.bsky.social"
  pds_url: string; // e.g., "https://bsky.social"
  session_data: string; // JSON serialized session
  sync_enabled: number; // 0 or 1
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OAuthState {
  id: string;
  state: string;
  code_verifier: string;
  handle: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

// ============================================================
// D1 DATABASE BINDING
// ============================================================

export interface Env {
  DB: D1Database;
  [key: string]: unknown;
}

// Augment global CloudflareEnv for OpenNext
declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}
