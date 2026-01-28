'use client';

import { LifeDashboardData } from './types';
import { Slider, TextArea } from '../forms';

interface LifeDashboardProps {
  data: LifeDashboardData;
  onChange: (data: LifeDashboardData) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

const LIFE_AREAS = [
  {
    key: 'work' as const,
    label: 'Work',
    minLabel: 'Unfulfilled',
    maxLabel: 'Thriving',
    description: 'Career, job satisfaction, professional growth',
  },
  {
    key: 'play' as const,
    label: 'Play',
    minLabel: 'Depleted',
    maxLabel: 'Energized',
    description: 'Hobbies, fun, creativity, leisure',
  },
  {
    key: 'love' as const,
    label: 'Love',
    minLabel: 'Disconnected',
    maxLabel: 'Connected',
    description: 'Relationships, family, community, belonging',
  },
  {
    key: 'health' as const,
    label: 'Health',
    minLabel: 'Struggling',
    maxLabel: 'Flourishing',
    description: 'Physical, mental, emotional wellbeing',
  },
];

export function LifeDashboard({
  data,
  onChange,
  disabled = false,
  readOnly = false,
}: LifeDashboardProps) { // code_id:75
  const updateField = (key: keyof LifeDashboardData, value: number | string | null) => { // code_id:322
    onChange({ ...data, [key]: value });
  };

  // Calculate average score
  const scores = [data.work, data.play, data.love, data.health].filter(
    (s): s is number => s !== null
  );
  const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  return (
    <div className="life-dashboard">
      <p className="life-dashboard-intro">
        Rate how you feel about each area of your life right now, from 1 (lowest) to 10 (highest).
      </p>

      <div className="life-dashboard-areas">
        {LIFE_AREAS.map((area) => (
          <div key={area.key} className="life-dashboard-area">
            <div className="life-dashboard-area-header">
              <span className="life-dashboard-area-label">{area.label}</span>
              <span className="life-dashboard-area-value">
                {data[area.key] !== null ? data[area.key] : '–'}
              </span>
            </div>
            <p className="life-dashboard-area-description">{area.description}</p>
            <Slider
              value={data[area.key]}
              onChange={(v) => updateField(area.key, v)}
              min={1}
              max={10}
              minLabel={area.minLabel}
              maxLabel={area.maxLabel}
              disabled={disabled || readOnly}
            />
          </div>
        ))}
      </div>

      <div className="life-dashboard-summary">
        <div className="life-dashboard-average">
          <span className="life-dashboard-average-label">Overall Balance</span>
          <span className="life-dashboard-average-value">
            {average !== null ? average.toFixed(1) : '–'}
          </span>
        </div>

        <div className="life-dashboard-visual">
          {LIFE_AREAS.map((area) => (
            <div
              key={area.key}
              className="life-dashboard-bar"
              data-area={area.key}
              style={{
                '--bar-height': `${((data[area.key] || 0) / 10) * 100}%`,
              } as React.CSSProperties}
            >
              <div className="life-dashboard-bar-fill" />
              <span className="life-dashboard-bar-label">{area.label[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="life-dashboard-notes">
        <TextArea
          label="Reflections"
          value={data.notes || ''}
          onChange={(v) => updateField('notes', v)}
          placeholder="What stands out to you about these ratings? Any patterns or surprises?"
          minRows={3}
          disabled={disabled || readOnly}
        />
      </div>
    </div>
  );
}
