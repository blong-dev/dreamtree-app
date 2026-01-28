'use client';

import { ReactNode, ComponentType } from 'react';
import type { EmptyStateAction } from './types';

interface EmptyStateProps {
  icon?: ComponentType<{ width?: number; height?: number }>;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) { // code_id:197
  return (
    <div className="empty-state">
      {Icon && (
        <span className="empty-state-icon" aria-hidden="true">
          <Icon width={48} height={48} />
        </span>
      )}
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {action && (
        <button
          className="button button-primary button-md empty-state-action"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  );
}
