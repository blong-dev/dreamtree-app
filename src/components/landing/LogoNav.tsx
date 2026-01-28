'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AcornIcon } from '@/components/icons';

interface LogoNavProps {
  /** Current page path to highlight in dropdown */
  currentPath?: string;
}

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/principles', label: 'Principles' },
];

/**
 * Logo that secretly contains navigation.
 * Looks like a normal logo - no visual hint it's clickable.
 * Click to reveal dropdown with site navigation.
 */
export function LogoNav({ currentPath }: LogoNavProps) { // code_id:916
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => { // code_id:917
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => { // code_id:918
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="logo-nav" ref={containerRef}>
      <button
        className="logo-nav-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <AcornIcon width={32} height={32} />
        <span className="landing-wordmark">dreamtree</span>
      </button>

      {isOpen && (
        <nav className="logo-nav-dropdown" role="menu">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`logo-nav-link ${currentPath === link.href ? 'active' : ''}`}
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
