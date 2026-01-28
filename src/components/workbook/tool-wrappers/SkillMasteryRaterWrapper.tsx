'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
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
}, ref) { // code_id:1050
  const [skills, setSkills] = useState<SkillWithMastery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initialData for read-only mode (completed tools in history)
  useEffect(() => {
    if (initialData) {
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

    // Fetch skills from Part b (via connection or direct fetch)
    const fetchSkills = async () => {
      try {
        // Try connection first if provided
        if (connectionId) {
          const res = await fetch(`/api/data/connection?connectionId=${connectionId}`);
          const result = await res.json();
          if (!result.isEmpty && result.data && Array.isArray(result.data)) {
            // Connection returns skills - initialize with default mastery 5
            const skillsWithMastery = result.data.map((skill: { id: string; name: string; mastery?: number }) => ({
              id: skill.id,
              name: skill.name,
              mastery: skill.mastery ?? 5,
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
          const skillsWithMastery = result.skills.map((skill: { id: string; name: string; mastery?: number }) => ({
            id: skill.id,
            name: skill.name,
            mastery: skill.mastery ?? 5,
          }));
          setSkills(skillsWithMastery);
        }
      } catch (err) {
        console.error('[SkillMasteryRaterWrapper] Failed to load skills:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!readOnly) {
      fetchSkills();
    } else {
      setIsLoading(false);
    }
  }, [connectionId, initialData, readOnly]);

  // Get data in format expected by domain writer
  const getData = useCallback(() => ({
    skills,
  }), [skills]);

  const { isLoading: isSaving, error, save } = useToolSave({
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
