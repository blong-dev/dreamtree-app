'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { MindsetProfiles, MindsetProfilesData } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

const DEFAULT_DATA: MindsetProfilesData = {
  selectedCharacters: {
    'curiosity': '',
    'bias-to-action': '',
    'reframing': '',
    'awareness': '',
    'radical-collaboration': '',
  },
};

export const MindsetProfilesWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function MindsetProfilesWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:378
  const [data, setData] = useState<MindsetProfilesData>(DEFAULT_DATA);

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        setData({ ...DEFAULT_DATA, ...parsed });
      } catch (err) {
        console.error('[MindsetProfilesWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // BUG-427: Fetch connected data (prior mindset profile selections)
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data) return;
        // Connection data could be prior mindset profile selections
        const connData = result.data;
        if (connData?.selectedCharacters) {
          setData(prev => ({ ...prev, selectedCharacters: { ...prev.selectedCharacters, ...connData.selectedCharacters } }));
        }
      })
      .catch(err => console.error('[MindsetProfilesWrapper] Failed to load connection data:', err));
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
        <MindsetProfiles data={data} onChange={() => {}} />
      </div>
    );
  }

  return (
    <>
      <MindsetProfiles data={data} onChange={setData} />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
