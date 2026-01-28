'use client';

import { CheckIcon, LockIcon } from '../icons';
import type { ProgressStatus } from './types';

interface ProgressMarkerProps {
  status: ProgressStatus;
  size?: 'xs' | 'sm' | 'md';
}

export function ProgressMarker({ status, size = 'md' }: ProgressMarkerProps) { // code_id:259
  const sizeMap = {
    xs: 12,
    sm: 14,
    md: 16,
  };

  const iconSize = sizeMap[size];

  return (
    <span className="progress-marker" data-status={status} data-size={size}>
      {status === 'complete' && (
        <CheckIcon width={iconSize} height={iconSize} />
      )}
      {status === 'locked' && (
        <LockIcon width={iconSize} height={iconSize} />
      )}
      {status === 'in-progress' && (
        <span className="progress-marker-half" />
      )}
      {status === 'available' && (
        <span className="progress-marker-empty" />
      )}
    </span>
  );
}
