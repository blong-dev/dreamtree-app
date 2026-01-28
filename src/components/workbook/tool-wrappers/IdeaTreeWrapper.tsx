'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { IdeaTree, IdeaTreeData, getDefaultIdeaTreeData } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

export const IdeaTreeWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function IdeaTreeWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:374
  const [data, setData] = useState<IdeaTreeData>(getDefaultIdeaTreeData());

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        setData({ ...getDefaultIdeaTreeData(), ...parsed });
      } catch (err) {
        console.error('[IdeaTreeWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // BUG-411: Fetch connected data (e.g., flow activities for inspiration)
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data) return;
        // Connection provides context data (e.g., energizing activities)
        // For IdeaTree, we could pre-fill rootIdea with first activity
        if (Array.isArray(result.data) && result.data.length > 0) {
          const firstItem = result.data[0];
          if (firstItem.activity && !data.rootIdea) {
            setData(prev => ({ ...prev, rootIdea: firstItem.activity }));
          }
        }
      })
      .catch(err => console.error('[IdeaTreeWrapper] Failed to load connection data:', err));
  }, [connectionId, readOnly, initialData, data.rootIdea]);

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
        <IdeaTree data={data} onChange={() => {}} />
      </div>
    );
  }

  return (
    <>
      <IdeaTree data={data} onChange={setData} />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
