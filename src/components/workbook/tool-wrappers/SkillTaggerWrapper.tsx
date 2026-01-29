'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { SkillTagger, Skill } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

export const SkillTaggerWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function SkillTaggerWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:380
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        if (parsed.selectedSkillIds) setSelectedSkillIds(parsed.selectedSkillIds);
      } catch (err) {
        console.error('[SkillTaggerWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // Fetch skills
  useEffect(() => {
    if (skills.length > 0) return;

    setDataLoading(true);
    setDataError(null);
    fetch('/api/data/skills')
      .then(res => res.json())
      .then(data => {
        if (data.skills) setSkills(data.skills);
      })
      .catch(err => {
        console.error('[SkillTaggerWrapper] Failed to load skills:', err);
        setDataError('Failed to load skills. Tap to retry.');
      })
      .finally(() => setDataLoading(false));
  }, [skills.length]);

  // Fetch connected data if provided (only for active tools)
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data || !Array.isArray(result.data)) return;
        const skillIds = result.data
          .map((s: { skillId?: string; id?: string }) => s.skillId || s.id || '')
          .filter(Boolean);
        setSelectedSkillIds(skillIds);
      })
      .catch(err => console.error('[SkillTaggerWrapper] Failed to load connection data:', err));
  }, [connectionId, readOnly, initialData]);

  const getData = useCallback(() => ({ selectedSkillIds }), [selectedSkillIds]);

  const { isLoading, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
  });

  // Check if tool has valid input (at least one skill selected)
  const isValid = useCallback(() => selectedSkillIds.length > 0, [selectedSkillIds]);

  // Expose save and isValid methods to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      await save();
    },
    isValid,
  }), [save, isValid]);

  const handleRetry = useCallback(() => {
    setDataError(null);
    setSkills([]);
  }, []);

  if (dataError) {
    return (
      <div className="tool-embed-error-state">
        <p>{dataError}</p>
        <button className="button button-secondary" onClick={handleRetry}>Retry</button>
      </div>
    );
  }

  if (dataLoading) {
    return <div className="tool-embed-loading">Loading skills...</div>;
  }

  if (readOnly) {
    return (
      <div className="tool-completed-view">
        <SkillTagger
          skills={skills}
          selectedSkillIds={selectedSkillIds}
          onChange={() => {}}
          storyTitle="Tagged skills"
        />
      </div>
    );
  }

  return (
    <>
      <SkillTagger
        skills={skills}
        selectedSkillIds={selectedSkillIds}
        onChange={setSelectedSkillIds}
        storyTitle="Tag skills for this story"
      />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
