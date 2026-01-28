// DreamTree Tool Types
// Base types for all tool components

export type ToolType =
  | 'list-builder'
  | 'ranking-grid'
  | 'soared-story'
  | 'skill-tagger'
  | 'mbti-selector'
  | 'budget-calculator'
  | 'flow-tracker'
  | 'life-dashboard'
  | 'mindset-profiles'
  | 'failure-reframer'
  | 'idea-tree'
  | 'career-timeline'
  | 'career-assessment'
  | 'bucketing-tool'
  | 'competency-assessment';

export type WorkbookSource = {
  type: 'workbook';
  partId: string;
  moduleId: string;
  exerciseId: string;
};

export type UserCreated = {
  type: 'user';
};

export type ToolSource = WorkbookSource | UserCreated;

export interface BaseToolProps<T> {
  instanceId: string;
  instanceName: string;
  data: T;
  onChange: (data: T) => void;
  mode: 'embedded' | 'standalone';
  source: ToolSource;
  disabled?: boolean;
  readOnly?: boolean;
}

export interface ToolInstance<T = unknown> {
  id: string;
  toolType: ToolType;
  name: string;
  source: ToolSource;
  data: T;
  createdAt: Date;
  updatedAt: Date;
}

// ListBuilder types
export interface ListItem {
  id: string;
  value: string;
}

export interface ListBuilderData {
  items: ListItem[];
}

// RankingGrid types
export interface RankingItem {
  id: string;
  value: string;
  rank?: number;
}

export interface Comparison {
  winnerId: string;
  loserId: string;
}

export interface RankingGridData {
  items: RankingItem[];
  comparisons: Comparison[];
  isComplete: boolean;
}

// SOARED Story types
export type StoryType = 'challenge' | 'reframe' | 'other';

export interface SOAREDStoryData {
  title: string;
  situation: string;
  obstacle: string;
  action: string;
  result: string;
  evaluation: string;
  discovery: string;
  storyType: StoryType;
}

// Flow Tracker types
// energy: -2 (draining) to +2 (energizing) - bidirectional scale
// focus: 1 (distracted) to 5 (absorbed) - unidirectional scale
export interface FlowEntry {
  id: string;
  date: string;
  activity: string;
  energy: -2 | -1 | 0 | 1 | 2;
  focus: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface FlowTrackerData {
  entries: FlowEntry[];
}

// Helper to determine if an activity is "high flow"
export function isHighFlowActivity(entry: FlowEntry): boolean { // code_id:354
  return entry.energy >= 1 && entry.focus >= 4;
}

// Life Dashboard types
export interface LifeDashboardData {
  work: number | null; // 1-10
  play: number | null;
  love: number | null;
  health: number | null;
  notes?: string;
}

// Failure Reframer types
export interface FailureReframerData {
  situation: string;
  initialFeelings: string;
  whatLearned: string;
  whatWouldChange: string;
  silverLining: string;
  nextStep: string;
  reframedStatement: string;
}

// Bucketing Tool types
export interface BucketItem {
  id: string;
  value: string;
  bucketIndex: number | null; // 0-4, null if unassigned (0 = most used)
}

export interface BucketingToolData {
  items: BucketItem[];
  bucketLabels: [string, string, string, string, string];
}

/**
 * Transform bucket index (0-4, where 0 = most used) to mastery level (1-5, where 5 = highest)
 * Used when persisting bucketed skills to user_skills.mastery
 */
export function bucketIndexToMastery(bucketIndex: number | null): number | null {
  if (bucketIndex === null) return null;
  // bucketIndex 0 (most used) → mastery 5 (highest)
  // bucketIndex 4 (least used) → mastery 1 (lowest)
  return 5 - bucketIndex;
}

/**
 * Transform mastery level (1-5) to bucket index (0-4)
 * Used when loading bucketed skills from user_skills.mastery
 */
export function masteryToBucketIndex(mastery: number | null): number | null {
  if (mastery === null) return null;
  return 5 - mastery;
}

// SkillTagger types
// Internal storage uses underscore; display uses hyphen
export type SkillCategory = 'transferable' | 'self_management' | 'knowledge';

// Display labels for skill categories (user-facing)
export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  transferable: 'Transferable Skills',
  self_management: 'Self-Management Skills',
  knowledge: 'Knowledges',
};

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  mastery: number; // 1-5
}

export interface SkillTaggerData {
  selectedSkillIds: string[];
  storyTitle?: string;
}

// MBTISelector types
export interface MBTIType {
  code: string; // e.g., "INTJ"
  name: string; // e.g., "The Architect"
  summary?: string;
}

export interface MBTISelectorData {
  selectedCode: string | null;
}

// BudgetCalculator types
export type FilingStatus = 'single' | 'married' | 'married_separate' | 'head_of_household';

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  isEssential: boolean;
}

export interface BudgetCalculatorData {
  grossMonthlyIncome: number;
  grossYearlyIncome: number;
  incomeInputMode: 'monthly' | 'yearly';
  filingStatus: FilingStatus;
  stateCode: string | null;
  expenses: ExpenseItem[];
  notes: string;
}

// BudgetData - the format expected by connections/database
export interface BudgetData {
  monthlyExpenses: number; // Stored as cents (integer)
  annualNeeds: number; // Stored as cents (integer)
  hourlyBatna: number; // Stored as cents (integer) for precision
  benefitsNeeded: string | null;
  notes: string | null;
}

/**
 * Transform BudgetCalculatorData (tool format) to BudgetData (connection format)
 * This is used when persisting budget data to the database or passing to connections.
 * All monetary values are stored as cents (integers) to avoid floating point precision issues.
 */
export function toBudgetData(calculatorData: BudgetCalculatorData): BudgetData { // code_id:357
  const monthlyExpenses = calculatorData.expenses.reduce((sum, e) => sum + e.amount, 0);
  const annualNeeds = monthlyExpenses * 12;
  // Standard work year: 52 weeks × 40 hours = 2080 hours
  const hourlyBatna = annualNeeds / 2080;

  // Determine benefits needed based on essential expenses
  const essentialExpenses = calculatorData.expenses.filter(e => e.isEssential);
  const hasInsurance = essentialExpenses.some(e =>
    e.name.toLowerCase().includes('insurance') ||
    e.name.toLowerCase().includes('health')
  );
  const benefitsNeeded = hasInsurance ? 'health_insurance' : null;

  return {
    monthlyExpenses: Math.round(monthlyExpenses * 100), // Convert to cents
    annualNeeds: Math.round(annualNeeds * 100), // Convert to cents
    hourlyBatna: Math.round(hourlyBatna * 100), // Convert to cents (e.g., $27.45 = 2745)
    benefitsNeeded,
    notes: calculatorData.notes || null,
  };
}

// MindsetProfiles types
export type MindsetType = 'curiosity' | 'bias-to-action' | 'reframing' | 'awareness' | 'radical-collaboration';

export interface MindsetProfile {
  type: MindsetType;
  name: string;
  description: string;
  character?: string;
}

export interface MindsetProfilesData {
  selectedCharacters: Record<MindsetType, string>;
}

// IdeaTree types - UI format (flat structure for easy editing)
export interface IdeaTreeData {
  rootIdea: string;
  layer1: [string, string, string];
  layer2A: [string, string, string];
  layer2B: [string, string, string];
  layer2C: [string, string, string];
  layer3A1: [string, string, string];
  layer3A2: [string, string, string];
  layer3A3: [string, string, string];
  layer3B1: [string, string, string];
  layer3B2: [string, string, string];
  layer3B3: [string, string, string];
  layer3C1: [string, string, string];
  layer3C2: [string, string, string];
  layer3C3: [string, string, string];
  isComplete: boolean;
}

// IdeaTree DB format - normalized graph structure
export interface IdeaTreeNode {
  id: string;
  content: string;
}

export interface IdeaTreeEdge {
  fromNodeId: string;
  toNodeId: string;
}

export interface IdeaTreeDBData {
  treeId: string;
  treeName: string;
  nodes: IdeaTreeNode[];
  edges: IdeaTreeEdge[];
  rootNodeId: string;
}

/**
 * Convert flat IdeaTreeData (UI format) to IdeaTreeDBData (database format)
 */
export function toIdeaTreeDB(data: IdeaTreeData, treeId: string, treeName: string): IdeaTreeDBData { // code_id:358
  const nodes: IdeaTreeNode[] = [];
  const edges: IdeaTreeEdge[] = [];

  // Helper to create a node if content exists
  const createNode = (content: string, prefix: string, index: number): string | null => {
    if (!content.trim()) return null;
    const id = `${treeId}-${prefix}-${index}`;
    nodes.push({ id, content: content.trim() });
    return id;
  };

  // Root node
  const rootId = createNode(data.rootIdea, 'root', 0);
  if (!rootId) { // code_id:361
    return { treeId, treeName, nodes: [], edges: [], rootNodeId: '' };
  }

  // Layer 1 nodes and edges to root
  const layer1Ids = data.layer1.map((content, i) => {
    const nodeId = createNode(content, 'L1', i);
    if (nodeId) edges.push({ fromNodeId: rootId, toNodeId: nodeId });
    return nodeId;
  });

  // Layer 2 nodes and edges to layer 1
  const layer2Groups = [data.layer2A, data.layer2B, data.layer2C];
  const layer2Ids: (string | null)[][] = [];

  layer2Groups.forEach((group, groupIdx) => {
    const groupIds = group.map((content, i) => {
      const parentId = layer1Ids[groupIdx];
      const nodeId = createNode(content, `L2${String.fromCharCode(65 + groupIdx)}`, i);
      if (nodeId && parentId) edges.push({ fromNodeId: parentId, toNodeId: nodeId });
      return nodeId;
    });
    layer2Ids.push(groupIds);
  });

  // Layer 3 nodes and edges to layer 2
  const layer3Groups = [
    [data.layer3A1, data.layer3A2, data.layer3A3], // under layer2A
    [data.layer3B1, data.layer3B2, data.layer3B3], // under layer2B
    [data.layer3C1, data.layer3C2, data.layer3C3], // under layer2C
  ];

  layer3Groups.forEach((parentGroup, parentGroupIdx) => {
    parentGroup.forEach((group, groupIdx) => {
      group.forEach((content, i) => {
        const parentId = layer2Ids[parentGroupIdx][groupIdx];
        const prefix = `L3${String.fromCharCode(65 + parentGroupIdx)}${groupIdx + 1}`;
        const nodeId = createNode(content, prefix, i);
        if (nodeId && parentId) edges.push({ fromNodeId: parentId, toNodeId: nodeId });
      });
    });
  });

  return { treeId, treeName, nodes, edges, rootNodeId: rootId };
}

/**
 * Convert IdeaTreeDBData (database format) to flat IdeaTreeData (UI format)
 */
export function fromIdeaTreeDB(dbData: IdeaTreeDBData): IdeaTreeData { // code_id:359
  const emptyData = getDefaultIdeaTreeData();

  if (!dbData.rootNodeId || dbData.nodes.length === 0) {
    return emptyData;
  }

  // Build adjacency map: parentId -> childIds (ordered)
  const childrenMap = new Map<string, string[]>();
  dbData.edges.forEach(edge => {
    const children = childrenMap.get(edge.fromNodeId) || [];
    children.push(edge.toNodeId);
    childrenMap.set(edge.fromNodeId, children);
  });

  // Build content map: nodeId -> content
  const contentMap = new Map<string, string>();
  dbData.nodes.forEach(node => contentMap.set(node.id, node.content));

  // Get content for a node, or empty string
  const getContent = (nodeId: string | undefined): string =>
    nodeId ? (contentMap.get(nodeId) || '') : '';

  // Get children of a node
  const getChildren = (nodeId: string | undefined): string[] =>
    nodeId ? (childrenMap.get(nodeId) || []) : [];

  // Traverse the tree
  const rootContent = getContent(dbData.rootNodeId);
  const layer1Children = getChildren(dbData.rootNodeId);

  const layer1: [string, string, string] = [
    getContent(layer1Children[0]),
    getContent(layer1Children[1]),
    getContent(layer1Children[2]),
  ];

  // Layer 2
  const l1aChildren = getChildren(layer1Children[0]);
  const l1bChildren = getChildren(layer1Children[1]);
  const l1cChildren = getChildren(layer1Children[2]);

  const layer2A: [string, string, string] = [getContent(l1aChildren[0]), getContent(l1aChildren[1]), getContent(l1aChildren[2])];
  const layer2B: [string, string, string] = [getContent(l1bChildren[0]), getContent(l1bChildren[1]), getContent(l1bChildren[2])];
  const layer2C: [string, string, string] = [getContent(l1cChildren[0]), getContent(l1cChildren[1]), getContent(l1cChildren[2])];

  // Layer 3
  const getLayer3 = (parentChildren: string[], idx: number): [string, string, string] => {
    const parent = parentChildren[idx];
    const children = getChildren(parent);
    return [getContent(children[0]), getContent(children[1]), getContent(children[2])];
  };

  return {
    rootIdea: rootContent,
    layer1,
    layer2A, layer2B, layer2C,
    layer3A1: getLayer3(l1aChildren, 0),
    layer3A2: getLayer3(l1aChildren, 1),
    layer3A3: getLayer3(l1aChildren, 2),
    layer3B1: getLayer3(l1bChildren, 0),
    layer3B2: getLayer3(l1bChildren, 1),
    layer3B3: getLayer3(l1bChildren, 2),
    layer3C1: getLayer3(l1cChildren, 0),
    layer3C2: getLayer3(l1cChildren, 1),
    layer3C3: getLayer3(l1cChildren, 2),
    isComplete: true, // Loaded from DB means it was saved
  };
}

// Helper to create empty IdeaTreeData
export function getDefaultIdeaTreeData(): IdeaTreeData { // code_id:360
  return {
    rootIdea: '',
    layer1: ['', '', ''],
    layer2A: ['', '', ''], layer2B: ['', '', ''], layer2C: ['', '', ''],
    layer3A1: ['', '', ''], layer3A2: ['', '', ''], layer3A3: ['', '', ''],
    layer3B1: ['', '', ''], layer3B2: ['', '', ''], layer3B3: ['', '', ''],
    layer3C1: ['', '', ''], layer3C2: ['', '', ''], layer3C3: ['', '', ''],
    isComplete: false,
  };
}

// JobCombiner removed - not needed for MVP

// CareerTimeline types
export interface TimelineMilestone {
  id: string;
  year: number;
  quarter: 1 | 2 | 3 | 4;
  title: string;
  category: 'work' | 'education' | 'personal' | 'skill';
  description?: string;
}

export interface CareerTimelineData {
  milestones: TimelineMilestone[];
  startYear: number;
}

// CareerAssessment types
export interface CareerOption {
  id: string;
  title: string;
  description: string | null; // Summary of the career option
  rank: 1 | 2 | 3 | null; // Priority ranking (1 = top choice)
  coherenceScore: number | null; // 1-5: How well it fits your identity
  workNeedsScore: number | null; // 1-5: How well it meets work needs
  lifeNeedsScore: number | null; // 1-5: How well it meets life needs
  unknownsScore: number | null; // 1-5: Lower = fewer unknowns = better
  notes: string; // User notes during assessment
}

export interface CareerAssessmentData {
  options: CareerOption[];
}

// CompetencyAssessment types
export type CompetencyCategory = 'delivery' | 'interpersonal' | 'strategic';

export interface Competency {
  id: string;
  name: string;
  definition: string;
  category: CompetencyCategory;
}

export interface CompetencyScore {
  competencyId: string;
  score: number; // 1-5, matches DB column name
}

export interface CompetencyAssessmentData {
  scores: CompetencyScore[];
}
