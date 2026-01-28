'use client';

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Backdrop } from './Backdrop';
import { TOCPart } from './TOCPart';
import { XIcon } from '../icons';
import type { BreadcrumbLocation, WorkbookProgress } from './types';

interface TOCPanelProps {
  open: boolean;
  onClose: () => void;
  currentLocation?: BreadcrumbLocation;
  progress: WorkbookProgress;
  onNavigate: (location: BreadcrumbLocation) => void;
}

export function TOCPanel({
  open,
  onClose,
  currentLocation,
  progress,
  onNavigate,
}: TOCPanelProps) { // code_id:263
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  // Only render portal on client
  if (typeof window === 'undefined') return null;

  return createPortal(
    <>
      <Backdrop visible={true} onClick={onClose} />
      <nav
        className="toc-panel"
        role="navigation"
        aria-label="Table of contents"
      >
        <header className="toc-panel-header">
          <h2 className="toc-panel-title">Contents</h2>
          <button
            className="toc-panel-close"
            onClick={onClose}
            aria-label="Close table of contents"
          >
            <XIcon width={20} height={20} />
          </button>
        </header>

        <div className="toc-panel-content">
          {progress.parts.map((part) => (
            <TOCPart
              key={part.id}
              part={part}
              currentLocation={currentLocation}
              onNavigate={onNavigate}
              onClose={onClose}
            />
          ))}
        </div>
      </nav>
    </>,
    document.body
  );
}
