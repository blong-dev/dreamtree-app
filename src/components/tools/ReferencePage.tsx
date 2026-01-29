'use client';

import { useState, ReactNode } from 'react';
import { TextInput } from '../forms';
import { ArrowLeftIcon, SearchIcon } from '../icons';

export type ReferenceType =
  | 'skills_library'
  | 'personality_types'
  | 'competencies';

const referenceMeta: Record<ReferenceType, { title: string; description: string }> = {
  skills_library: {
    title: 'Skills Library',
    description: 'Browse all skills and see which you\'ve tagged.',
  },
  personality_types: {
    title: 'Personality Types',
    description: 'Explore personality type frameworks and profiles.',
  },
  competencies: {
    title: 'Competencies',
    description: 'Browse workplace competencies and assessments.',
  },
};

interface ReferencePageProps {
  referenceType: ReferenceType;
  onBack: () => void;
  /** Optional subtitle (e.g., "You've tagged 5 skills") */
  subtitle?: string;
  /** Search value for controlled input */
  searchQuery?: string;
  /** Search change handler */
  onSearchChange?: (query: string) => void;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Optional filter controls to render in the actions area */
  filterControls?: ReactNode;
  /** The reference content to display */
  children: ReactNode;
}

export function ReferencePage({
  referenceType,
  onBack,
  subtitle,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder,
  filterControls,
  children,
}: ReferencePageProps) {
  const [internalQuery, setInternalQuery] = useState('');

  const meta = referenceMeta[referenceType];
  const query = onSearchChange ? searchQuery : internalQuery;
  const handleQueryChange = onSearchChange || setInternalQuery;
  const placeholder = searchPlaceholder || `Search ${meta.title.toLowerCase()}...`;

  return (
    <div className="tool-page">
      <header className="tool-page-header">
        <button className="tool-page-back" onClick={onBack}>
          <ArrowLeftIcon width={16} height={16} />
          <span>Back</span>
        </button>
        <h1 className="tool-page-title">{meta.title}</h1>
      </header>

      {subtitle && (
        <p className="tool-page-subtitle">{subtitle}</p>
      )}

      <div className="tool-page-actions">
        <div className="tool-page-search">
          <SearchIcon width={16} height={16} className="tool-page-search-icon" />
          <TextInput
            value={query}
            onChange={handleQueryChange}
            placeholder={placeholder}
          />
        </div>

        {filterControls}
      </div>

      <div className="tool-page-content">
        {children}
      </div>
    </div>
  );
}
