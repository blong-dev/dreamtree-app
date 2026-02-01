'use client';

/**
 * WorkbookClient - Client wrapper for WorkbookView
 *
 * Handles:
 * - ToastProvider context
 * - Hash navigation on initial load
 */

import { useEffect } from 'react';
import { ToastProvider } from '@/components/feedback';
import { WorkbookView } from '@/components/workbook';
import type { BlockWithResponse, ThemeSettings } from '@/components/workbook/types';
import type { TOCPartData } from '@/components/dashboard';

interface WorkbookClientProps {
  initialBlocks: BlockWithResponse[];
  initialProgress: number;
  theme: ThemeSettings | null;
  tocParts: TOCPartData[];
}

export function WorkbookClient({ initialBlocks, initialProgress, theme, tocParts }: WorkbookClientProps) { // code_id:162
  // Handle hash navigation on initial load
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove '#'
    if (hash) {
      // Find block with matching exerciseId and scroll to it
      // For now, we'll implement this via data attributes on blocks
      const element = document.querySelector(`[data-exercise-id="${hash}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  return (
    <ToastProvider>
      <WorkbookView
        initialBlocks={initialBlocks}
        initialProgress={initialProgress}
        theme={theme || undefined}
        tocParts={tocParts}
      />
    </ToastProvider>
  );
}
