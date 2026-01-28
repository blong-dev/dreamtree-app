'use client';

import { useState, useEffect } from 'react';
import { TOCModule } from './TOCModule';
import { ChevronRightIcon, LockIcon } from '../icons';
import type { BreadcrumbLocation, PartProgress } from './types';

interface TOCPartProps {
  part: PartProgress;
  currentLocation?: BreadcrumbLocation;
  onNavigate: (location: BreadcrumbLocation) => void;
  onClose: () => void;
}

export function TOCPart({
  part,
  currentLocation,
  onNavigate,
  onClose,
}: TOCPartProps) { // code_id:264
  const isLocked = part.status === 'locked';
  const isCurrentPart = currentLocation?.partId === part.id;
  const isInProgress = part.status === 'in-progress';

  // Auto-expand if contains current location or is in-progress
  const [expanded, setExpanded] = useState(isCurrentPart || isInProgress);

  useEffect(() => {
    if (isCurrentPart || isInProgress) {
      setExpanded(true);
    }
  }, [isCurrentPart, isInProgress]);

  return (
    <div className="toc-part" data-status={part.status}>
      <button
        className="toc-part-header"
        onClick={() => !isLocked && setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-disabled={isLocked}
        disabled={isLocked}
      >
        {isLocked ? (
          <LockIcon className="toc-part-icon" width={16} height={16} />
        ) : (
          <ChevronRightIcon
            className="toc-part-icon"
            data-expanded={expanded}
            width={16}
            height={16}
          />
        )}
        <span className="toc-part-title">{part.title}</span>
        {!isLocked && (
          <span className="toc-part-progress">{part.percentComplete}%</span>
        )}
      </button>

      {expanded && !isLocked && (
        <div className="toc-part-modules">
          {part.modules.map((module) => (
            <TOCModule
              key={module.id}
              module={module}
              partId={part.id}
              partTitle={part.title}
              currentLocation={currentLocation}
              onNavigate={onNavigate}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}
