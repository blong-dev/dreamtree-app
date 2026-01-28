'use client';

import { useState, useMemo } from 'react';
import { Skill, SkillCategory, SKILL_CATEGORY_LABELS } from './types';

interface SkillTaggerProps {
  skills: Skill[];
  selectedSkillIds: string[];
  onChange: (skillIds: string[]) => void;
  storyTitle: string;
  suggestedSkillIds?: string[];
  disabled?: boolean;
}

const SKILL_TYPE_ORDER: SkillCategory[] = ['transferable', 'self_management', 'knowledge'];

export function SkillTagger({
  skills,
  selectedSkillIds,
  onChange,
  storyTitle,
  suggestedSkillIds = [],
  disabled = false,
}: SkillTaggerProps) { // code_id:69
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skills;
    const query = searchQuery.toLowerCase();
    return skills.filter((skill) =>
      skill.name.toLowerCase().includes(query)
    );
  }, [skills, searchQuery]);

  const groupedSkills = useMemo(() => {
    const groups: Record<SkillCategory, Skill[]> = {
      transferable: [],
      self_management: [],
      knowledge: [],
    };

    filteredSkills.forEach((skill) => {
      groups[skill.category].push(skill);
    });

    return groups;
  }, [filteredSkills]);

  const toggleSkill = (skillId: string) => { // code_id:348
    if (disabled) return;

    if (selectedSkillIds.includes(skillId)) {
      onChange(selectedSkillIds.filter((id) => id !== skillId));
    } else {
      onChange([...selectedSkillIds, skillId]);
    }
  };

  return (
    <div className="skill-tagger" data-disabled={disabled}>
      <label className="skill-tagger-label">
        Tag skills demonstrated in &ldquo;{storyTitle}&rdquo;
      </label>

      <input
        type="text"
        className="skill-tagger-search"
        placeholder="Search skills..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        disabled={disabled}
      />

      {SKILL_TYPE_ORDER.map((type) => {
        const typeSkills = groupedSkills[type];
        if (typeSkills.length === 0) return null;

        return (
          <div key={type} className="skill-tagger-group">
            <h4 className="skill-tagger-group-title">
              {SKILL_CATEGORY_LABELS[type]}
            </h4>
            <div className="skill-tagger-options">
              {typeSkills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  className="skill-tagger-skill"
                  data-selected={selectedSkillIds.includes(skill.id)}
                  data-suggested={suggestedSkillIds.includes(skill.id)}
                  onClick={() => toggleSkill(skill.id)}
                  disabled={disabled}
                >
                  {skill.name}
                  {selectedSkillIds.includes(skill.id) && <CheckIcon />}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {filteredSkills.length === 0 && searchQuery && (
        <p className="skill-tagger-empty">
          No skills match &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      <div className="skill-tagger-selected-count">
        {selectedSkillIds.length} skill{selectedSkillIds.length !== 1 ? 's' : ''} tagged
      </div>
    </div>
  );
}

function CheckIcon() { // code_id:349
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="skill-tagger-check"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
