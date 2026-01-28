'use client';

import { ProgressMarker } from '../overlays/ProgressMarker';
import type { TOCExerciseData } from './types';
import type { BreadcrumbLocation } from '../overlays/types';

interface TOCInlineExerciseProps {
  exercise: TOCExerciseData;
  partId: string;
  partTitle: string;
  moduleId: string;
  moduleTitle: string;
  isCurrent: boolean;
  onNavigate: (location: BreadcrumbLocation) => void;
}

export function TOCInlineExercise({
  exercise,
  partId,
  partTitle,
  moduleId,
  moduleTitle,
  isCurrent,
  onNavigate,
}: TOCInlineExerciseProps) { // code_id:193
  const isLocked = exercise.status === 'locked';

  const handleClick = () => { // code_id:194
    if (isLocked) return;

    onNavigate({
      partId,
      partTitle,
      moduleId,
      moduleTitle,
      exerciseId: exercise.id,
      exerciseTitle: exercise.title,
    });
  };

  return (
    <button
      className="toc-inline-exercise"
      data-status={exercise.status}
      data-current={isCurrent}
      onClick={handleClick}
      disabled={isLocked}
    >
      <ProgressMarker status={exercise.status} size="xs" />
      <span className="toc-inline-exercise-title">{exercise.title}</span>
      {isCurrent && <span className="toc-inline-exercise-current">Current</span>}
    </button>
  );
}
