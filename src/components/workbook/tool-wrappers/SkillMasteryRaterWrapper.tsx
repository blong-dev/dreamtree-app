'use client';

import { useCallback, forwardRef, useImperativeHandle } from 'react';
import { SkillMasteryRater, type SkillWithMastery } from '@/components/tools/SkillMasteryRater';
import { useToolSave } from '@/hooks/useToolSave';
import { useConnectionData } from '@/hooks/useConnectionData';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

/**
 * SkillMasteryRaterWrapper - Exercise 1.1.1 Part c
 * Rate mastery (1-10) for all skills created in Part b
 * Writes to user_skills table via domain writer
 *
 * Connection uses 'custom_skills' data source which queries skills table
 * directly (WHERE created_by = user_id) with LEFT JOIN to user_skills
 * for existing mastery ratings. This ensures we see all skills from Part 1b.
 */
export const SkillMasteryRaterWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function SkillMasteryRaterWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
  refreshTrigger,
  onDataChange,
}, ref) { // code_id:1050
  // Parse initialData to SkillWithMastery[]
  const parseInitialData = useCallback((json: string): SkillWithMastery[] | null => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.skills && Array.isArray(parsed.skills)) {
        return parsed.skills;
      }
    } catch (err) {
      console.error('[SkillMasteryRaterWrapper] Failed to parse initialData:', err);
    }
    return null;
  }, []);

  // Transform connection data (CustomSkill[] from custom_skills source)
  const transformConnectionData = useCallback((data: unknown[]): SkillWithMastery[] => {
    return data.map((skill: unknown) => {
      const s = skill as { id: string; name: string; mastery?: number };
      return {
        id: s.id,
        name: s.name,
        mastery: s.mastery ?? 5,
      };
    });
  }, []);

  // Fallback: fetch custom skills directly from API
  const fallbackFetch = useCallback(async (): Promise<SkillWithMastery[] | null> => {
    try {
      const res = await fetch(`/api/data/user-skills?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const result = await res.json();
      if (result.skills && Array.isArray(result.skills)) {
        return result.skills.map((s: { id: string; name: string; mastery?: number }) => ({
          id: s.id,
          name: s.name,
          mastery: s.mastery ?? 5,
        }));
      }
    } catch (err) {
      console.error('[SkillMasteryRaterWrapper] Failed to load skills from fallback:', err);
    }
    return null;
  }, []);

  // Merge fresh skills with existing data, preserving user's mastery ratings
  const mergeWithExisting = useCallback((existing: SkillWithMastery[], fresh: SkillWithMastery[]): SkillWithMastery[] => {
    // Build a map of existing mastery ratings by skill ID
    const existingMasteryMap = new Map(existing.map(s => [s.id, s.mastery]));

    // Return fresh skills with preserved mastery ratings
    return fresh.map(skill => ({
      id: skill.id,
      name: skill.name,
      mastery: existingMasteryMap.get(skill.id) ?? skill.mastery ?? 5,
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
        <SkillMasteryRater
          skills={skills}
          onChange={() => {}} // No-op for read-only
          disabled
        />
      </div>
    );
  }

  return (
    <>
      <SkillMasteryRater
        skills={skills}
        onChange={setSkills}
      />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isSaving && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
