'use client';

import { useState } from 'react';
import { TOCInlinePart } from './TOCInlinePart';
import type { TOCPartData } from './types';
import type { BreadcrumbLocation } from '../overlays/types';

interface TOCInlineProps {
  parts: TOCPartData[];
  currentLocation?: BreadcrumbLocation;
  onNavigate: (location: BreadcrumbLocation) => void;
}

export function TOCInline({ parts, currentLocation, onNavigate }: TOCInlineProps) { // code_id:191
  // Track which parts are expanded
  const [expandedParts, setExpandedParts] = useState<string[]>(() => {
    // Auto-expand current part or in-progress parts
    return parts
      .filter(
        (p) =>
          p.status === 'in-progress' ||
          p.id === currentLocation?.partId
      )
      .map((p) => p.id);
  });

  const togglePart = (partId: string) => { // code_id:192
    setExpandedParts((prev) =>
      prev.includes(partId)
        ? prev.filter((id) => id !== partId)
        : [...prev, partId]
    );
  };

  return (
    <div className="toc-inline">
      {parts.map((part) => (
        <TOCInlinePart
          key={part.id}
          part={part}
          isExpanded={expandedParts.includes(part.id)}
          onToggle={() => togglePart(part.id)}
          currentLocation={currentLocation}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
