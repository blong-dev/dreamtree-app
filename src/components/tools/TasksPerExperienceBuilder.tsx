'use client';

import { useState, useId, useRef, KeyboardEvent, ReactNode, useCallback } from 'react';
import type { ExperienceEntry } from './ExperienceBuilder';
import { SkillInput, type SkillMatch } from '@/components/forms/SkillInput';

export interface TaskEntry {
  id: string;
  value: string;
  // Match metadata from SkillInput (for domain writer)
  skillId?: string | null;      // Existing skill ID if matched
  matchType?: 'exact' | 'fuzzy' | 'custom';
  matchScore?: number;          // 0-1 confidence
  inputValue?: string;          // Original input before autocomplete
}

export interface ExperienceWithTasks {
  experience: ExperienceEntry;
  tasks: TaskEntry[];
}

/**
 * Configurable labels for the component.
 * Allows reuse for different contexts (tasks/experiences vs skills/stories).
 */
export interface TasksPerExperienceLabels {
  /** Name for the parent items, e.g., "experience" or "story" */
  parentName: string;
  /** Plural form of parent name, e.g., "experiences" or "stories" */
  parentNamePlural: string;
  /** Name for the child items, e.g., "task" or "skill" */
  childName: string;
  /** Plural form of child name, e.g., "tasks" or "skills" */
  childNamePlural: string;
  /** Prompt text shown when section is expanded */
  prompt: string;
  /** Placeholder text for the add input */
  placeholder: string;
  /** Message shown when no parents exist */
  emptyMessage: string;
}

const DEFAULT_LABELS: TasksPerExperienceLabels = {
  parentName: 'experience',
  parentNamePlural: 'experiences',
  childName: 'task',
  childNamePlural: 'tasks',
  prompt: 'What tasks or responsibilities did you have in this role? Think about skills you used or developed.',
  placeholder: 'Add a task...',
  emptyMessage: 'No experiences found. Please complete Part a first.',
};

interface TasksPerExperienceBuilderProps {
  experiencesWithTasks: ExperienceWithTasks[];
  onChange: (data: ExperienceWithTasks[]) => void;
  disabled?: boolean;
  id?: string;
  /** Custom labels for different contexts */
  labels?: Partial<TasksPerExperienceLabels>;
  /** Whether to show the type badge in headers (default: true) */
  showTypeBadge?: boolean;
  /** Whether to show organization in headers (default: true) */
  showOrganization?: boolean;
  /** Optional render function for additional context below the prompt */
  renderContext?: (experience: ExperienceEntry) => ReactNode;
}

export function TasksPerExperienceBuilder({
  experiencesWithTasks,
  onChange,
  disabled = false,
  id,
  labels: customLabels,
  showTypeBadge = true,
  showOrganization = true,
  renderContext,
}: TasksPerExperienceBuilderProps) { // code_id:1020
  const generatedId = useId();
  const listId = id || generatedId;
  const labels = { ...DEFAULT_LABELS, ...customLabels };
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(experiencesWithTasks.map(e => e.experience.id))
  );

  const toggleExpanded = (expId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(expId)) {
        next.delete(expId);
      } else {
        next.add(expId);
      }
      return next;
    });
  };

  const updateTasks = (expId: string, tasks: TaskEntry[]) => {
    onChange(experiencesWithTasks.map(e =>
      e.experience.id === expId ? { ...e, tasks } : e
    ));
  };

  if (experiencesWithTasks.length === 0) {
    return (
      <div className="tasks-per-experience-empty">
        <p>{labels.emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="tasks-per-experience" data-disabled={disabled}>
      <div className="tasks-per-experience-list" role="list" aria-labelledby={`${listId}-label`}>
        {experiencesWithTasks.map((item) => (
          <ExperienceTaskSection
            key={item.experience.id}
            experience={item.experience}
            tasks={item.tasks}
            isExpanded={expandedIds.has(item.experience.id)}
            onToggle={() => toggleExpanded(item.experience.id)}
            onTasksChange={(tasks) => updateTasks(item.experience.id, tasks)}
            disabled={disabled}
            labels={labels}
            showTypeBadge={showTypeBadge}
            showOrganization={showOrganization}
            renderContext={renderContext}
          />
        ))}
      </div>

      <div className="tasks-per-experience-summary">
        {experiencesWithTasks.reduce((total, e) => total + e.tasks.length, 0)} {labels.childNamePlural} across {experiencesWithTasks.length} {labels.parentNamePlural}
      </div>
    </div>
  );
}

// Section for a single experience with its tasks
interface ExperienceTaskSectionProps {
  experience: ExperienceEntry;
  tasks: TaskEntry[];
  isExpanded: boolean;
  onToggle: () => void;
  onTasksChange: (tasks: TaskEntry[]) => void;
  disabled: boolean;
  labels: TasksPerExperienceLabels;
  showTypeBadge: boolean;
  showOrganization: boolean;
  renderContext?: (experience: ExperienceEntry) => ReactNode;
}

function ExperienceTaskSection({
  experience,
  tasks,
  isExpanded,
  onToggle,
  onTasksChange,
  disabled,
  labels,
  showTypeBadge,
  showOrganization,
  renderContext,
}: ExperienceTaskSectionProps) { // code_id:1021
  const [newTaskValue, setNewTaskValue] = useState('');
  // Track pending skill match metadata (set when SkillInput resolves)
  const pendingMatch = useRef<SkillMatch | null>(null);

  const generateId = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const addTaskWithMatch = useCallback((match: SkillMatch) => {
    if (!match.value.trim() || disabled) return;

    const newTask: TaskEntry = {
      id: generateId(),
      value: match.value.trim(),
      skillId: match.skillId,
      matchType: match.matchType,
      matchScore: match.matchScore,
      inputValue: match.inputValue,
    };

    onTasksChange([...tasks, newTask]);
    setNewTaskValue('');
    pendingMatch.current = null;
  }, [disabled, onTasksChange, tasks]);

  const handleSkillResolved = useCallback((match: SkillMatch) => {
    // Store the match and add the task
    pendingMatch.current = match;
    if (match.value.trim()) {
      addTaskWithMatch(match);
    }
  }, [addTaskWithMatch]);

  const updateTask = (taskId: string, value: string) => {
    // When editing, we lose match metadata (it becomes custom)
    onTasksChange(tasks.map(t => t.id === taskId ? {
      ...t,
      value,
      skillId: undefined,
      matchType: 'custom' as const,
      matchScore: 0,
      inputValue: value,
    } : t));
  };

  const removeTask = (taskId: string) => {
    onTasksChange(tasks.filter(t => t.id !== taskId));
  };

  const typeLabel = getTypeLabel(experience.experienceType);

  return (
    <div className="experience-task-section">
      <button
        type="button"
        className="experience-task-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
        disabled={disabled}
      >
        <div className="experience-task-header-content">
          {showTypeBadge && <span className="experience-task-type">{typeLabel}</span>}
          <span className="experience-task-title">{experience.title}</span>
          {showOrganization && experience.organization && (
            <span className="experience-task-org">at {experience.organization}</span>
          )}
        </div>
        <div className="experience-task-header-right">
          <span className="experience-task-count">{tasks.length} {labels.childNamePlural}</span>
          <ChevronIcon isExpanded={isExpanded} />
        </div>
      </button>

      {isExpanded && (
        <div className="experience-task-body">
          <p className="experience-task-prompt">
            {labels.prompt}
          </p>

          {renderContext && renderContext(experience)}

          <ul className="experience-task-list">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={(value) => updateTask(task.id, value)}
                onRemove={() => removeTask(task.id)}
                disabled={disabled}
                childName={labels.childName}
              />
            ))}
          </ul>

          <div className="experience-task-add">
            <SkillInput
              value={newTaskValue}
              onChange={setNewTaskValue}
              onSkillResolved={handleSkillResolved}
              placeholder={labels.placeholder}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Individual task item
interface TaskItemProps {
  task: TaskEntry;
  onUpdate: (value: string) => void;
  onRemove: () => void;
  disabled: boolean;
  childName: string;
}

function TaskItem({ task, onUpdate, onRemove, disabled, childName }: TaskItemProps) { // code_id:1022
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.value);

  const saveEdit = () => {
    if (editValue.trim()) {
      onUpdate(editValue.trim());
    } else {
      setEditValue(task.value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      setEditValue(task.value);
      setIsEditing(false);
    }
  };

  return (
    <li className="experience-task-item">
      {isEditing ? (
        <input
          type="text"
          className="experience-task-item-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={disabled}
        />
      ) : (
        <span
          className="experience-task-item-value"
          onClick={() => !disabled && setIsEditing(true)}
        >
          {task.value}
        </span>
      )}

      <button
        type="button"
        className="experience-task-item-remove"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${childName}`}
      >
        <XIcon />
      </button>
    </li>
  );
}

// Helper functions
function getTypeLabel(type: string): string {
  switch (type) {
    case 'job': return 'Job';
    case 'education': return 'Education';
    case 'project': return 'Project';
    default: return 'Other';
  }
}

// Icons
function ChevronIcon({ isExpanded }: { isExpanded: boolean }) { // code_id:1023
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`experience-task-chevron ${isExpanded ? 'expanded' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function XIcon() { // code_id:1024
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
