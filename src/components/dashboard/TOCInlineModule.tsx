'use client';

import { useState, useEffect } from 'react';
import { TOCInlineExercise } from './TOCInlineExercise';
import { ChevronRightIcon } from '../icons';
import { ProgressMarker } from '../overlays/ProgressMarker';
import type { TOCModuleData } from './types';
import type { BreadcrumbLocation } from '../overlays/types';

interface TOCInlineModuleProps {
  module: TOCModuleData;
  partId: string;
  partTitle: string;
  currentLocation?: BreadcrumbLocation;
  onNavigate: (location: BreadcrumbLocation) => void;
}

export function TOCInlineModule({
  module,
  partId,
  partTitle,
  currentLocation,
  onNavigate,
}: TOCInlineModuleProps) { // code_id:195
  const isCurrentModule =
    currentLocation?.partId === partId &&
    currentLocation?.moduleId === module.id;
  const isInProgress = module.status === 'in-progress';

  const [expanded, setExpanded] = useState(isCurrentModule || isInProgress);

  useEffect(() => {
    if (isCurrentModule || isInProgress) {
      setExpanded(true);
    }
  }, [isCurrentModule, isInProgress]);

  return (
    <div className="toc-inline-module" data-status={module.status}>
      <button
        className="toc-inline-module-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <ProgressMarker status={module.status} size="sm" />
        <span className="toc-inline-module-title">{module.title}</span>
        <ChevronRightIcon
          className="toc-inline-module-chevron"
          data-expanded={expanded}
          width={14}
          height={14}
        />
      </button>

      {expanded && (
        <div className="toc-inline-module-exercises">
          {module.exercises.map((exercise) => (
            <TOCInlineExercise
              key={exercise.id}
              exercise={exercise}
              partId={partId}
              partTitle={partTitle}
              moduleId={module.id}
              moduleTitle={module.title}
              isCurrent={
                currentLocation?.partId === partId &&
                currentLocation?.moduleId === module.id &&
                currentLocation?.exerciseId === exercise.id
              }
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
