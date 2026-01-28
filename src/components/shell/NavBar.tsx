'use client';

import { NavItem } from './NavItem';
import { NavItemId } from './types';
import { HomeIcon, ListIcon, WrenchIcon, UserIcon, AcornIcon } from '../icons';

interface NavBarProps {
  position?: 'left' | 'bottom';
  activeItem?: NavItemId;
  toolsUnlocked?: number;
  hideContents?: boolean;
  onNavigate: (id: NavItemId) => void;
  onExpandTools?: () => void;
}

export function NavBar({
  position = 'left',
  activeItem,
  toolsUnlocked = 0,
  hideContents = false,
  onNavigate,
  onExpandTools,
}: NavBarProps) { // code_id:283
  return (
    <nav
      className="nav-bar"
      data-position={position}
      aria-label="Main navigation"
    >
      {/* Brand lockup - only shown on desktop left rail */}
      {position === 'left' && (
        <div className="nav-brand" onClick={() => onNavigate('home')}>
          <AcornIcon className="nav-brand-icon" aria-hidden="true" />
          <span className="nav-brand-text">dreamtree</span>
        </div>
      )}
      <ul className="nav-bar-list" role="list">
        <li>
          <NavItem
            id="home"
            icon={position === 'bottom' ? AcornIcon : HomeIcon}
            label="Home"
            isActive={activeItem === 'home'}
            onClick={() => onNavigate('home')}
          />
        </li>
        {!hideContents && (
          <li data-testid="nav-contents">
            <NavItem
              id="contents"
              icon={ListIcon}
              label="Contents"
              isActive={activeItem === 'contents'}
              onClick={() => onNavigate('contents')}
            />
          </li>
        )}
        <li>
          <NavItem
            id="tools"
            icon={WrenchIcon}
            label="Tools"
            isActive={activeItem === 'tools'}
            badge={toolsUnlocked > 0 ? toolsUnlocked : undefined}
            hasExpansion
            onClick={() => onExpandTools?.()}
          />
        </li>
        <li>
          <NavItem
            id="profile"
            icon={UserIcon}
            label="Profile"
            isActive={activeItem === 'profile'}
            onClick={() => onNavigate('profile')}
          />
        </li>
      </ul>
    </nav>
  );
}
