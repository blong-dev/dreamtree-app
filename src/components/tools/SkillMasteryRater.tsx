'use client';

import { useId } from 'react';

export interface SkillWithMastery {
  id: string;
  name: string;
  mastery: number; // 1-10
}

interface SkillMasteryRaterProps {
  skills: SkillWithMastery[];
  onChange: (skills: SkillWithMastery[]) => void;
  disabled?: boolean;
  id?: string;
}

const MASTERY_LABELS = [
  { value: 1, label: 'Novice' },
  { value: 5, label: 'Intermediate' },
  { value: 10, label: 'Expert' },
];

export function SkillMasteryRater({
  skills,
  onChange,
  disabled = false,
  id,
}: SkillMasteryRaterProps) { // code_id:1040
  const generatedId = useId();
  const raterId = id || generatedId;

  const updateMastery = (skillId: string, mastery: number) => {
    onChange(skills.map(s =>
      s.id === skillId ? { ...s, mastery } : s
    ));
  };

  if (skills.length === 0) {
    return (
      <div className="skill-mastery-empty">
        <p>No skills to rate. Please complete Part b first to add tasks.</p>
      </div>
    );
  }

  // Group by mastery level for summary
  const masteryGroups = {
    novice: skills.filter(s => s.mastery <= 3).length,
    developing: skills.filter(s => s.mastery > 3 && s.mastery <= 6).length,
    proficient: skills.filter(s => s.mastery > 6 && s.mastery <= 8).length,
    expert: skills.filter(s => s.mastery > 8).length,
  };

  return (
    <div className="skill-mastery-rater" data-disabled={disabled}>
      <div className="skill-mastery-header">
        <p className="skill-mastery-instructions">
          Rate your proficiency in each skill from 1 (Novice) to 10 (Expert).
        </p>
        <div className="skill-mastery-legend">
          {MASTERY_LABELS.map(({ value, label }) => (
            <span key={value} className="skill-mastery-legend-item">
              <span className="skill-mastery-legend-value">{value}</span>
              <span className="skill-mastery-legend-label">{label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="skill-mastery-list" role="list" aria-labelledby={`${raterId}-label`}>
        {skills.map((skill) => (
          <SkillMasteryItem
            key={skill.id}
            skill={skill}
            onChange={(mastery) => updateMastery(skill.id, mastery)}
            disabled={disabled}
          />
        ))}
      </div>

      <div className="skill-mastery-summary">
        <div className="skill-mastery-summary-title">Summary</div>
        <div className="skill-mastery-summary-groups">
          <span className="skill-mastery-group">
            <span className="skill-mastery-group-count">{masteryGroups.novice}</span> Novice (1-3)
          </span>
          <span className="skill-mastery-group">
            <span className="skill-mastery-group-count">{masteryGroups.developing}</span> Developing (4-6)
          </span>
          <span className="skill-mastery-group">
            <span className="skill-mastery-group-count">{masteryGroups.proficient}</span> Proficient (7-8)
          </span>
          <span className="skill-mastery-group">
            <span className="skill-mastery-group-count">{masteryGroups.expert}</span> Expert (9-10)
          </span>
        </div>
      </div>
    </div>
  );
}

// Individual skill rating item
interface SkillMasteryItemProps {
  skill: SkillWithMastery;
  onChange: (mastery: number) => void;
  disabled: boolean;
}

function SkillMasteryItem({ skill, onChange, disabled }: SkillMasteryItemProps) { // code_id:1041
  const getMasteryLabel = (value: number): string => {
    if (value <= 3) return 'Novice';
    if (value <= 6) return 'Developing';
    if (value <= 8) return 'Proficient';
    return 'Expert';
  };

  return (
    <div className="skill-mastery-item">
      <div className="skill-mastery-item-header">
        <span className="skill-mastery-item-name">{skill.name}</span>
        <span className="skill-mastery-item-level">
          {skill.mastery} - {getMasteryLabel(skill.mastery)}
        </span>
      </div>

      <div className="skill-mastery-item-slider">
        <input
          type="range"
          min={1}
          max={10}
          value={skill.mastery}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          disabled={disabled}
          className="skill-mastery-range"
          aria-label={`Mastery level for ${skill.name}`}
        />
        <div className="skill-mastery-ticks">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tick) => (
            <span
              key={tick}
              className={`skill-mastery-tick ${skill.mastery >= tick ? 'filled' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
