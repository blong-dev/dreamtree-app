'use client';

import { useCallback, forwardRef, useImperativeHandle } from 'react';
import { TasksPerExperienceBuilder, type ExperienceWithTasks } from '@/components/tools/TasksPerExperienceBuilder';
import { useToolSave } from '@/hooks/useToolSave';
import { useConnectionData } from '@/hooks/useConnectionData';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

/**
 * TasksPerExperienceBuilderWrapper - Exercise 1.1.1 Part b
 * For each experience from Part a, list the tasks performed
 * Writes to skills, user_skills, and skill_evidence tables via domain writer
 */
export const TasksPerExperienceBuilderWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function TasksPerExperienceBuilderWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
  refreshTrigger,
  onDataChange,
}, ref) { // code_id:1030
  // Parse initialData to ExperienceWithTasks[]
  const parseInitialData = useCallback((json: string): ExperienceWithTasks[] | null => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.experiencesWithTasks && Array.isArray(parsed.experiencesWithTasks)) {
        return parsed.experiencesWithTasks;
      }
    } catch (err) {
      console.error('[TasksPerExperienceBuilderWrapper] Failed to parse initialData:', err);
    }
    return null;
  }, []);

  // Transform connection data (experiences from Part A) to ExperienceWithTasks[]
  const transformConnectionData = useCallback((data: unknown[]): ExperienceWithTasks[] => {
    return data.map((exp) => ({
      experience: exp as ExperienceWithTasks['experience'],
      tasks: [],
    }));
  }, []);

  // Fallback: fetch experiences directly from domain table
  const fallbackFetch = useCallback(async (): Promise<ExperienceWithTasks[] | null> => {
    try {
      const res = await fetch(`/api/data/experiences?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const result = await res.json();
      if (result.experiences && Array.isArray(result.experiences)) {
        return result.experiences.map((exp: ExperienceWithTasks['experience']) => ({
          experience: exp,
          tasks: [],
        }));
      }
    } catch (err) {
      console.error('[TasksPerExperienceBuilderWrapper] Failed to load experiences from fallback:', err);
    }
    return null;
  }, []);

  // Merge fresh experiences with existing data, preserving user's tasks
  const mergeWithExisting = useCallback((existing: ExperienceWithTasks[], fresh: ExperienceWithTasks[]): ExperienceWithTasks[] => {
    // Build a map of existing tasks by experience ID
    const existingTasksMap = new Map(existing.map(e => [e.experience.id, e.tasks]));

    // Return fresh experiences with preserved tasks
    return fresh.map(exp => ({
      experience: exp.experience,
      tasks: existingTasksMap.get(exp.experience.id) || [],
    }));
  }, []);

  const { data: experiencesWithTasks, setData: setExperiencesWithTasks, isLoading } = useConnectionData({
    connectionId,
    initialData,
    readOnly,
    refreshTrigger,
    parseInitialData,
    transformConnectionData,
    fallbackFetch,
    mergeWithExisting,
    defaultValue: [],
  });

  // Get data in format expected by domain writer
  const getData = useCallback(() => ({
    experiencesWithTasks,
  }), [experiencesWithTasks]);

  const { isLoading: isSaving, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
    onDataChange,
  });

  // Check if tool has valid input (at least one experience has at least one task)
  const isValid = useCallback(() => {
    return experiencesWithTasks.some(exp => exp.tasks && exp.tasks.length > 0);
  }, [experiencesWithTasks]);

  // Expose save and isValid methods to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      await save();
    },
    isValid,
  }), [save, isValid]);

  // Loading state
  if (isLoading) {
    return (
      <div className="tool-embed-loading">
        <p>Loading experiences...</p>
      </div>
    );
  }

  // Read-only mode for completed tools
  if (readOnly) {
    return (
      <div className="tool-completed-view">
        <TasksPerExperienceBuilder
          experiencesWithTasks={experiencesWithTasks}
          onChange={() => {}} // No-op for read-only
          disabled
        />
      </div>
    );
  }

  return (
    <>
      <TasksPerExperienceBuilder
        experiencesWithTasks={experiencesWithTasks}
        onChange={setExperiencesWithTasks}
      />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isSaving && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
