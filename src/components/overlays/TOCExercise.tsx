'use client';

import { ProgressMarker } from './ProgressMarker';
import type { BreadcrumbLocation, ExerciseProgress } from './types';

interface TOCExerciseProps {
  exercise: ExerciseProgress;
  partId: string;
  partTitle: string;
  moduleId: string;
  moduleTitle: string;
  isCurrent: boolean;
  onNavigate: (location: BreadcrumbLocation) => void;
  onClose: () => void;
}

export function TOCExercise({
  exercise,
  partId,
  partTitle,
  moduleId,
  moduleTitle,
  isCurrent,
  onNavigate,
  onClose,
}: TOCExerciseProps) { // code_id:260
  const isLocked = exercise.status === 'locked';

  const handleClick = () => { // code_id:261
    if (isLocked) return;

    onNavigate({
      partId,
      partTitle,
      moduleId,
      moduleTitle,
      exerciseId: exercise.id,
      exerciseTitle: exercise.title,
    });
    onClose();
  };

  return (
    <button
      className="toc-exercise"
      data-status={exercise.status}
      data-current={isCurrent}
      onClick={handleClick}
      disabled={isLocked}
    >
      <ProgressMarker status={exercise.status} size="xs" />
      <span className="toc-exercise-title">{exercise.title}</span>
      {isCurrent && <span className="toc-exercise-current">Current</span>}
    </button>
  );
}
