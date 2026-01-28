'use client';

import { useState, useId, KeyboardEvent } from 'react';
import type { ExperienceType } from '@/types/database';

export interface ExperienceEntry {
  id: string;
  title: string;
  organization: string;
  experienceType: ExperienceType;
  startDate: string;
  endDate: string; // Empty string or "present" for ongoing
}

interface ExperienceBuilderProps {
  experiences: ExperienceEntry[];
  onChange: (experiences: ExperienceEntry[]) => void;
  disabled?: boolean;
  id?: string;
}

const EXPERIENCE_TYPES: { value: ExperienceType; label: string }[] = [
  { value: 'job', label: 'Job' },
  { value: 'project', label: 'Project' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

export function ExperienceBuilder({
  experiences,
  onChange,
  disabled = false,
  id,
}: ExperienceBuilderProps) { // code_id:1001
  const generatedId = useId();
  const listId = id || generatedId;
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const generateId = () => `exp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const handleAdd = (entry: Omit<ExperienceEntry, 'id'>) => {
    const newEntry: ExperienceEntry = {
      id: generateId(),
      ...entry,
    };
    onChange([...experiences, newEntry]);
    setIsAdding(false);
  };

  const handleUpdate = (id: string, entry: Omit<ExperienceEntry, 'id'>) => {
    onChange(experiences.map(exp =>
      exp.id === id ? { ...entry, id } : exp
    ));
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    onChange(experiences.filter(exp => exp.id !== id));
  };

  return (
    <div className="experience-builder" data-disabled={disabled}>
      <ul className="experience-builder-list" role="list" aria-labelledby={`${listId}-label`}>
        {experiences.map((exp) => (
          <li key={exp.id} className="experience-builder-item">
            {editingId === exp.id ? (
              <ExperienceForm
                initialData={exp}
                onSubmit={(data) => handleUpdate(exp.id, data)}
                onCancel={() => setEditingId(null)}
                disabled={disabled}
              />
            ) : (
              <ExperienceCard
                experience={exp}
                onEdit={() => setEditingId(exp.id)}
                onRemove={() => handleRemove(exp.id)}
                disabled={disabled}
              />
            )}
          </li>
        ))}
      </ul>

      {isAdding ? (
        <ExperienceForm
          onSubmit={handleAdd}
          onCancel={() => setIsAdding(false)}
          disabled={disabled}
        />
      ) : (
        <button
          type="button"
          className="experience-builder-add-button"
          onClick={() => setIsAdding(true)}
          disabled={disabled}
        >
          + Add experience
        </button>
      )}

      <span className="experience-builder-count">
        {experiences.length} {experiences.length === 1 ? 'experience' : 'experiences'}
      </span>
    </div>
  );
}

// Card display for an experience entry
interface ExperienceCardProps {
  experience: ExperienceEntry;
  onEdit: () => void;
  onRemove: () => void;
  disabled: boolean;
}

function ExperienceCard({ experience, onEdit, onRemove, disabled }: ExperienceCardProps) { // code_id:1002
  const typeLabel = EXPERIENCE_TYPES.find(t => t.value === experience.experienceType)?.label || 'Other';
  const dateRange = formatDateRange(experience.startDate, experience.endDate);

  return (
    <div className="experience-card">
      <div className="experience-card-header">
        <span className="experience-card-type">{typeLabel}</span>
        <div className="experience-card-actions">
          <button
            type="button"
            className="experience-card-action"
            onClick={onEdit}
            disabled={disabled}
            aria-label="Edit experience"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            className="experience-card-action experience-card-remove"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Remove experience"
          >
            <XIcon />
          </button>
        </div>
      </div>
      <h4 className="experience-card-title">{experience.title}</h4>
      {experience.organization && (
        <p className="experience-card-org">{experience.organization}</p>
      )}
      {dateRange && (
        <p className="experience-card-dates">{dateRange}</p>
      )}
    </div>
  );
}

// Form for adding/editing an experience
interface ExperienceFormProps {
  initialData?: ExperienceEntry;
  onSubmit: (data: Omit<ExperienceEntry, 'id'>) => void;
  onCancel: () => void;
  disabled: boolean;
}

function ExperienceForm({ initialData, onSubmit, onCancel, disabled }: ExperienceFormProps) { // code_id:1003
  const [title, setTitle] = useState(initialData?.title || '');
  const [organization, setOrganization] = useState(initialData?.organization || '');
  const [experienceType, setExperienceType] = useState<ExperienceType>(initialData?.experienceType || 'job');
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [isOngoing, setIsOngoing] = useState(initialData?.endDate === 'present');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      organization: organization.trim(),
      experienceType,
      startDate,
      endDate: isOngoing ? 'present' : endDate,
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form className="experience-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <div className="experience-form-field">
        <label htmlFor="exp-title" className="experience-form-label">
          Title / Role <span className="required">*</span>
        </label>
        <input
          id="exp-title"
          type="text"
          className="experience-form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Software Engineer, MBA Student"
          disabled={disabled}
          autoFocus
          required
        />
      </div>

      <div className="experience-form-field">
        <label htmlFor="exp-org" className="experience-form-label">
          Organization
        </label>
        <input
          id="exp-org"
          type="text"
          className="experience-form-input"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          placeholder="e.g., Google, Stanford University"
          disabled={disabled}
        />
      </div>

      <div className="experience-form-field">
        <label htmlFor="exp-type" className="experience-form-label">
          Type <span className="required">*</span>
        </label>
        <select
          id="exp-type"
          className="experience-form-select"
          value={experienceType}
          onChange={(e) => setExperienceType(e.target.value as ExperienceType)}
          disabled={disabled}
        >
          {EXPERIENCE_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="experience-form-row">
        <div className="experience-form-field">
          <label htmlFor="exp-start" className="experience-form-label">
            Start Date
          </label>
          <input
            id="exp-start"
            type="month"
            className="experience-form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="experience-form-field">
          <label htmlFor="exp-end" className="experience-form-label">
            End Date
          </label>
          <input
            id="exp-end"
            type="month"
            className="experience-form-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={disabled || isOngoing}
          />
          <label className="experience-form-checkbox">
            <input
              type="checkbox"
              checked={isOngoing}
              onChange={(e) => setIsOngoing(e.target.checked)}
              disabled={disabled}
            />
            <span>Present / Ongoing</span>
          </label>
        </div>
      </div>

      <div className="experience-form-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onCancel}
          disabled={disabled}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="button button-primary"
          disabled={disabled || !title.trim()}
        >
          {initialData ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  );
}

// Helper to format date range
function formatDateRange(start: string, end: string): string {
  if (!start && !end) return '';

  const formatMonth = (date: string) => {
    if (!date) return '';
    if (date === 'present') return 'Present';
    const [year, month] = date.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  const startFormatted = formatMonth(start);
  const endFormatted = formatMonth(end);

  if (startFormatted && endFormatted) {
    return `${startFormatted} - ${endFormatted}`;
  }
  if (startFormatted) {
    return `${startFormatted} - Present`;
  }
  return endFormatted;
}

// Icon components
function EditIcon() { // code_id:1004
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function XIcon() { // code_id:1005
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
