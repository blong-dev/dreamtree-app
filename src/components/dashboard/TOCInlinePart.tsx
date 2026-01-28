'use client';

import { TOCInlineModule } from './TOCInlineModule';
import { ChevronRightIcon } from '../icons';
import type { TOCPartData } from './types';
import type { BreadcrumbLocation } from '../overlays/types';

interface TOCInlinePartProps {
  part: TOCPartData;
  isExpanded: boolean;
  onToggle: () => void;
  currentLocation?: BreadcrumbLocation;
  onNavigate: (location: BreadcrumbLocation) => void;
}

export function TOCInlinePart({
  part,
  isExpanded,
  onToggle,
  currentLocation,
  onNavigate,
}: TOCInlinePartProps) { // code_id:196
  const isLocked = part.status === 'locked';

  return (
    <div className="toc-inline-part" data-status={part.status}>
      <button
        className="toc-inline-part-header"
        onClick={onToggle}
        disabled={isLocked}
        aria-expanded={isExpanded}
      >
        <div className="toc-inline-part-info">
          <span className="toc-inline-part-title">{part.title}</span>
          {isLocked && (
            <span className="toc-inline-part-lock" aria-label="Locked">
              🔒
            </span>
          )}
        </div>
        <div className="toc-inline-part-progress">
          <span className="toc-inline-part-percent">{part.progress}%</span>
          <div className="toc-inline-part-bar">
            <div
              className="toc-inline-part-bar-fill"
              style={{ width: `${part.progress}%` }}
            />
          </div>
        </div>
        <ChevronRightIcon
          className="toc-inline-part-chevron"
          data-expanded={isExpanded}
          width={16}
          height={16}
          aria-hidden="true"
        />
      </button>

      {isExpanded && !isLocked && (
        <div className="toc-inline-part-modules">
          {part.modules.map((module) => (
            <TOCInlineModule
              key={module.id}
              module={module}
              partId={part.id}
              partTitle={part.title}
              currentLocation={currentLocation}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
