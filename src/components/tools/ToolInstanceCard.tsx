'use client';

import { ChevronRightIcon } from '../icons';
import type { ToolInstance } from './ToolPage';

interface ToolInstanceCardProps {
  instance: ToolInstance;
  onClick: () => void;
}

function formatRelativeTime(date: Date): string { // code_id:352
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function ToolInstanceCard({ instance, onClick }: ToolInstanceCardProps) { // code_id:351
  return (
    <button className="tool-instance-card" onClick={onClick}>
      <div className="tool-instance-content">
        <h3 className="tool-instance-title">{instance.title}</h3>
        <p className="tool-instance-source">
          {instance.source === 'workbook'
            ? instance.sourceLocation || 'From workbook'
            : 'Created by you'}
        </p>
        <p className="tool-instance-date">
          Edited {formatRelativeTime(instance.lastEdited)}
        </p>
      </div>
      <ChevronRightIcon
        className="tool-instance-chevron"
        width={20}
        height={20}
      />
    </button>
  );
}
