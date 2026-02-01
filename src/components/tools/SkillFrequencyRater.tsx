'use client';

import { useId } from 'react';

export interface SkillWithFrequency {
  id: string;
  name: string;
  frequency: number; // 1-10
}

interface SkillFrequencyRaterProps {
  skills: SkillWithFrequency[];
  onChange: (skills: SkillWithFrequency[]) => void;
  disabled?: boolean;
  id?: string;
}

export function SkillFrequencyRater({
  skills,
  onChange,
  disabled = false,
  id,
}: SkillFrequencyRaterProps) {
  const generatedId = useId();
  const raterId = id || generatedId;

  const updateFrequency = (skillId: string, frequency: number) => {
    onChange(skills.map(s =>
      s.id === skillId ? { ...s, frequency } : s
    ));
  };

  if (skills.length === 0) {
    return (
      <div className="skill-frequency-empty">
        <p>No skills to rate. Please complete Part b first to add tasks.</p>
      </div>
    );
  }

  // Group by frequency level for summary (5 buckets)
  const frequencyGroups = {
    leastUsed: skills.filter(s => s.frequency <= 2).length,
    rarely: skills.filter(s => s.frequency >= 3 && s.frequency <= 4).length,
    sometimes: skills.filter(s => s.frequency >= 5 && s.frequency <= 6).length,
    often: skills.filter(s => s.frequency >= 7 && s.frequency <= 8).length,
    mostUsed: skills.filter(s => s.frequency >= 9).length,
  };

  return (
    <div className="skill-frequency-rater" data-disabled={disabled}>
      <div className="skill-frequency-header">
        <p className="skill-frequency-instructions">
          Rate how often you use each skill from 1 (Least Used) to 10 (Most Used).
        </p>
      </div>

      <div className="skill-frequency-list" role="list" aria-labelledby={`${raterId}-label`}>
        {skills.map((skill) => (
          <SkillFrequencyItem
            key={skill.id}
            skill={skill}
            onChange={(frequency) => updateFrequency(skill.id, frequency)}
            disabled={disabled}
          />
        ))}
      </div>

      <div className="skill-frequency-summary">
        <div className="skill-frequency-summary-title">Summary</div>
        <div className="skill-frequency-summary-groups">
          <span className="skill-frequency-group">
            <span className="skill-frequency-group-count">{frequencyGroups.leastUsed}</span> Least Used (1-2)
          </span>
          <span className="skill-frequency-group">
            <span className="skill-frequency-group-count">{frequencyGroups.rarely}</span> Rarely (3-4)
          </span>
          <span className="skill-frequency-group">
            <span className="skill-frequency-group-count">{frequencyGroups.sometimes}</span> Sometimes (5-6)
          </span>
          <span className="skill-frequency-group">
            <span className="skill-frequency-group-count">{frequencyGroups.often}</span> Often (7-8)
          </span>
          <span className="skill-frequency-group">
            <span className="skill-frequency-group-count">{frequencyGroups.mostUsed}</span> Most Used (9-10)
          </span>
        </div>
      </div>
    </div>
  );
}

// Individual skill rating item
interface SkillFrequencyItemProps {
  skill: SkillWithFrequency;
  onChange: (frequency: number) => void;
  disabled: boolean;
}

function SkillFrequencyItem({ skill, onChange, disabled }: SkillFrequencyItemProps) {
  const getFrequencyLabel = (value: number): string => {
    if (value <= 2) return 'Least Used';
    if (value <= 4) return 'Rarely';
    if (value <= 6) return 'Sometimes';
    if (value <= 8) return 'Often';
    return 'Most Used';
  };

  return (
    <div className="skill-frequency-item">
      <div className="skill-frequency-item-header">
        <span className="skill-frequency-item-name">{skill.name}</span>
        <span className="skill-frequency-item-level">
          {skill.frequency} - {getFrequencyLabel(skill.frequency)}
        </span>
      </div>

      <div className="skill-frequency-item-slider">
        <input
          type="range"
          min={1}
          max={10}
          value={skill.frequency}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          disabled={disabled}
          className="skill-frequency-range"
          aria-label={`Frequency rating for ${skill.name}`}
        />
        <div className="skill-frequency-ticks">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => (
            <span
              key={tick}
              className={`skill-frequency-tick ${skill.frequency >= tick ? 'filled' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
