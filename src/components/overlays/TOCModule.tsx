'use client';

import { useState, useEffect } from 'react';
import { TOCExercise } from './TOCExercise';
import { ChevronRightIcon } from '../icons';
import { ProgressMarker } from './ProgressMarker';
import type { BreadcrumbLocation, ModuleProgress } from './types';

interface TOCModuleProps {
  module: ModuleProgress;
  partId: string;
  partTitle: string;
  currentLocation?: BreadcrumbLocation;
  onNavigate: (location: BreadcrumbLocation) => void;
  onClose: () => void;
}

export function TOCModule({
  module,
  partId,
  partTitle,
  currentLocation,
  onNavigate,
  onClose,
}: TOCModuleProps) { // code_id:262
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
    <div className="toc-module" data-status={module.status}>
      <button
        className="toc-module-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <ProgressMarker status={module.status} size="sm" />
        <span className="toc-module-title">{module.title}</span>
        <ChevronRightIcon
          className="toc-module-chevron"
          data-expanded={expanded}
          width={14}
          height={14}
        />
      </button>

      {expanded && (
        <div className="toc-module-exercises">
          {module.exercises.map((exercise) => (
            <TOCExercise
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
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}
