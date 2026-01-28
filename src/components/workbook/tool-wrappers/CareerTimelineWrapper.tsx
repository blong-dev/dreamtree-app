'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { CareerTimeline, CareerTimelineData } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

const DEFAULT_DATA: CareerTimelineData = {
  milestones: [],
  startYear: new Date().getFullYear() - 10,
};

export const CareerTimelineWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function CareerTimelineWrapper({
  stemId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:370
  const [data, setData] = useState<CareerTimelineData>(DEFAULT_DATA);

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        setData({ ...DEFAULT_DATA, ...parsed });
      } catch (err) {
        console.error('[CareerTimelineWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

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
        <CareerTimeline data={data} onChange={() => {}} />
      </div>
    );
  }

  return (
    <>
      <CareerTimeline data={data} onChange={setData} />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
