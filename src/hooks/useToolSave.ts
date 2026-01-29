'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ToolSaveResponse {
  id: string;
  stemId?: number;
  responseText?: string;
  updated: boolean;
  newProgress?: number;
  nextBlock?: unknown | null;
  hasMore?: boolean;
}

interface UseToolSaveOptions {
  /** The stem.id - unique identifier for this tool instance */
  stemId: number;
  getData: () => unknown;
  onComplete: (data: ToolSaveResponse) => void;
  /** Called after successful auto-save (for completed tools to trigger refresh of dependent tools) */
  onDataChange?: () => void;
}

interface UseToolSaveResult {
  isLoading: boolean;
  error: string | null;
  save: () => Promise<void>;
}

/**
 * Shared hook for tool save/auto-save logic
 * IMP-002: Extracted from ToolEmbed to reduce state duplication
 * Updated: Now uses stemId as the single identifier instead of compound key
 */
export function useToolSave({
  stemId,
  getData,
  onComplete,
  onDataChange,
}: UseToolSaveOptions): UseToolSaveResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for auto-save
  const isInitialMount = useRef(true);
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const getDataRef = useRef(getData);

  // Keep ref updated
  getDataRef.current = getData;

  // Stringify for change detection
  const currentDataJson = JSON.stringify(getData());

  // Manual save (Continue button)
  const save = useCallback(async () => {
    // Clear pending auto-save (IMP-041)
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/workbook/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stemId,
          responseText: JSON.stringify(getDataRef.current()),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save tool data');
      }

      const data: ToolSaveResponse = await response.json();
      onComplete(data);
    } catch (err) {
      console.error('Error saving tool:', err);
      // IMP-025: Differentiate error types
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Unable to connect. Check your internet connection.');
      } else {
        setError('Failed to save. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [stemId, onComplete]);

  // Keep refs updated for auto-save
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  // Auto-save effect (IMP-008)
  // NOTE: Auto-save does NOT call onComplete - that would advance the user
  // without validation. Only manual save (via Continue button) should advance.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    autoSaveTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/workbook/response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stemId,
            responseText: JSON.stringify(getDataRef.current()),
          }),
        });
        // Auto-save is silent - no onComplete to avoid advancing without validation
        // But notify onDataChange so dependent tools can refresh
        if (response.ok && onDataChangeRef.current) {
          onDataChangeRef.current();
        }
      } catch {
        // Silent failure
      }
    }, 1500);

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [currentDataJson, stemId]);

  return { isLoading, error, save };
}
