'use client';

import { useCallback, forwardRef, useImperativeHandle } from 'react';
import { ExperienceBuilder, type ExperienceEntry } from '@/components/tools/ExperienceBuilder';
import { useToolSave } from '@/hooks/useToolSave';
import { useConnectionData } from '@/hooks/useConnectionData';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

/**
 * ExperienceBuilderWrapper - Exercise 1.1.1 Part a
 * Lists jobs, projects, education experiences
 * Writes to user_experiences table via domain writer
 */
export const ExperienceBuilderWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function ExperienceBuilderWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
  onDataChange,
}, ref) { // code_id:1010
  // Parse initialData JSON to ExperienceEntry[]
  const parseInitialData = useCallback((json: string): ExperienceEntry[] | null => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.experiences && Array.isArray(parsed.experiences)) {
        return parsed.experiences;
      }
    } catch (err) {
      console.error('[ExperienceBuilderWrapper] Failed to parse initialData:', err);
    }
    return null;
  }, []);

  // Transform connection data to ExperienceEntry[]
  const transformConnectionData = useCallback((data: unknown[]): ExperienceEntry[] => {
    return data as ExperienceEntry[];
  }, []);

  const { data: experiences, setData: setExperiences, isLoading } = useConnectionData({
    connectionId,
    initialData,
    readOnly,
    parseInitialData,
    transformConnectionData,
    defaultValue: [],
  });

  // Get data in format expected by domain writer
  const getData = useCallback(() => ({
    experiences,
  }), [experiences]);

  const { isLoading: isSaving, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
    onDataChange,
  });

  // Check if tool has valid input (at least one experience added)
  const isValid = useCallback(() => experiences.length > 0, [experiences]);

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
        <ExperienceBuilder
          experiences={experiences}
          onChange={() => {}} // No-op for read-only
          disabled
        />
      </div>
    );
  }

  return (
    <>
      <ExperienceBuilder
        experiences={experiences}
        onChange={setExperiences}
      />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isSaving && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
