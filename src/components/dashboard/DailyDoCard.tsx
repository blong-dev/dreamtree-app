'use client';

import Link from 'next/link';
import {
  ActivityIcon,
  RefreshIcon,
  SearchIcon,
  UsersIcon,
  CalculatorIcon,
  BookOpenIcon,
  PlayIcon,
} from '../icons';
import type { DailyDoType } from './types';

const dailyDoIcons: Record<DailyDoType, React.ComponentType<{ width?: number; height?: number }>> = {
  'flow-tracking': ActivityIcon,
  'failure-reframe': RefreshIcon,
  'job-prospecting': SearchIcon,
  'networking': UsersIcon,
  'budget-check': CalculatorIcon,
  'soared-prompt': BookOpenIcon,
  'resume': PlayIcon,
};

interface DailyDoCardProps {
  type: DailyDoType;
  title: string;
  subtitle: string;
  action: {
    label: string;
    href: string;
  };
}

export function DailyDoCard({ type, title, subtitle, action }: DailyDoCardProps) { // code_id:181
  const Icon = dailyDoIcons[type];

  return (
    <div className="daily-do-card">
      <span className="daily-do-icon" aria-hidden="true">
        <Icon width={20} height={20} />
      </span>
      <div className="daily-do-content">
        <h3 className="daily-do-title">{title}</h3>
        <p className="daily-do-subtitle">{subtitle}</p>
      </div>
      <Link href={action.href} className="daily-do-action">
        {action.label} →
      </Link>
    </div>
  );
}
