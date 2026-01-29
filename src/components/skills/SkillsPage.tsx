'use client';

import { useState, useMemo } from 'react';
import { CheckIcon } from '../icons';
import { ReferencePage } from '../tools';

type SkillCategory = 'transferable' | 'self_management' | 'knowledge';

interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

interface SkillsPageProps {
  skills: Skill[];
  userSkillIds: string[];
  onBack: () => void;
}

const CATEGORY_ORDER: SkillCategory[] = ['transferable', 'self_management', 'knowledge'];

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  transferable: 'Transferable Skills',
  self_management: 'Self-Management Skills',
  knowledge: 'Knowledges',
};

const CATEGORY_DESCRIPTIONS: Record<SkillCategory, string> = {
  transferable: 'Skills that apply across industries and roles — communication, problem-solving, leadership.',
  self_management: 'How you manage yourself — time management, adaptability, emotional intelligence.',
  knowledge: 'Domain-specific expertise — industry knowledge, technical skills, certifications.',
};

export function SkillsPage({ skills, userSkillIds, onBack }: SkillsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyTagged, setShowOnlyTagged] = useState(false);

  const filteredSkills = useMemo(() => {
    let result = skills;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((skill) =>
        skill.name.toLowerCase().includes(query)
      );
    }

    // Filter to only tagged skills if enabled
    if (showOnlyTagged) {
      result = result.filter((skill) => userSkillIds.includes(skill.id));
    }

    return result;
  }, [skills, searchQuery, showOnlyTagged, userSkillIds]);

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

  const taggedCount = userSkillIds.length;

  const subtitle = taggedCount > 0
    ? `You've tagged ${taggedCount} skill${taggedCount !== 1 ? 's' : ''} so far.`
    : 'Complete exercises to tag skills you demonstrate.';

  const filterControls = taggedCount > 0 ? (
    <label className="skills-page-filter">
      <input
        type="checkbox"
        checked={showOnlyTagged}
        onChange={(e) => setShowOnlyTagged(e.target.checked)}
      />
      <span>Show only my skills</span>
    </label>
  ) : null;

  return (
    <ReferencePage
      referenceType="skills_library"
      onBack={onBack}
      subtitle={subtitle}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search skills..."
      filterControls={filterControls}
    >
      {CATEGORY_ORDER.map((category) => {
        const categorySkills = groupedSkills[category];
        if (categorySkills.length === 0) return null;

        return (
          <section key={category} className="skills-page-section">
            <h2 className="skills-page-section-title">{CATEGORY_LABELS[category]}</h2>
            <p className="skills-page-section-description">{CATEGORY_DESCRIPTIONS[category]}</p>
            <div className="skills-page-grid">
              {categorySkills.map((skill) => {
                const isTagged = userSkillIds.includes(skill.id);
                return (
                  <div
                    key={skill.id}
                    className="skills-page-skill"
                    data-tagged={isTagged}
                  >
                    <span className="skills-page-skill-name">{skill.name}</span>
                    {isTagged && (
                      <CheckIcon className="skills-page-skill-check" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {filteredSkills.length === 0 && (
        <div className="skills-page-empty">
          {searchQuery ? (
            <p>No skills match &ldquo;{searchQuery}&rdquo;</p>
          ) : showOnlyTagged ? (
            <p>You haven&apos;t tagged any skills yet. Complete exercises to build your skills profile.</p>
          ) : (
            <p>No skills available.</p>
          )}
        </div>
      )}
    </ReferencePage>
  );
}
