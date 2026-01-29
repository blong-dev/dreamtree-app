'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, NavItemId } from '@/components/shell';
import { ToolType } from '@/components/tools';
import { ArrowLeftIcon } from '@/components/icons';

// Tool metadata for the index page
const TOOL_CATEGORIES = [
  {
    title: 'Story & Reflection',
    tools: [
      {
        type: 'soared_form' as ToolType,
        name: 'SOARED Stories',
        description: 'Capture achievement stories using the SOARED framework',
      },
      {
        type: 'failure_reframer' as ToolType,
        name: 'Failure Reframes',
        description: 'Transform setbacks into learning opportunities',
      },
    ],
  },
  {
    title: 'Skills & Strengths',
    tools: [
      {
        type: 'skills_library' as ToolType,
        name: 'Skills Library',
        description: 'Browse all skills and see which you\'ve tagged',
        isStandalone: true,
      },
      {
        type: 'skill_tagger' as ToolType,
        name: 'Skill Tagger',
        description: 'Tag and categorize your skills',
      },
      {
        type: 'bucketing_tool' as ToolType,
        name: 'Skill Buckets',
        description: 'Rate your skill mastery levels',
      },
      {
        type: 'competency_assessment' as ToolType,
        name: 'Competency Assessment',
        description: 'Assess your workplace competencies',
      },
    ],
  },
  {
    title: 'Values & Personality',
    tools: [
      {
        type: 'ranking_grid' as ToolType,
        name: 'Rankings',
        description: 'Rank and prioritize items',
      },
      {
        type: 'mbti_selector' as ToolType,
        name: 'Personality Type',
        description: 'Explore your MBTI preferences',
      },
      {
        type: 'mindset_profiles' as ToolType,
        name: 'Mindset Profiles',
        description: 'Understand different mindsets',
      },
    ],
  },
  {
    title: 'Flow & Activity',
    tools: [
      {
        type: 'flow_tracker' as ToolType,
        name: 'Flow Tracker',
        description: 'Log activities and flow states',
      },
      {
        type: 'life_dashboard' as ToolType,
        name: 'Life Dashboard',
        description: 'Track life domains and balance',
      },
    ],
  },
  {
    title: 'Career Planning',
    tools: [
      {
        type: 'career_timeline' as ToolType,
        name: 'Career Timeline',
        description: 'Map your career history and future',
      },
      {
        type: 'career_assessment' as ToolType,
        name: 'Career Assessment',
        description: 'Evaluate career options',
      },
      {
        type: 'budget_calculator' as ToolType,
        name: 'Budget Calculator',
        description: 'Plan your financial needs',
      },
    ],
  },
  {
    title: 'Lists & Ideas',
    tools: [
      {
        type: 'list_builder' as ToolType,
        name: 'Lists',
        description: 'Create and manage lists',
      },
      {
        type: 'idea_tree' as ToolType,
        name: 'Idea Trees',
        description: 'Map out ideas visually',
      },
    ],
  },
];

export default function ToolsIndexPage() { // code_id:157
  const router = useRouter();
  const [activeNavItem, setActiveNavItem] = useState<NavItemId>('tools');
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Fetch tool counts on mount
  useEffect(() => {
    async function fetchCounts() { // code_id:159
      try {
        const response = await fetch('/api/tools/counts');
        if (response.ok) {
          const data: { counts?: Record<string, number> } = await response.json();
          setCounts(data.counts || {});
        }
      } catch (error) {
        console.error('Error fetching tool counts:', error);
      }
    }
    fetchCounts();
  }, []);

  const handleNavigate = useCallback(
    (id: NavItemId) => {
      setActiveNavItem(id);
      if (id === 'workbook') {
        router.push('/workbook');
      } else if (id === 'home') {
        router.push('/');
      } else if (id === 'profile') {
        router.push('/profile');
      }
    },
    [router]
  );

  const handleToolClick = (toolType: ToolType) => { // code_id:158
    router.push(`/tools/${toolType}`);
  };

  return (
    <AppShell
      activeNavItem={activeNavItem}
      onNavigate={handleNavigate}
      showBreadcrumb={false}
      showInput={false}
    >
      <div className="tools-index">
        <header className="tools-index-header">
          <button className="tools-index-back" onClick={() => router.push('/')}>
            <ArrowLeftIcon width={16} height={16} />
            <span>Back</span>
          </button>
          <h1 className="tools-index-title">Tools</h1>
        </header>

        <p className="tools-index-description">
          All your workbook tools in one place. Tools are used throughout the
          workbook exercises - you can also access them here to review or create
          new entries.
        </p>

        {TOOL_CATEGORIES.map((category) => (
          <section key={category.title} className="tools-index-category">
            <h2 className="tools-index-category-title">{category.title}</h2>
            <div className="tools-index-grid">
              {category.tools.map((tool) => {
                const count = counts[tool.type] || 0;
                return (
                  <button
                    key={tool.type}
                    className="tools-index-card"
                    onClick={() => handleToolClick(tool.type)}
                  >
                    <h3 className="tools-index-card-name">{tool.name}</h3>
                    <p className="tools-index-card-description">
                      {tool.description}
                    </p>
                    {count > 0 && (
                      <span className="tools-index-card-count">
                        {count} {count === 1 ? 'entry' : 'entries'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
