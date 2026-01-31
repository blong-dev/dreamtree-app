'use client';

import { ReactNode, useRef, useState, useEffect } from 'react';
import { ChevronDownIcon } from '../icons';

interface WorkbookInputZoneProps {
  /** The active input content (PromptInput, ToolEmbed, Continue, or TextInput) */
  children: ReactNode;
  /** Whether there's any active input to show */
  hasActiveInput: boolean;
}

/**
 * WorkbookInputZone provides the input area at the bottom of the workbook.
 *
 * BUG-342 FIX: Changed from fixed positioning to inline flow.
 * - Input zone flows inline with conversation content
 * - Floating indicator appears when input is scrolled out of view
 * - Clicking indicator scrolls smoothly to input area
 *
 * This matches chat app patterns where content and input flow together.
 */
export function WorkbookInputZone({
  children,
  hasActiveInput,
}: WorkbookInputZoneProps) { // code_id:384
  const inputZoneRef = useRef<HTMLDivElement>(null);
  const [isOutOfView, setIsOutOfView] = useState(false);

  // BUG-342: Use IntersectionObserver to detect when input zone leaves viewport
  useEffect(() => {
    if (!inputZoneRef.current || !hasActiveInput) {
      setIsOutOfView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show floating indicator when less than 20% of input zone is visible
        setIsOutOfView(!entry.isIntersecting || entry.intersectionRatio < 0.2);
      },
      {
        threshold: [0, 0.2, 1],
        rootMargin: '0px',
      }
    );

    observer.observe(inputZoneRef.current);
    return () => observer.disconnect();
  }, [hasActiveInput]);

  const scrollToInput = () => { // code_id:868
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  return (
    <>
      <div
        ref={inputZoneRef}
        className="workbook-input-zone"
        data-has-input={hasActiveInput}
      >
        {hasActiveInput ? (
          <div className="workbook-input-zone-content">
            {children}
          </div>
        ) : (
          /* Empty placeholder to reserve space and prevent content jumping */
          <div className="workbook-input-zone-placeholder" aria-hidden="true" />
        )}
      </div>

      {/* Floating scroll indicator - appears when input is out of view */}
      {hasActiveInput && isOutOfView && (
        <button
          className="workbook-scroll-indicator"
          onClick={scrollToInput}
          aria-label="Scroll to input"
        >
          <ChevronDownIcon />
        </button>
      )}
    </>
  );
}
