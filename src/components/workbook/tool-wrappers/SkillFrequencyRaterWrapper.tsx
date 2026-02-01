'use client';

import { useCallback, forwardRef, useImperativeHandle } from 'react';
import { SkillFrequencyRater, type SkillWithFrequency } from '@/components/tools/SkillFrequencyRater';
import { useToolSave } from '@/hooks/useToolSave';
import { useConnectionData } from '@/hooks/useConnectionData';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

/**
 * SkillFrequencyRaterWrapper - Exercise 1.1.5
 * Rate frequency (1-10) for all skills created in earlier exercises.
 * Writes to user_skills.frequency column via domain writer.
 *
 * Connection uses 'all_skills' data source which queries skills
 * with active evidence (evidence_count > 0) from user_skills table.
 */
export const SkillFrequencyRaterWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function SkillFrequencyRaterWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
  refreshTrigger,
  onDataChange,
}, ref) {
  // Parse initialData to SkillWithFrequency[]
  const parseInitialData = useCallback((json: string): SkillWithFrequency[] | null => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.skills && Array.isArray(parsed.skills)) {
        return parsed.skills;
      }
    } catch (err) {
      console.error('[SkillFrequencyRaterWrapper] Failed to parse initialData:', err);
    }
    return null;
  }, []);

  // Transform connection data (skills from all_skills source)
  const transformConnectionData = useCallback((data: unknown[]): SkillWithFrequency[] => {
    return data.map((skill: unknown) => {
      const s = skill as { id: string; name: string; frequency?: number };
      return {
        id: s.id,
        name: s.name,
        frequency: s.frequency ?? 5, // Default to 5 (middle) if not rated yet
      };
    });
  }, []);

  // Fallback: fetch skills directly from API
  const fallbackFetch = useCallback(async (): Promise<SkillWithFrequency[] | null> => {
    try {
      const res = await fetch(`/api/data/user-skills?include_frequency=true&_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const result = await res.json();
      if (result.skills && Array.isArray(result.skills)) {
        return result.skills.map((s: { id: string; name: string; frequency?: number }) => ({
          id: s.id,
          name: s.name,
          frequency: s.frequency ?? 5,
        }));
      }
    } catch (err) {
      console.error('[SkillFrequencyRaterWrapper] Failed to load skills from fallback:', err);
    }
    return null;
  }, []);

  // Merge fresh skills with existing data, preserving user's frequency ratings
  const mergeWithExisting = useCallback((existing: SkillWithFrequency[], fresh: SkillWithFrequency[]): SkillWithFrequency[] => {
    // Build a map of existing frequency ratings by skill ID
    const existingFrequencyMap = new Map(existing.map(s => [s.id, s.frequency]));

    // Return fresh skills with preserved frequency ratings
    return fresh.map(skill => ({
      id: skill.id,
      name: skill.name,
      frequency: existingFrequencyMap.get(skill.id) ?? skill.frequency ?? 5,
    }));
  }, []);

  const { data: skills, setData: setSkills, isLoading } = useConnectionData({
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
    skills,
  }), [skills]);

  const { isLoading: isSaving, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
    onDataChange,
  });

  // Check if tool has valid input (has skills to rate)
  const isValid = useCallback(() => skills.length > 0, [skills]);

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
        <p>Loading skills...</p>
      </div>
    );
  }

  // Read-only mode for completed tools
  if (readOnly) {
    return (
      <div className="tool-completed-view">
        <SkillFrequencyRater
          skills={skills}
          onChange={() => {}} // No-op for read-only
          disabled
        />
      </div>
    );
  }

  return (
    <>
      <SkillFrequencyRater
        skills={skills}
        onChange={setSkills}
      />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isSaving && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
