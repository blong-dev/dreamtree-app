'use client';

import { useState } from 'react';
import { ToolInstanceCard } from './ToolInstanceCard';
import { TextInput } from '../forms';
import { ArrowLeftIcon, PlusIcon, SearchIcon } from '../icons';

export type ToolType =
  | 'soared_form'
  | 'list_builder'
  | 'ranking_grid'
  | 'skill_tagger'
  | 'mbti_selector'
  | 'flow_tracker'
  | 'life_dashboard'
  | 'budget_calculator'
  | 'bucketing_tool'
  | 'competency_assessment'
  | 'idea_tree'
  | 'failure_reframer'
  | 'mindset_profiles'
  | 'career_timeline'
  | 'career_assessment';

export type ToolInstance = {
  id: string;
  title: string;
  source: 'workbook' | 'user';
  sourceLocation?: string; // e.g., "Part 1 › Module 2 › Exercise 3"
  lastEdited: Date;
};

const toolMeta: Record<ToolType, { singularName: string; pluralName: string }> = {
  soared_form: { singularName: 'Story', pluralName: 'SOARED Stories' },
  list_builder: { singularName: 'List', pluralName: 'Lists' },
  ranking_grid: { singularName: 'Ranking', pluralName: 'Rankings' },
  skill_tagger: { singularName: 'Skill Set', pluralName: 'Skill Sets' },
  mbti_selector: { singularName: 'Personality', pluralName: 'Personality Type' },
  flow_tracker: { singularName: 'Flow Entry', pluralName: 'Flow Entries' },
  life_dashboard: { singularName: 'Dashboard', pluralName: 'Life Dashboard' },
  budget_calculator: { singularName: 'Budget', pluralName: 'Budgets' },
  bucketing_tool: { singularName: 'Bucket', pluralName: 'Skill Buckets' },
  competency_assessment: { singularName: 'Assessment', pluralName: 'Competency Assessments' },
  idea_tree: { singularName: 'Idea Tree', pluralName: 'Idea Trees' },
  failure_reframer: { singularName: 'Reframe', pluralName: 'Failure Reframes' },
  mindset_profiles: { singularName: 'Profile', pluralName: 'Mindset Profiles' },
  career_timeline: { singularName: 'Timeline', pluralName: 'Career Timelines' },
  career_assessment: { singularName: 'Assessment', pluralName: 'Career Assessments' },
};

interface ToolPageProps {
  toolType: ToolType;
  instances: ToolInstance[];
  onBack: () => void;
  onCreateNew: () => void;
  onSelectInstance: (id: string) => void;
  userTier?: 'free' | 'paid';
}

export function ToolPage({
  toolType,
  instances,
  onBack,
  onCreateNew,
  onSelectInstance,
  userTier = 'free',
}: ToolPageProps) { // code_id:353
  const [searchQuery, setSearchQuery] = useState('');

  const meta = toolMeta[toolType];
  const userCreatedCount = instances.filter((i) => i.source === 'user').length;

  const filteredInstances = searchQuery
    ? instances.filter((i) =>
        i.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : instances;

  const isLimitReached = userTier === 'free' && userCreatedCount >= 20;

  return (
    <div className="tool-page">
      <header className="tool-page-header">
        <button className="tool-page-back" onClick={onBack}>
          <ArrowLeftIcon width={16} height={16} />
          <span>Back</span>
        </button>
        <h1 className="tool-page-title">{meta.pluralName}</h1>
      </header>

      <div className="tool-page-actions">
        {instances.length > 5 && (
          <div className="tool-page-search">
            <SearchIcon
              width={16}
              height={16}
              className="tool-page-search-icon"
            />
            <TextInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={`Search ${meta.pluralName.toLowerCase()}...`}
            />
          </div>
        )}

        <button
          className="tool-page-create"
          onClick={onCreateNew}
          disabled={isLimitReached}
        >
          <PlusIcon width={16} height={16} />
          <span>New {meta.singularName}</span>
        </button>
      </div>

      {isLimitReached && (
        <div className="tool-page-limit-banner">
          <span>
            You&apos;ve reached the free tier limit of 20{' '}
            {meta.pluralName.toLowerCase()}.
          </span>
          <button className="tool-page-upgrade">Upgrade</button>
        </div>
      )}

      <div className="tool-page-list">
        {filteredInstances.length === 0 ? (
          <div className="tool-page-empty">
            <p className="tool-page-empty-title">
              No {meta.pluralName.toLowerCase()} yet
            </p>
            <p className="tool-page-empty-desc">
              Create your first {meta.singularName.toLowerCase()} to get
              started.
            </p>
            {!isLimitReached && (
              <button className="tool-page-empty-action" onClick={onCreateNew}>
                Create {meta.singularName}
              </button>
            )}
          </div>
        ) : (
          filteredInstances.map((instance) => (
            <ToolInstanceCard
              key={instance.id}
              instance={instance}
              onClick={() => onSelectInstance(instance.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
