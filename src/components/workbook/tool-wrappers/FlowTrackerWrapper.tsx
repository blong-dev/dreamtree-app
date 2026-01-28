'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FlowTracker, FlowTrackerData } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

export const FlowTrackerWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function FlowTrackerWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:373
  const [data, setData] = useState<FlowTrackerData>({ entries: [] });

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        setData(parsed.entries ? parsed : { entries: [] });
      } catch (err) {
        console.error('[FlowTrackerWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // BUG-427: Fetch connected data (prior flow entries)
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data) return;
        // Connection data could be prior flow entries
        const entries = Array.isArray(result.data) ? result.data : [];
        if (entries.length > 0) {
          setData({ entries });
        }
      })
      .catch(err => console.error('[FlowTrackerWrapper] Failed to load connection data:', err));
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
        <FlowTracker data={data} onChange={() => {}} />
      </div>
    );
  }

  return (
    <>
      <FlowTracker data={data} onChange={setData} />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
