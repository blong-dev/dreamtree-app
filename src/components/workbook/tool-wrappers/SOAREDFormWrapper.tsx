'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { SOAREDForm, SOAREDStoryData } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

const DEFAULT_SOARED_DATA: SOAREDStoryData = {
  title: '',
  situation: '',
  obstacle: '',
  action: '',
  result: '',
  evaluation: '',
  discovery: '',
  storyType: 'challenge',
};

export const SOAREDFormWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function SOAREDFormWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:381
  const [data, setData] = useState<SOAREDStoryData>(DEFAULT_SOARED_DATA);

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        setData({ ...DEFAULT_SOARED_DATA, ...parsed });
      } catch (err) {
        console.error('[SOAREDFormWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // BUG-416: Fetch connected data (prior SOARED stories) if provided
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data) return;

        // Connection data can be a single story or array of stories
        const stories = Array.isArray(result.data) ? result.data : [result.data];
        if (stories.length === 0) return;

        // Pre-populate with first story's data (user can modify)
        const story = stories[0];
        setData({
          title: story.title || '',
          situation: story.situation || '',
          obstacle: story.obstacle || '',
          action: story.action || '',
          result: story.result || '',
          evaluation: story.evaluation || '',
          discovery: story.discovery || '',
          storyType: story.storyType || 'challenge',
        });
      })
      .catch(err => console.error('[SOAREDFormWrapper] Failed to load connection data:', err));
  }, [connectionId, readOnly, initialData]);

  const getData = useCallback(() => data, [data]);

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

  if (readOnly) {
    return (
      <div className="tool-completed-view">
        <SOAREDForm data={data} onChange={() => {}} />
      </div>
    );
  }

  return (
    <>
      <SOAREDForm data={data} onChange={setData} />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
