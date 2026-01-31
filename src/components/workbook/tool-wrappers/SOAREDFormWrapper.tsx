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
  // connectionId not used - each SOARED story is independent, initialData handles returning to completed tools
  onComplete,
  initialData,
  readOnly = false,
  onDataChange,
}, ref) {
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

  const getData = useCallback(() => data, [data]);

  const { isLoading, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
    onDataChange,
  });

  // Check if tool has valid input (all required fields filled)
  const isValid = useCallback(() => {
    // Title and at least one SOARED field must be filled
    return data.title.trim().length > 0 && (
      data.situation.trim().length > 0 ||
      data.obstacle.trim().length > 0 ||
      data.action.trim().length > 0 ||
      data.result.trim().length > 0 ||
      data.evaluation.trim().length > 0 ||
      data.discovery.trim().length > 0
    );
  }, [data]);

  // Expose save and isValid methods to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      await save();
    },
    isValid,
  }), [save, isValid]);

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
