'use client';

import { useState } from 'react';
import { CareerTimelineData, TimelineMilestone } from './types';
import { TextInput, TextArea, Select } from '../forms';

interface CareerTimelineProps {
  data: CareerTimelineData;
  onChange: (data: CareerTimelineData) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: 'work', label: 'Work' },
  { value: 'education', label: 'Education' },
  { value: 'personal', label: 'Personal' },
  { value: 'skill', label: 'Skill Development' },
];

const QUARTER_OPTIONS = [
  { value: '1', label: 'Q1 (Jan-Mar)' },
  { value: '2', label: 'Q2 (Apr-Jun)' },
  { value: '3', label: 'Q3 (Jul-Sep)' },
  { value: '4', label: 'Q4 (Oct-Dec)' },
];

const CATEGORY_COLORS: Record<string, string> = {
  work: 'var(--color-primary)',
  education: '#8B5CF6',
  personal: '#EC4899',
  skill: '#F59E0B',
};

export function CareerTimeline({
  data,
  onChange,
  disabled = false,
  readOnly = false,
}: CareerTimelineProps) { // code_id:89
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState<Partial<TimelineMilestone>>({
    year: data.startYear,
    quarter: 1,
    category: 'work',
  });

  const years = Array.from({ length: 5 }, (_, i) => data.startYear + i);

  const getMilestonesForYearQuarter = (year: number, quarter: 1 | 2 | 3 | 4) => { // code_id:305
    return data.milestones.filter(
      (m) => m.year === year && m.quarter === quarter
    );
  };

  const addMilestone = () => { // code_id:306
    if (!newMilestone.title?.trim() || disabled || readOnly) return;

    const milestone: TimelineMilestone = {
      id: `milestone-${Date.now()}`,
      year: newMilestone.year || data.startYear,
      quarter: (newMilestone.quarter || 1) as 1 | 2 | 3 | 4,
      title: newMilestone.title.trim(),
      category: (newMilestone.category || 'work') as TimelineMilestone['category'],
      description: newMilestone.description || '',
    };

    onChange({
      ...data,
      milestones: [...data.milestones, milestone].sort(
        (a, b) => a.year * 4 + a.quarter - (b.year * 4 + b.quarter)
      ),
    });

    setNewMilestone({
      year: data.startYear,
      quarter: 1,
      category: 'work',
    });
    setIsAddingMilestone(false);
  };

  const removeMilestone = (id: string) => { // code_id:307
    onChange({
      ...data,
      milestones: data.milestones.filter((m) => m.id !== id),
    });
  };

  // Reserved for future inline editing feature
  const _updateMilestone = (id: string, updates: Partial<TimelineMilestone>) => { // code_id:308
    onChange({
      ...data,
      milestones: data.milestones.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    });
  };
  void _updateMilestone;

  return (
    <div className="career-timeline" data-disabled={disabled}>
      <p className="career-timeline-intro">
        Plot key milestones for the next 5 years. Include work achievements,
        education, personal goals, and skill development.
      </p>

      <div className="career-timeline-legend">
        {CATEGORY_OPTIONS.map((cat) => (
          <span key={cat.value} className="career-timeline-legend-item">
            <span
              className="career-timeline-legend-dot"
              style={{ backgroundColor: CATEGORY_COLORS[cat.value] }}
            />
            {cat.label}
          </span>
        ))}
      </div>

      <div className="career-timeline-grid">
        <div className="career-timeline-header">
          <div className="career-timeline-corner" />
          {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
            <div key={q} className="career-timeline-quarter-header">
              {q}
            </div>
          ))}
        </div>

        {years.map((year) => (
          <div key={year} className="career-timeline-row">
            <div className="career-timeline-year">{year}</div>
            {([1, 2, 3, 4] as const).map((quarter) => {
              const milestones = getMilestonesForYearQuarter(year, quarter);
              return (
                <div key={quarter} className="career-timeline-cell">
                  {milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="career-timeline-milestone"
                      style={{
                        borderLeftColor: CATEGORY_COLORS[milestone.category],
                      }}
                    >
                      <div className="career-timeline-milestone-header">
                        <span className="career-timeline-milestone-title">
                          {milestone.title}
                        </span>
                        {!disabled && !readOnly && (
                          <button
                            type="button"
                            className="career-timeline-milestone-remove"
                            onClick={() => removeMilestone(milestone.id)}
                            aria-label="Remove milestone"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="career-timeline-milestone-desc">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!disabled && !readOnly && (
        <div className="career-timeline-add">
          {isAddingMilestone ? (
            <div className="career-timeline-add-form">
              <div className="career-timeline-add-row">
                <Select
                  label="Year"
                  value={String(newMilestone.year)}
                  onChange={(v) =>
                    setNewMilestone({ ...newMilestone, year: parseInt(v) })
                  }
                  options={years.map((y) => ({ value: String(y), label: String(y) }))}
                />
                <Select
                  label="Quarter"
                  value={String(newMilestone.quarter)}
                  onChange={(v) =>
                    setNewMilestone({
                      ...newMilestone,
                      quarter: parseInt(v) as 1 | 2 | 3 | 4,
                    })
                  }
                  options={QUARTER_OPTIONS}
                />
                <Select
                  label="Category"
                  value={newMilestone.category || 'work'}
                  onChange={(v) =>
                    setNewMilestone({
                      ...newMilestone,
                      category: v as TimelineMilestone['category'],
                    })
                  }
                  options={CATEGORY_OPTIONS}
                />
              </div>
              <TextInput
                label="Milestone Title"
                value={newMilestone.title || ''}
                onChange={(v) => setNewMilestone({ ...newMilestone, title: v })}
                placeholder="What do you want to achieve?"
              />
              <TextArea
                label="Description (optional)"
                value={newMilestone.description || ''}
                onChange={(v) => setNewMilestone({ ...newMilestone, description: v })}
                placeholder="Add more details..."
                minRows={2}
              />
              <div className="career-timeline-add-actions">
                <button
                  type="button"
                  className="career-timeline-button career-timeline-button-secondary"
                  onClick={() => setIsAddingMilestone(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="career-timeline-button career-timeline-button-primary"
                  onClick={addMilestone}
                  disabled={!newMilestone.title?.trim()}
                >
                  Add Milestone
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="career-timeline-add-button"
              onClick={() => setIsAddingMilestone(true)}
            >
              + Add Milestone
            </button>
          )}
        </div>
      )}

      <div className="career-timeline-summary">
        <span className="career-timeline-count">
          {data.milestones.length} milestone{data.milestones.length !== 1 ? 's' : ''} planned
        </span>
      </div>
    </div>
  );
}
