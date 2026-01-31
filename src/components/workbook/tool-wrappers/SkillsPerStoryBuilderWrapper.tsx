'use client';

import { useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import {
  TasksPerExperienceBuilder,
  type ExperienceWithTasks,
  type TasksPerExperienceLabels,
} from '@/components/tools';
import type { ExperienceEntry } from '@/components/tools/ExperienceBuilder';
import { useToolSave } from '@/hooks/useToolSave';
import { useConnectionData } from '@/hooks/useConnectionData';
import type { SOAREDStory } from '@/lib/connections/types';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

// Internal interface for story→skills data (mirrors story structure)
interface StoryWithSkills {
  story: SOAREDStory;
  skills: { id: string; value: string }[];
}

// Labels for skills/stories context
const SKILLS_LABELS: TasksPerExperienceLabels = {
  parentName: 'story',
  parentNamePlural: 'stories',
  childName: 'skill',
  childNamePlural: 'skills',
  prompt: 'What transferable skills did you use or develop in this experience? Think about problem-solving, communication, leadership, technical skills, etc.',
  placeholder: 'Add a skill...',
  emptyMessage: 'No SOARED stories found. Please complete the SOARED stories exercises first.',
};

/**
 * Map a SOAREDStory to ExperienceEntry shape for the generalized component.
 * Stories just need id and title - we hide type badge and organization.
 */
function storyToExperience(story: SOAREDStory): ExperienceEntry {
  // Generate display title: use story.title, or fallback to first sentence of action
  const displayTitle = story.title ||
    (story.action ? story.action.split('.')[0].slice(0, 50) + '...' : 'Untitled Story');

  return {
    id: story.id,
    title: displayTitle,
    organization: '', // Not shown for stories
    experienceType: 'other', // Not shown (showTypeBadge=false)
    startDate: '',
    endDate: '',
  };
}

/**
 * SkillsPerStoryBuilderWrapper - Part 4 (Module 1, Exercise 4)
 * For each SOARED story, list the transferable skills used.
 * Uses the generalized TasksPerExperienceBuilder with custom labels.
 */
export const SkillsPerStoryBuilderWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function SkillsPerStoryBuilderWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
  refreshTrigger,
  onDataChange,
}, ref) {
  // Parse initialData from storiesWithSkills format
  const parseInitialData = useCallback((json: string): StoryWithSkills[] | null => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.storiesWithSkills && Array.isArray(parsed.storiesWithSkills)) {
        return parsed.storiesWithSkills;
      }
    } catch (err) {
      console.error('[SkillsPerStoryBuilderWrapper] Failed to parse initialData:', err);
    }
    return null;
  }, []);

  // Transform connection data (SOARED stories from Part 3) to StoryWithSkills[]
  const transformConnectionData = useCallback((data: unknown[]): StoryWithSkills[] => {
    return data.map((story) => ({
      story: story as SOAREDStory,
      skills: [],
    }));
  }, []);

  // Fallback: fetch stories directly from domain table
  const fallbackFetch = useCallback(async (): Promise<StoryWithSkills[] | null> => {
    try {
      const res = await fetch(`/api/data/stories?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const result = await res.json();
      if (result.stories && Array.isArray(result.stories)) {
        return result.stories.map((story: SOAREDStory) => ({
          story,
          skills: [],
        }));
      }
    } catch (err) {
      console.error('[SkillsPerStoryBuilderWrapper] Failed to load stories from fallback:', err);
    }
    return null;
  }, []);

  // Merge fresh stories with existing data, preserving user's skills
  const mergeWithExisting = useCallback((existing: StoryWithSkills[], fresh: StoryWithSkills[]): StoryWithSkills[] => {
    // Build a map of existing skills by story ID
    const existingSkillsMap = new Map(existing.map(s => [s.story.id, s.skills]));

    // Return fresh stories with preserved skills
    return fresh.map(item => ({
      story: item.story,
      skills: existingSkillsMap.get(item.story.id) || [],
    }));
  }, []);

  const { data: storiesWithSkills, setData: setStoriesWithSkills, isLoading } = useConnectionData({
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

  // Convert storiesWithSkills to ExperienceWithTasks format for the component
  const experiencesWithTasks: ExperienceWithTasks[] = useMemo(() => {
    return storiesWithSkills.map(item => ({
      experience: storyToExperience(item.story),
      tasks: item.skills, // skills have same shape as TaskEntry
    }));
  }, [storiesWithSkills]);

  // Keep a reference to the original stories for context rendering
  const storyMap = useMemo(() => {
    return new Map(storiesWithSkills.map(s => [s.story.id, s.story]));
  }, [storiesWithSkills]);

  // Handle changes from the component, mapping back to story format
  const handleChange = useCallback((data: ExperienceWithTasks[]) => {
    setStoriesWithSkills(data.map(item => ({
      story: storyMap.get(item.experience.id)!,
      skills: item.tasks,
    })));
  }, [setStoriesWithSkills, storyMap]);

  // Get data in format expected by domain writer
  const getData = useCallback(() => ({
    storiesWithSkills,
  }), [storiesWithSkills]);

  const { isLoading: isSaving, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
    onDataChange,
  });

  // Check if tool has valid input (at least one story has at least one skill)
  const isValid = useCallback(() => {
    return storiesWithSkills.some(s => s.skills && s.skills.length > 0);
  }, [storiesWithSkills]);

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
        <p>Loading stories...</p>
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
          labels={SKILLS_LABELS}
          showTypeBadge={false}
          showOrganization={false}
        />
      </div>
    );
  }

  return (
    <>
      <TasksPerExperienceBuilder
        experiencesWithTasks={experiencesWithTasks}
        onChange={handleChange}
        labels={SKILLS_LABELS}
        showTypeBadge={false}
        showOrganization={false}
      />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isSaving && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
