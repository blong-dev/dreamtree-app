'use client';

import { useState, useId, KeyboardEvent } from 'react';
import type { ExperienceEntry } from './ExperienceBuilder';

export interface TaskEntry {
  id: string;
  value: string;
}

export interface ExperienceWithTasks {
  experience: ExperienceEntry;
  tasks: TaskEntry[];
}

interface TasksPerExperienceBuilderProps {
  experiencesWithTasks: ExperienceWithTasks[];
  onChange: (data: ExperienceWithTasks[]) => void;
  disabled?: boolean;
  id?: string;
}

export function TasksPerExperienceBuilder({
  experiencesWithTasks,
  onChange,
  disabled = false,
  id,
}: TasksPerExperienceBuilderProps) { // code_id:1020
  const generatedId = useId();
  const listId = id || generatedId;
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
        <p>No experiences found. Please complete Part a first.</p>
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
          />
        ))}
      </div>

      <div className="tasks-per-experience-summary">
        {experiencesWithTasks.reduce((total, e) => total + e.tasks.length, 0)} tasks across {experiencesWithTasks.length} experiences
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
}

function ExperienceTaskSection({
  experience,
  tasks,
  isExpanded,
  onToggle,
  onTasksChange,
  disabled,
}: ExperienceTaskSectionProps) { // code_id:1021
  const [newTaskValue, setNewTaskValue] = useState('');

  const generateId = () => `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const addTask = () => {
    if (!newTaskValue.trim() || disabled) return;

    const newTask: TaskEntry = {
      id: generateId(),
      value: newTaskValue.trim(),
    };

    onTasksChange([...tasks, newTask]);
    setNewTaskValue('');
  };

  const updateTask = (taskId: string, value: string) => {
    onTasksChange(tasks.map(t => t.id === taskId ? { ...t, value } : t));
  };

  const removeTask = (taskId: string) => {
    onTasksChange(tasks.filter(t => t.id !== taskId));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTask();
    }
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
          <span className="experience-task-type">{typeLabel}</span>
          <span className="experience-task-title">{experience.title}</span>
          {experience.organization && (
            <span className="experience-task-org">at {experience.organization}</span>
          )}
        </div>
        <div className="experience-task-header-right">
          <span className="experience-task-count">{tasks.length} tasks</span>
          <ChevronIcon isExpanded={isExpanded} />
        </div>
      </button>

      {isExpanded && (
        <div className="experience-task-body">
          <p className="experience-task-prompt">
            What tasks or responsibilities did you have in this role? Think about skills you used or developed.
          </p>

          <ul className="experience-task-list">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={(value) => updateTask(task.id, value)}
                onRemove={() => removeTask(task.id)}
                disabled={disabled}
              />
            ))}
          </ul>

          <div className="experience-task-add">
            <input
              type="text"
              className="experience-task-add-input"
              placeholder="Add a task..."
              value={newTaskValue}
              onChange={(e) => setNewTaskValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => newTaskValue.trim() && addTask()}
              disabled={disabled}
            />
            <button
              type="button"
              className="experience-task-add-button"
              onClick={addTask}
              disabled={disabled || !newTaskValue.trim()}
            >
              Add
            </button>
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
}

function TaskItem({ task, onUpdate, onRemove, disabled }: TaskItemProps) { // code_id:1022
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
        aria-label="Remove task"
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
