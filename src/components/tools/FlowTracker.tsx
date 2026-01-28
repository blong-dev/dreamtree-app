'use client';

import { useState, useMemo } from 'react';
import { FlowEntry, FlowTrackerData, isHighFlowActivity } from './types';
import { TextInput, TextArea } from '../forms';

interface FlowTrackerProps {
  data: FlowTrackerData;
  onChange: (data: FlowTrackerData) => void;
  date?: Date;
  disabled?: boolean;
  readOnly?: boolean;
}

interface FormData {
  activity: string;
  energy: -2 | -1 | 0 | 1 | 2 | null;
  focus: 1 | 2 | 3 | 4 | 5 | null;
  notes: string;
}

const initialFormData: FormData = {
  activity: '',
  energy: null,
  focus: null,
  notes: '',
};

const ENERGY_OPTIONS: { value: -2 | -1 | 0 | 1 | 2; label: string; icon: string }[] = [
  { value: -2, label: 'Very Draining', icon: '😫' },
  { value: -1, label: 'Somewhat Draining', icon: '😕' },
  { value: 0, label: 'Neutral', icon: '😐' },
  { value: 1, label: 'Somewhat Energizing', icon: '🙂' },
  { value: 2, label: 'Very Energizing', icon: '⚡' },
];

const FOCUS_OPTIONS: { value: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { value: 1, label: 'Very Distracted' },
  { value: 2, label: 'Somewhat Distracted' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Fairly Focused' },
  { value: 5, label: 'Fully Absorbed' },
];

export function FlowTracker({
  data,
  onChange,
  date = new Date(),
  disabled = false,
  readOnly = false,
}: FlowTrackerProps) { // code_id:73
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const generateId = () => `flow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const todayStr = date.toISOString().split('T')[0];

  const todayEntries = useMemo(() => { // code_id:313
    return data.entries.filter((entry) => entry.date === todayStr);
  }, [data.entries, todayStr]);

  const isFormValid =
    formData.activity.trim() !== '' &&
    formData.energy !== null &&
    formData.focus !== null;

  const handleAddEntry = (e: React.FormEvent) => { // code_id:314
    e.preventDefault();
    if (!isFormValid || disabled || readOnly) return;

    const newEntry: FlowEntry = {
      id: generateId(),
      date: todayStr,
      activity: formData.activity.trim(),
      energy: formData.energy!,
      focus: formData.focus!,
      notes: formData.notes.trim() || undefined,
    };

    onChange({
      ...data,
      entries: [...data.entries, newEntry],
    });

    setFormData(initialFormData);
  };

  const handleRemoveEntry = (entryId: string) => { // code_id:315
    if (disabled || readOnly) return;
    onChange({
      ...data,
      entries: data.entries.filter((entry) => entry.id !== entryId),
    });
  };

  // Calculate summary stats
  const highFlowCount = todayEntries.filter(isHighFlowActivity).length;

  return (
    <div className="flow-tracker">
      {!readOnly && (
        <form className="flow-tracker-form" onSubmit={handleAddEntry}>
          <h3 className="flow-tracker-form-title">Track an activity</h3>

          <TextInput
            label="Activity"
            value={formData.activity}
            onChange={(v) => setFormData({ ...formData, activity: v })}
            placeholder="What were you doing?"
            disabled={disabled}
          />

          <div className="flow-tracker-field">
            <label className="flow-tracker-field-label">
              Energy Impact
              <span className="flow-tracker-field-hint">Did this activity drain or energize you?</span>
            </label>
            <div className="flow-tracker-energy-options">
              {ENERGY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="flow-tracker-energy-option"
                  data-selected={formData.energy === option.value}
                  data-value={option.value}
                  onClick={() => setFormData({ ...formData, energy: option.value })}
                  disabled={disabled}
                  title={option.label}
                >
                  <span className="flow-tracker-energy-icon">{option.icon}</span>
                  <span className="flow-tracker-energy-label">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flow-tracker-field">
            <label className="flow-tracker-field-label">
              Focus Level
              <span className="flow-tracker-field-hint">How absorbed were you in this activity?</span>
            </label>
            <div className="flow-tracker-focus-options">
              {FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="flow-tracker-focus-option"
                  data-selected={formData.focus === option.value}
                  onClick={() => setFormData({ ...formData, focus: option.value })}
                  disabled={disabled}
                >
                  <span className="flow-tracker-focus-number">{option.value}</span>
                  <span className="flow-tracker-focus-label">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <TextArea
            label="Notes (optional)"
            value={formData.notes}
            onChange={(v) => setFormData({ ...formData, notes: v })}
            placeholder="Any observations..."
            minRows={2}
            disabled={disabled}
          />

          <button
            type="submit"
            className="flow-tracker-submit"
            disabled={!isFormValid || disabled}
          >
            Add Entry
          </button>
        </form>
      )}

      <div className="flow-tracker-divider" />

      <div className="flow-tracker-entries">
        <div className="flow-tracker-entries-header">
          <h3 className="flow-tracker-entries-title">
            {readOnly ? 'Entries' : "Today's entries"}
          </h3>
          {todayEntries.length > 0 && (
            <span className="flow-tracker-entries-summary">
              {highFlowCount} high-flow {highFlowCount === 1 ? 'activity' : 'activities'}
            </span>
          )}
        </div>

        {todayEntries.length === 0 ? (
          <p className="flow-tracker-empty">No entries yet today.</p>
        ) : (
          todayEntries.map((entry) => (
            <FlowTrackerEntry
              key={entry.id}
              entry={entry}
              onRemove={() => handleRemoveEntry(entry.id)}
              disabled={disabled || readOnly}
            />
          ))
        )}
      </div>
    </div>
  );
}

// FlowTrackerEntry component
interface FlowTrackerEntryProps {
  entry: FlowEntry;
  onRemove: () => void;
  disabled: boolean;
}

function FlowTrackerEntry({ entry, onRemove, disabled }: FlowTrackerEntryProps) { // code_id:316
  const isHighFlow = isHighFlowActivity(entry);
  const energyOption = ENERGY_OPTIONS.find((o) => o.value === entry.energy);
  const focusOption = FOCUS_OPTIONS.find((o) => o.value === entry.focus);

  return (
    <div className="flow-entry" data-high-flow={isHighFlow}>
      <div className="flow-entry-header">
        <span className="flow-entry-activity">{entry.activity}</span>
        {isHighFlow && <span className="flow-entry-badge">High Flow</span>}
      </div>
      <div className="flow-entry-metrics">
        <span className="flow-entry-metric" data-type="energy" data-value={entry.energy}>
          {energyOption?.icon} {energyOption?.label}
        </span>
        <span className="flow-entry-metric" data-type="focus">
          Focus: {entry.focus}/5 ({focusOption?.label})
        </span>
      </div>
      {entry.notes && <p className="flow-entry-notes">{entry.notes}</p>}
      {!disabled && (
        <button
          type="button"
          className="flow-entry-remove"
          onClick={onRemove}
          aria-label="Remove entry"
        >
          <XIcon />
        </button>
      )}
    </div>
  );
}

function XIcon() { // code_id:317
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
