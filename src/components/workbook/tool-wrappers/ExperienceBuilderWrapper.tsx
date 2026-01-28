'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ExperienceBuilder, type ExperienceEntry } from '@/components/tools/ExperienceBuilder';
import { useToolSave } from '@/hooks/useToolSave';
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
}, ref) { // code_id:1010
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([]);

  // Load initialData for read-only mode (completed tools in history)
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        if (parsed.experiences && Array.isArray(parsed.experiences)) {
          setExperiences(parsed.experiences);
        }
      } catch (err) {
        console.error('[ExperienceBuilderWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // Fetch connected data if provided (only for active tools, not read-only)
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data || !Array.isArray(result.data)) return;
        // Connection data would come from previous experiences if editing
        setExperiences(result.data);
      })
      .catch(err => console.error('[ExperienceBuilderWrapper] Failed to load connection data:', err));
  }, [connectionId, readOnly, initialData]);

  // Get data in format expected by domain writer
  const getData = useCallback(() => ({
    experiences,
  }), [experiences]);

  const { isLoading, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
  });

  // Expose save method to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      await save();
    }
  }), [save]);

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
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
