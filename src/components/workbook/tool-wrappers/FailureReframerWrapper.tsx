'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FailureReframer, FailureReframerData } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

const DEFAULT_DATA: FailureReframerData = {
  situation: '',
  initialFeelings: '',
  whatLearned: '',
  whatWouldChange: '',
  silverLining: '',
  nextStep: '',
  reframedStatement: '',
};

export const FailureReframerWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function FailureReframerWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:372
  const [data, setData] = useState<FailureReframerData>(DEFAULT_DATA);

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        setData({ ...DEFAULT_DATA, ...parsed });
      } catch (err) {
        console.error('[FailureReframerWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // BUG-427: Fetch connected data (prior failure reframe)
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data) return;
        // Connection data could be prior failure reframe data
        const connData = result.data;
        if (connData && typeof connData === 'object') {
          setData(prev => ({ ...prev, ...connData }));
        }
      })
      .catch(err => console.error('[FailureReframerWrapper] Failed to load connection data:', err));
  }, [connectionId, readOnly, initialData]);

  const getData = useCallback(() => data, [data]);

  const { isLoading, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
  });

  // Check if tool has valid input (at least situation and one other field filled)
  const isValid = useCallback(() => {
    // Situation is required, plus at least one other field
    const hasSituation = data.situation.trim().length > 0;
    const hasOtherContent =
      data.initialFeelings.trim().length > 0 ||
      data.whatLearned.trim().length > 0 ||
      data.whatWouldChange.trim().length > 0 ||
      data.silverLining.trim().length > 0 ||
      data.nextStep.trim().length > 0 ||
      data.reframedStatement.trim().length > 0;
    return hasSituation && hasOtherContent;
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
        <FailureReframer data={data} onChange={() => {}} />
      </div>
    );
  }

  return (
    <>
      <FailureReframer data={data} onChange={setData} />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
