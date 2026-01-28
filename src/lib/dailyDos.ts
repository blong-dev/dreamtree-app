import type { DailyDo, DailyDoType } from '@/components/dashboard/types';

/**
 * Determine which Daily Do's to show based on user's current exercise.
 * Daily Do's progressively unlock as users advance through the workbook.
 *
 * Exercise ID format: "part.module.exercise" (e.g., "1.1.3", "2.1.1")
 */
export function getDailyDos(currentExerciseId: string): DailyDo[] { // code_id:459
  // Parse current exercise to determine progress
  const segments = currentExerciseId.split('.');
  const partNum = parseInt(segments[0] || '1', 10);
  const moduleNum = parseInt(segments[1] || '1', 10);
  const exerciseNum = parseInt(segments[2] || '1', 10);

  const dailyDos: DailyDo[] = [];

  // SOARED form is introduced in exercise 1.1.3
  // Only show SOARED prompt if user has reached or passed 1.1.3
  if (partNum > 1 || moduleNum > 1 || exerciseNum >= 3) {
    dailyDos.push({
      id: '2',
      type: 'soared-prompt',
      title: 'SOARED Story Prompt',
      subtitle: 'Think of a time you helped someone solve a problem',
      action: { label: 'Write Story', href: '/tools/soared-form' },
    });
  }

  // Flow tracker is introduced in module 1.2 (exercise 1.2.1)
  // Only show flow tracking if user has reached or passed module 1.2
  if (partNum > 1 || moduleNum >= 2) {
    dailyDos.push({
      id: '1',
      type: 'flow-tracking',
      title: 'Track Your Flow State',
      subtitle: 'Log an activity where you lost track of time',
      action: { label: 'Log Flow', href: '/tools/flow-tracker' },
    });
  }

  return dailyDos;
}

/**
 * Check if a specific Daily Do type is unlocked for a given exercise.
 */
export function isDailyDoUnlocked(type: DailyDoType, currentExerciseId: string): boolean { // code_id:460
  const segments = currentExerciseId.split('.');
  const partNum = parseInt(segments[0] || '1', 10);
  const moduleNum = parseInt(segments[1] || '1', 10);
  const exerciseNum = parseInt(segments[2] || '1', 10);

  switch (type) {
    case 'soared-prompt':
      // Unlocks at 1.1.3
      return partNum > 1 || moduleNum > 1 || exerciseNum >= 3;
    case 'flow-tracking':
      // Unlocks at 1.2.1
      return partNum > 1 || moduleNum >= 2;
    default:
      // Other types not yet implemented
      return false;
  }
}
