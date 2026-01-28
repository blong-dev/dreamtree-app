// DreamTree Connections Types
// Defines how data flows between exercises

/**
 * Connection methods determine how data is fetched and transformed
 */
export type ConnectionMethod =
  | 'auto_populate'   // Fetch and display data automatically
  | 'hydrate'         // Pre-fill form with prior data
  | 'reference_link'  // Link to reference data (read-only)
  | 'custom';         // Custom logic defined in params

/**
 * Parameters for auto_populate connections
 */
export interface AutoPopulateParams {
  source: DataSourceType;
  filter?: string;
  from_exercise?: string;
  from_exercises?: string[];
  from_module?: string;
}

/**
 * Parameters for reference_link connections
 */
export interface ReferenceLinkParams {
  target: string;
  display: 'inline' | 'modal' | 'sidebar';
}

/**
 * Parameters for custom connections
 */
export interface CustomParams {
  instructions: string[];
}

/**
 * Union of all connection params
 */
export type ConnectionParams =
  | AutoPopulateParams
  | ReferenceLinkParams
  | CustomParams;

/**
 * Data sources that can be referenced in connections
 */
export type DataSourceType =
  // Skills
  | 'transferable_skills'
  | 'soft_skills'
  | 'all_skills'
  | 'knowledge_skills'
  // Stories and Experiences
  | 'soared_stories'
  | 'experiences'
  | 'all_experiences'
  | 'employment_history'
  | 'education_history'
  // Flow and Energy
  | 'flow_tracking'
  // Values
  | 'values_compass'
  | 'work_values'
  | 'life_values'
  // Career Planning
  | 'career_options'
  | 'locations'
  | 'budget'
  // Personality
  | 'mbti_code'
  // Dashboard and Profile
  | 'life_dashboard'
  | 'profile_text'
  // Assessments
  | 'competency_scores'
  // Brainstorming
  | 'idea_trees'
  // Generic Storage
  | 'lists'
  // Reference Data
  | 'skills_master';

/**
 * Parsed connection from the database
 */
export interface ParsedConnection {
  id: number;
  name: string;
  method: ConnectionMethod;
  params: ConnectionParams;
  implementationNotes: string;
}

/**
 * Data object tiers by usage frequency
 */
export type DataTier = 'critical' | 'high' | 'supporting';

/**
 * Critical data objects (used 5+ times)
 */
export interface CriticalDataObjects {
  soaredStories: SOAREDStory[];
  topTransferableSkills: RankedSkill[];
  topSoftSkills: RankedSkill[];
  valueCompassStatement: string | null;
  careerOptions: CareerOption[];
  identityStory: string | null;
}

/**
 * High priority data objects (used 2-4 times)
 */
export interface HighPriorityDataObjects {
  mbtiCode: string | null;
  experiences: Experience[];
  flowActivities: FlowActivity[];
  workFactorRankings: RankedItem[];
  workValuesStatement: string | null;
  lifeValuesStatement: string | null;
  professionalHeadline: string | null;
  professionalSummary: string | null;
  budget: BudgetData | null;
}

// ============================================================
// DATA STRUCTURE TYPES
// ============================================================

export interface SOAREDStory {
  id: string;
  experienceId: string | null;
  title: string | null;
  situation: string;
  obstacle: string;
  action: string;
  result: string;
  evaluation: string;
  discovery: string;
}

export interface RankedSkill {
  id: string;
  skillId: string;
  name: string;
  category: 'transferable' | 'self_management' | 'knowledge';
  mastery: 1 | 2 | 3 | 4 | 5;
  rank: number;
}

export interface CareerOption {
  id: string;
  title: string;
  description: string | null;
  rank: 1 | 2 | 3;
  coherenceScore: number | null;
  workNeedsScore: number | null;
  lifeNeedsScore: number | null;
  unknownsScore: number | null;
}

export interface Experience {
  id: string;
  title: string;
  organization: string | null;
  type: 'job' | 'education' | 'project' | 'other';
  startDate: string | null;
  endDate: string | null;
  description: string | null;
}

export interface FlowActivity {
  id: string;
  activity: string;
  energy: -2 | -1 | 0 | 1 | 2;
  focus: 1 | 2 | 3 | 4 | 5;
  loggedDate: string;
  isHighFlow: boolean; // energy >= 1 && focus >= 4
}

export interface RankedItem {
  id: string;
  content: string;
  rank: number;
}

export interface BudgetData {
  monthlyExpenses: number;
  annualNeeds: number;
  hourlyBatna: number;
  benefitsNeeded: string | null;
}

// ============================================================
// CONNECTION RESOLUTION TYPES
// ============================================================

/**
 * Result of resolving a connection
 */
export interface ConnectionResult<T = unknown> {
  connectionId: number;
  method: ConnectionMethod;
  data: T | null;
  isEmpty: boolean;
  sourceExercise: string | null;
  error?: string;
}

/**
 * Options for fetching connected data
 */
export interface FetchConnectionOptions {
  userId: string;
  connectionId: number;
  exerciseId?: string;
}

/**
 * Cascade update notification
 */
export interface CascadeUpdate {
  sourceExercise: string;
  affectedExercises: string[];
  dataObject: string;
  updatedAt: string;
}
