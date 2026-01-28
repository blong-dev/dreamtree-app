'use client';

import { CheckIcon, AlertTriangleIcon, LoaderIcon } from '../icons';
import type { SaveStatus } from './types';

interface SaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date;
  onRetry?: () => void;
}

export function SaveIndicator({ status, onRetry }: SaveIndicatorProps) { // code_id:199
  return (
    <div className="save-indicator" data-status={status} aria-live="polite">
      {status === 'saving' && (
        <>
          <LoaderIcon width={12} height={12} className="save-indicator-spinner" />
          <span>Saving...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <CheckIcon width={12} height={12} />
          <span>Saved</span>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertTriangleIcon width={12} height={12} />
          <span>Save failed</span>
          {onRetry && (
            <button className="save-indicator-retry" onClick={onRetry}>
              Retry
            </button>
          )}
        </>
      )}
    </div>
  );
}
