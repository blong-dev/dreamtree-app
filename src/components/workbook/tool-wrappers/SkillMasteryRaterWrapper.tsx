'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { SkillMasteryRater, type SkillWithMastery } from '@/components/tools/SkillMasteryRater';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

/**
 * SkillMasteryRaterWrapper - Exercise 1.1.1 Part c
 * Rate mastery (1-10) for all skills created in Part b
 * Writes to user_skills table via domain writer
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
  const [skills, setSkills] = useState<SkillWithMastery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track the last refreshTrigger we fetched for (to detect changes)
  const lastRefreshRef = useRef<number | undefined>(refreshTrigger);
  // Store current skills for preserving mastery ratings on refresh
  const skillsRef = useRef<SkillWithMastery[]>(skills);
  skillsRef.current = skills;

  // Load data - from initialData on first load, or refetch when refreshTrigger changes
  useEffect(() => {
    const shouldRefetch = refreshTrigger !== undefined && refreshTrigger !== lastRefreshRef.current;

    // Update ref if we're going to refetch
    if (shouldRefetch) {
      lastRefreshRef.current = refreshTrigger;
    }

    // Use initialData on first load (not a refresh)
    if (initialData && !shouldRefetch) {
      try {
        const parsed = JSON.parse(initialData);
        if (parsed.skills && Array.isArray(parsed.skills)) {
          setSkills(parsed.skills);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[SkillMasteryRaterWrapper] Failed to parse initialData:', err);
        setIsLoading(false);
      }
      return;
    }

    // Fetch fresh skills (from Part b via connection or direct fetch)
    const fetchSkills = async () => {
      setIsLoading(true);
      try {
        // Try connection first if provided
        if (connectionId) {
          const res = await fetch(`/api/data/connection?connectionId=${connectionId}&_t=${Date.now()}`);
          const result = await res.json();
          if (!result.isEmpty && result.data && Array.isArray(result.data)) {
            // Connection returns skills - preserve existing mastery ratings if available
            const existingMasteryMap = new Map(skillsRef.current.map(s => [s.id, s.mastery]));
            const skillsWithMastery = result.data.map((skill: { id: string; name: string; mastery?: number }) => ({
              id: skill.id,
              name: skill.name,
              mastery: existingMasteryMap.get(skill.id) ?? skill.mastery ?? 5,
            }));
            setSkills(skillsWithMastery);
            setIsLoading(false);
            return;
          }
        }

        // Fallback: fetch custom skills directly from domain table
        const res = await fetch('/api/data/user-skills');
        const result = await res.json();
        if (result.skills && Array.isArray(result.skills)) {
          const existingMasteryMap = new Map(skillsRef.current.map(s => [s.id, s.mastery]));
          const skillsWithMastery = result.skills.map((skill: { id: string; name: string; mastery?: number }) => ({
            id: skill.id,
            name: skill.name,
            mastery: existingMasteryMap.get(skill.id) ?? skill.mastery ?? 5,
          }));
          setSkills(skillsWithMastery);
        }
      } catch (err) {
        console.error('[SkillMasteryRaterWrapper] Failed to load skills:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!readOnly || shouldRefetch) {
      fetchSkills();
    } else {
      setIsLoading(false);
    }
  }, [connectionId, initialData, readOnly, refreshTrigger]);

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

  // Check if tool has valid input (has skills to rate - they all have default mastery values)
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
