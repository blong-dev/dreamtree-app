'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { TasksPerExperienceBuilder, type ExperienceWithTasks } from '@/components/tools/TasksPerExperienceBuilder';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

/**
 * TasksPerExperienceBuilderWrapper - Exercise 1.1.1 Part b
 * For each experience from Part a, list the tasks performed
 * Writes to skills and user_experience_skills tables via domain writer
 */
export const TasksPerExperienceBuilderWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function TasksPerExperienceBuilderWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:1030
  const [experiencesWithTasks, setExperiencesWithTasks] = useState<ExperienceWithTasks[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initialData for read-only mode (completed tools in history)
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        if (parsed.experiencesWithTasks && Array.isArray(parsed.experiencesWithTasks)) {
          setExperiencesWithTasks(parsed.experiencesWithTasks);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[TasksPerExperienceBuilderWrapper] Failed to parse initialData:', err);
        setIsLoading(false);
      }
      return;
    }

    // Fetch experiences from Part a (via connection or direct fetch)
    const fetchExperiences = async () => {
      try {
        // Try connection first if provided
        if (connectionId) {
          // Add timestamp to bust cache and ensure fresh data after Part a save
          const res = await fetch(`/api/data/connection?connectionId=${connectionId}&_t=${Date.now()}`, {
            cache: 'no-store',
          });
          const result = await res.json();
          if (!result.isEmpty && result.data && Array.isArray(result.data)) {
            // Connection returns experiences - initialize with empty task arrays
            const expWithTasks = result.data.map((exp: ExperienceWithTasks['experience']) => ({
              experience: exp,
              tasks: [],
            }));
            setExperiencesWithTasks(expWithTasks);
            setIsLoading(false);
            return;
          }
        }

        // Fallback: fetch experiences directly from domain table
        const res = await fetch(`/api/data/experiences?_t=${Date.now()}`, {
          cache: 'no-store',
        });
        const result = await res.json();
        if (result.experiences && Array.isArray(result.experiences)) {
          const expWithTasks = result.experiences.map((exp: ExperienceWithTasks['experience']) => ({
            experience: exp,
            tasks: [],
          }));
          setExperiencesWithTasks(expWithTasks);
        }
      } catch (err) {
        console.error('[TasksPerExperienceBuilderWrapper] Failed to load experiences:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!readOnly) {
      fetchExperiences();
    } else {
      setIsLoading(false);
    }
  }, [connectionId, initialData, readOnly]);

  // Get data in format expected by domain writer
  const getData = useCallback(() => ({
    experiencesWithTasks,
  }), [experiencesWithTasks]);

  const { isLoading: isSaving, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
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
