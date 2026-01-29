'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { MBTISelector } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

const MBTI_TYPES = [
  { code: 'INTJ', name: 'The Architect' },
  { code: 'INTP', name: 'The Logician' },
  { code: 'ENTJ', name: 'The Commander' },
  { code: 'ENTP', name: 'The Debater' },
  { code: 'INFJ', name: 'The Advocate' },
  { code: 'INFP', name: 'The Mediator' },
  { code: 'ENFJ', name: 'The Protagonist' },
  { code: 'ENFP', name: 'The Campaigner' },
  { code: 'ISTJ', name: 'The Logistician' },
  { code: 'ISFJ', name: 'The Defender' },
  { code: 'ESTJ', name: 'The Executive' },
  { code: 'ESFJ', name: 'The Consul' },
  { code: 'ISTP', name: 'The Virtuoso' },
  { code: 'ISFP', name: 'The Adventurer' },
  { code: 'ESTP', name: 'The Entrepreneur' },
  { code: 'ESFP', name: 'The Entertainer' },
];

export const MBTISelectorWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function MBTISelectorWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:377
  const [value, setValue] = useState<string | null>(null);

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        if (parsed.selectedCode) setValue(parsed.selectedCode);
      } catch (err) {
        console.error('[MBTISelectorWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // BUG-427: Fetch connected data (prior MBTI selection)
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data) return;
        // Connection data could be prior MBTI selection
        const connData = result.data;
        if (connData?.selectedCode) {
          setValue(connData.selectedCode);
        }
      })
      .catch(err => console.error('[MBTISelectorWrapper] Failed to load connection data:', err));
  }, [connectionId, readOnly, initialData]);

  const getData = useCallback(() => ({ selectedCode: value }), [value]);

  const { isLoading, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
  });

  // Check if tool has valid input (MBTI type selected)
  const isValid = useCallback(() => value !== null, [value]);

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
        <MBTISelector
          value={value}
          onChange={() => {}}
          types={MBTI_TYPES}
          label="Selected MBTI type"
        />
      </div>
    );
  }

  return (
    <>
      <MBTISelector
        value={value}
        onChange={setValue}
        types={MBTI_TYPES}
        label="Select your MBTI type"
      />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
