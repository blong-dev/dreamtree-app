/**
 * Tool Data Schema Validation (IMP-043)
 *
 * Validates tool response JSON against expected schemas.
 * Returns { valid: true } or { valid: false, error: string }
 */

type ValidationResult = { valid: true } | { valid: false; error: string };

// Tool name to validator mapping
const TOOL_VALIDATORS: Record<string, (data: unknown) => ValidationResult> = {
  'list_builder': validateListBuilder,
  'soared_form': validateSOAREDForm,
  'skill_tagger': validateSkillTagger,
  'ranking_grid': validateRankingGrid,
  'flow_tracker': validateFlowTracker,
  'life_dashboard': validateLifeDashboard,
  'failure_reframer': validateFailureReframer,
  'bucketing_tool': validateBucketingTool,
  'mbti_selector': validateMBTISelector,
  'budget_calculator': validateBudgetCalculator,
  'idea_tree': validateIdeaTree,
  'mindset_profiles': validateMindsetProfiles,
  'career_timeline': validateCareerTimeline,
  'career_assessment': validateCareerAssessment,
  'competency_assessment': validateCompetencyAssessment,
  'experience_builder': validateExperienceBuilder,
  'tasks_per_experience_builder': validateTasksPerExperienceBuilder,
  'skill_mastery_rater': validateSkillMasteryRater,
};

/**
 * Validate tool response data against schema
 */
export function validateToolData(toolName: string, data: unknown): ValidationResult { // code_id:465
  const validator = TOOL_VALIDATORS[toolName.toLowerCase().replace(/-/g, '_')];

  if (!validator) {
    // Unknown tool - allow through (future-proofing)
    return { valid: true };
  }

  return validator(data);
}

// Helper type guards
function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val);
}

function isString(val: unknown): val is string {
  return typeof val === 'string';
}

function isNumber(val: unknown): val is number {
  return typeof val === 'number' && !isNaN(val);
}

function isBoolean(val: unknown): val is boolean {
  return typeof val === 'boolean';
}

function isStringOrNull(val: unknown): val is string | null {
  return val === null || typeof val === 'string';
}

function isNumberOrNull(val: unknown): val is number | null {
  return val === null || (typeof val === 'number' && !isNaN(val));
}

// ListBuilder: { items: [{ id: string, value: string }] } or just array
function validateListBuilder(data: unknown): ValidationResult { // code_id:469
  // Can be array directly or object with items property
  const items = isArray(data) ? data : (isObject(data) ? data.items : null);

  if (!isArray(items)) {
    return { valid: false, error: 'ListBuilder: expected array or { items: [] }' };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!isObject(item)) {
      return { valid: false, error: `ListBuilder: item[${i}] must be object` };
    }
    if (!isString(item.id)) {
      return { valid: false, error: `ListBuilder: item[${i}].id must be string` };
    }
    if (!isString(item.value)) {
      return { valid: false, error: `ListBuilder: item[${i}].value must be string` };
    }
  }

  return { valid: true };
}

// SOAREDForm: { title, situation, obstacle, action, result, evaluation, discovery, storyType }
function validateSOAREDForm(data: unknown): ValidationResult { // code_id:474
  if (!isObject(data)) {
    return { valid: false, error: 'SOAREDForm: expected object' };
  }

  const stringFields = ['title', 'situation', 'obstacle', 'action', 'result', 'evaluation', 'discovery'];
  for (const field of stringFields) {
    if (!isString(data[field])) {
      return { valid: false, error: `SOAREDForm: ${field} must be string` };
    }
  }

  if (!isString(data.storyType) || !['challenge', 'reframe', 'other'].includes(data.storyType)) {
    return { valid: false, error: 'SOAREDForm: storyType must be challenge|reframe|other' };
  }

  return { valid: true };
}

// SkillTagger: { selectedSkillIds: string[] }
function validateSkillTagger(data: unknown): ValidationResult { // code_id:475
  if (!isObject(data)) {
    return { valid: false, error: 'SkillTagger: expected object' };
  }

  if (!isArray(data.selectedSkillIds)) {
    return { valid: false, error: 'SkillTagger: selectedSkillIds must be array' };
  }

  for (let i = 0; i < data.selectedSkillIds.length; i++) {
    if (!isString(data.selectedSkillIds[i])) {
      return { valid: false, error: `SkillTagger: selectedSkillIds[${i}] must be string` };
    }
  }

  return { valid: true };
}

// RankingGrid: { items: [...], comparisons: [...] }
function validateRankingGrid(data: unknown): ValidationResult { // code_id:476
  if (!isObject(data)) {
    return { valid: false, error: 'RankingGrid: expected object' };
  }

  if (!isArray(data.items)) {
    return { valid: false, error: 'RankingGrid: items must be array' };
  }

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (!isObject(item)) {
      return { valid: false, error: `RankingGrid: items[${i}] must be object` };
    }
    if (!isString(item.id) || !isString(item.value)) {
      return { valid: false, error: `RankingGrid: items[${i}] must have id and value strings` };
    }
  }

  if (!isArray(data.comparisons)) {
    return { valid: false, error: 'RankingGrid: comparisons must be array' };
  }

  for (let i = 0; i < data.comparisons.length; i++) {
    const comp = data.comparisons[i];
    if (!isObject(comp) || !isString(comp.winnerId) || !isString(comp.loserId)) {
      return { valid: false, error: `RankingGrid: comparisons[${i}] must have winnerId and loserId` };
    }
  }

  return { valid: true };
}

// FlowTracker: { entries: [{ id, date, activity, energy, focus, notes? }] }
function validateFlowTracker(data: unknown): ValidationResult { // code_id:477
  if (!isObject(data)) {
    return { valid: false, error: 'FlowTracker: expected object' };
  }

  if (!isArray(data.entries)) {
    return { valid: false, error: 'FlowTracker: entries must be array' };
  }

  for (let i = 0; i < data.entries.length; i++) {
    const entry = data.entries[i];
    if (!isObject(entry)) {
      return { valid: false, error: `FlowTracker: entries[${i}] must be object` };
    }
    if (!isString(entry.id) || !isString(entry.date) || !isString(entry.activity)) {
      return { valid: false, error: `FlowTracker: entries[${i}] missing required string fields` };
    }
    if (!isNumber(entry.energy) || entry.energy < -2 || entry.energy > 2) {
      return { valid: false, error: `FlowTracker: entries[${i}].energy must be -2 to 2` };
    }
    if (!isNumber(entry.focus) || entry.focus < 1 || entry.focus > 5) {
      return { valid: false, error: `FlowTracker: entries[${i}].focus must be 1 to 5` };
    }
  }

  return { valid: true };
}

// LifeDashboard: { work, play, love, health } (1-10 or null)
function validateLifeDashboard(data: unknown): ValidationResult { // code_id:478
  if (!isObject(data)) {
    return { valid: false, error: 'LifeDashboard: expected object' };
  }

  const fields = ['work', 'play', 'love', 'health'];
  for (const field of fields) {
    const val = data[field];
    if (!isNumberOrNull(val)) {
      return { valid: false, error: `LifeDashboard: ${field} must be number or null` };
    }
    if (isNumber(val) && (val < 1 || val > 10)) {
      return { valid: false, error: `LifeDashboard: ${field} must be 1-10` };
    }
  }

  return { valid: true };
}

// FailureReframer: all string fields
function validateFailureReframer(data: unknown): ValidationResult { // code_id:479
  if (!isObject(data)) {
    return { valid: false, error: 'FailureReframer: expected object' };
  }

  const fields = ['situation', 'initialFeelings', 'whatLearned', 'whatWouldChange', 'silverLining', 'nextStep', 'reframedStatement'];
  for (const field of fields) {
    if (!isString(data[field])) {
      return { valid: false, error: `FailureReframer: ${field} must be string` };
    }
  }

  return { valid: true };
}

// BucketingTool: { items: [...], bucketLabels: [5 strings] }
function validateBucketingTool(data: unknown): ValidationResult { // code_id:480
  if (!isObject(data)) {
    return { valid: false, error: 'BucketingTool: expected object' };
  }

  if (!isArray(data.items)) {
    return { valid: false, error: 'BucketingTool: items must be array' };
  }

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (!isObject(item) || !isString(item.id) || !isString(item.value)) {
      return { valid: false, error: `BucketingTool: items[${i}] must have id and value` };
    }
    if (item.bucketIndex !== null && (!isNumber(item.bucketIndex) || item.bucketIndex < 0 || item.bucketIndex > 4)) {
      return { valid: false, error: `BucketingTool: items[${i}].bucketIndex must be 0-4 or null` };
    }
  }

  if (!isArray(data.bucketLabels) || data.bucketLabels.length !== 5) {
    return { valid: false, error: 'BucketingTool: bucketLabels must be array of 5 strings' };
  }

  return { valid: true };
}

// MBTISelector: { selectedCode: string | null }
function validateMBTISelector(data: unknown): ValidationResult { // code_id:481
  if (!isObject(data)) {
    return { valid: false, error: 'MBTISelector: expected object' };
  }

  if (!isStringOrNull(data.selectedCode)) {
    return { valid: false, error: 'MBTISelector: selectedCode must be string or null' };
  }

  return { valid: true };
}

// BudgetCalculator: complex object with expenses array
function validateBudgetCalculator(data: unknown): ValidationResult { // code_id:482
  if (!isObject(data)) {
    return { valid: false, error: 'BudgetCalculator: expected object' };
  }

  if (!isNumber(data.grossMonthlyIncome) || !isNumber(data.grossYearlyIncome)) {
    return { valid: false, error: 'BudgetCalculator: income values must be numbers' };
  }

  if (!isString(data.incomeInputMode) || !['monthly', 'yearly'].includes(data.incomeInputMode)) {
    return { valid: false, error: 'BudgetCalculator: incomeInputMode must be monthly|yearly' };
  }

  const validFilingStatuses = ['single', 'married', 'married_separate', 'head_of_household'];
  if (!isString(data.filingStatus) || !validFilingStatuses.includes(data.filingStatus)) {
    return { valid: false, error: 'BudgetCalculator: invalid filingStatus' };
  }

  if (!isArray(data.expenses)) {
    return { valid: false, error: 'BudgetCalculator: expenses must be array' };
  }

  for (let i = 0; i < data.expenses.length; i++) {
    const exp = data.expenses[i];
    if (!isObject(exp) || !isString(exp.id) || !isString(exp.name) || !isNumber(exp.amount) || !isBoolean(exp.isEssential)) {
      return { valid: false, error: `BudgetCalculator: expenses[${i}] invalid structure` };
    }
  }

  return { valid: true };
}

// IdeaTree: { rootIdea, layer1: [3], layer2A-C: [3], layer3*: [3], isComplete }
function validateIdeaTree(data: unknown): ValidationResult { // code_id:483
  if (!isObject(data)) {
    return { valid: false, error: 'IdeaTree: expected object' };
  }

  if (!isString(data.rootIdea)) {
    return { valid: false, error: 'IdeaTree: rootIdea must be string' };
  }

  const arrayFields = ['layer1', 'layer2A', 'layer2B', 'layer2C',
    'layer3A1', 'layer3A2', 'layer3A3', 'layer3B1', 'layer3B2', 'layer3B3',
    'layer3C1', 'layer3C2', 'layer3C3'];

  for (const field of arrayFields) {
    if (!isArray(data[field]) || (data[field] as unknown[]).length !== 3) {
      return { valid: false, error: `IdeaTree: ${field} must be array of 3` };
    }
    for (const val of data[field] as unknown[]) {
      if (!isString(val)) {
        return { valid: false, error: `IdeaTree: ${field} values must be strings` };
      }
    }
  }

  return { valid: true };
}

// MindsetProfiles: { selectedCharacters: { type: string } }
function validateMindsetProfiles(data: unknown): ValidationResult { // code_id:484
  if (!isObject(data)) {
    return { valid: false, error: 'MindsetProfiles: expected object' };
  }

  if (!isObject(data.selectedCharacters)) {
    return { valid: false, error: 'MindsetProfiles: selectedCharacters must be object' };
  }

  const mindsets = ['curiosity', 'bias-to-action', 'reframing', 'awareness', 'radical-collaboration'];
  for (const mindset of mindsets) {
    if (!isString((data.selectedCharacters as Record<string, unknown>)[mindset])) {
      return { valid: false, error: `MindsetProfiles: selectedCharacters.${mindset} must be string` };
    }
  }

  return { valid: true };
}

// CareerTimeline: { milestones: [...], startYear }
function validateCareerTimeline(data: unknown): ValidationResult { // code_id:485
  if (!isObject(data)) {
    return { valid: false, error: 'CareerTimeline: expected object' };
  }

  if (!isNumber(data.startYear)) {
    return { valid: false, error: 'CareerTimeline: startYear must be number' };
  }

  if (!isArray(data.milestones)) {
    return { valid: false, error: 'CareerTimeline: milestones must be array' };
  }

  const validCategories = ['work', 'education', 'personal', 'skill'];
  for (let i = 0; i < data.milestones.length; i++) {
    const ms = data.milestones[i];
    if (!isObject(ms) || !isString(ms.id) || !isNumber(ms.year) || !isString(ms.title)) {
      return { valid: false, error: `CareerTimeline: milestones[${i}] missing required fields` };
    }
    if (!isNumber(ms.quarter) || ms.quarter < 1 || ms.quarter > 4) {
      return { valid: false, error: `CareerTimeline: milestones[${i}].quarter must be 1-4` };
    }
    if (!isString(ms.category) || !validCategories.includes(ms.category)) {
      return { valid: false, error: `CareerTimeline: milestones[${i}].category invalid` };
    }
  }

  return { valid: true };
}

// CareerAssessment: { options: [...] }
function validateCareerAssessment(data: unknown): ValidationResult { // code_id:486
  if (!isObject(data)) {
    return { valid: false, error: 'CareerAssessment: expected object' };
  }

  if (!isArray(data.options)) {
    return { valid: false, error: 'CareerAssessment: options must be array' };
  }

  for (let i = 0; i < data.options.length; i++) {
    const opt = data.options[i];
    if (!isObject(opt) || !isString(opt.id) || !isString(opt.title)) {
      return { valid: false, error: `CareerAssessment: options[${i}] must have id and title` };
    }
    // Score fields are nullable
    const scoreFields = ['coherenceScore', 'workNeedsScore', 'lifeNeedsScore', 'unknownsScore'];
    for (const field of scoreFields) {
      const val = opt[field];
      if (val !== null && (!isNumber(val) || val < 1 || val > 5)) {
        return { valid: false, error: `CareerAssessment: options[${i}].${field} must be 1-5 or null` };
      }
    }
  }

  return { valid: true };
}

// CompetencyAssessment: { scores: [{ competencyId, score }] }
function validateCompetencyAssessment(data: unknown): ValidationResult { // code_id:487
  if (!isObject(data)) {
    return { valid: false, error: 'CompetencyAssessment: expected object' };
  }

  if (!isArray(data.scores)) {
    return { valid: false, error: 'CompetencyAssessment: scores must be array' };
  }

  for (let i = 0; i < data.scores.length; i++) {
    const score = data.scores[i];
    if (!isObject(score) || !isString(score.competencyId)) {
      return { valid: false, error: `CompetencyAssessment: scores[${i}] must have competencyId` };
    }
    if (!isNumber(score.score) || score.score < 1 || score.score > 5) {
      return { valid: false, error: `CompetencyAssessment: scores[${i}].score must be 1-5` };
    }
  }

  return { valid: true };
}

// ExperienceBuilder: { experiences: [{ id, title, organization, experienceType, startDate, endDate }] }
function validateExperienceBuilder(data: unknown): ValidationResult { // code_id:488
  if (!isObject(data)) {
    return { valid: false, error: 'ExperienceBuilder: expected object' };
  }

  if (!isArray(data.experiences)) {
    return { valid: false, error: 'ExperienceBuilder: experiences must be array' };
  }

  const validTypes = ['job', 'education', 'project', 'other'];
  for (let i = 0; i < data.experiences.length; i++) {
    const exp = data.experiences[i];
    if (!isObject(exp)) {
      return { valid: false, error: `ExperienceBuilder: experiences[${i}] must be object` };
    }
    if (!isString(exp.id)) {
      return { valid: false, error: `ExperienceBuilder: experiences[${i}].id must be string` };
    }
    if (!isString(exp.title) || exp.title.trim() === '') {
      return { valid: false, error: `ExperienceBuilder: experiences[${i}].title must be non-empty string` };
    }
    if (!isString(exp.organization) && exp.organization !== '') {
      return { valid: false, error: `ExperienceBuilder: experiences[${i}].organization must be string` };
    }
    if (!isString(exp.experienceType) || !validTypes.includes(exp.experienceType)) {
      return { valid: false, error: `ExperienceBuilder: experiences[${i}].experienceType must be job|education|project|other` };
    }
    // Dates are optional strings
    if (exp.startDate !== undefined && exp.startDate !== '' && !isString(exp.startDate)) {
      return { valid: false, error: `ExperienceBuilder: experiences[${i}].startDate must be string` };
    }
    if (exp.endDate !== undefined && exp.endDate !== '' && !isString(exp.endDate)) {
      return { valid: false, error: `ExperienceBuilder: experiences[${i}].endDate must be string` };
    }
  }

  return { valid: true };
}

// TasksPerExperienceBuilder: { experiencesWithTasks: [{ experience: {...}, tasks: [{id, value}] }] }
function validateTasksPerExperienceBuilder(data: unknown): ValidationResult { // code_id:489
  if (!isObject(data)) {
    return { valid: false, error: 'TasksPerExperienceBuilder: expected object' };
  }

  if (!isArray(data.experiencesWithTasks)) {
    return { valid: false, error: 'TasksPerExperienceBuilder: experiencesWithTasks must be array' };
  }

  for (let i = 0; i < data.experiencesWithTasks.length; i++) {
    const item = data.experiencesWithTasks[i];
    if (!isObject(item)) {
      return { valid: false, error: `TasksPerExperienceBuilder: experiencesWithTasks[${i}] must be object` };
    }

    // Validate experience object
    if (!isObject(item.experience)) {
      return { valid: false, error: `TasksPerExperienceBuilder: experiencesWithTasks[${i}].experience must be object` };
    }
    if (!isString(item.experience.id)) {
      return { valid: false, error: `TasksPerExperienceBuilder: experiencesWithTasks[${i}].experience.id must be string` };
    }

    // Validate tasks array
    if (!isArray(item.tasks)) {
      return { valid: false, error: `TasksPerExperienceBuilder: experiencesWithTasks[${i}].tasks must be array` };
    }

    for (let j = 0; j < item.tasks.length; j++) {
      const task = item.tasks[j];
      if (!isObject(task)) {
        return { valid: false, error: `TasksPerExperienceBuilder: experiencesWithTasks[${i}].tasks[${j}] must be object` };
      }
      if (!isString(task.id)) {
        return { valid: false, error: `TasksPerExperienceBuilder: experiencesWithTasks[${i}].tasks[${j}].id must be string` };
      }
      if (!isString(task.value) || task.value.trim() === '') {
        return { valid: false, error: `TasksPerExperienceBuilder: experiencesWithTasks[${i}].tasks[${j}].value must be non-empty string` };
      }
    }
  }

  return { valid: true };
}

// SkillMasteryRater: { skills: [{ id, name, mastery }] }
function validateSkillMasteryRater(data: unknown): ValidationResult { // code_id:490
  if (!isObject(data)) {
    return { valid: false, error: 'SkillMasteryRater: expected object' };
  }

  if (!isArray(data.skills)) {
    return { valid: false, error: 'SkillMasteryRater: skills must be array' };
  }

  for (let i = 0; i < data.skills.length; i++) {
    const skill = data.skills[i];
    if (!isObject(skill)) {
      return { valid: false, error: `SkillMasteryRater: skills[${i}] must be object` };
    }
    if (!isString(skill.id)) {
      return { valid: false, error: `SkillMasteryRater: skills[${i}].id must be string` };
    }
    if (!isString(skill.name)) {
      return { valid: false, error: `SkillMasteryRater: skills[${i}].name must be string` };
    }
    if (!isNumber(skill.mastery) || skill.mastery < 1 || skill.mastery > 10) {
      return { valid: false, error: `SkillMasteryRater: skills[${i}].mastery must be 1-10` };
    }
  }

  return { valid: true };
}
