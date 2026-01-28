'use client';

import { ComponentType, SVGProps } from 'react';
import { NavItemId } from './types';
import { ChevronRightIcon } from '../icons';

interface NavItemProps {
  id: NavItemId;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  isActive?: boolean;
  badge?: number | boolean;
  hasExpansion?: boolean;
  onClick: () => void;
}

export function NavItem({
  id,
  icon: Icon,
  label,
  isActive = false,
  badge,
  hasExpansion = false,
  onClick,
}: NavItemProps) { // code_id:284
  return (
    <button
      className="nav-item"
      data-active={isActive}
      data-id={id}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      aria-label={label}
    >
      <span className="nav-item-icon" aria-hidden="true">
        <Icon />
        {badge !== undefined && badge !== false && (
          <span className="nav-item-badge">
            {typeof badge === 'number' ? badge : ''}
          </span>
        )}
      </span>
      <span className="nav-item-label">{label}</span>
      {hasExpansion && (
        <ChevronRightIcon className="nav-item-chevron" aria-hidden="true" />
      )}
    </button>
  );
}
