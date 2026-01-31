'use client';

import { useState, useEffect, useRef } from 'react';

interface TypingEffectProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  paused?: boolean;
  skipToEnd?: boolean;
}

export function TypingEffect({
  text,
  speed = 30,
  onComplete,
  paused = false,
  skipToEnd = false,
}: TypingEffectProps) { // code_id:38
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  // Use ref for callback to avoid restarting animation when callback changes
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Track if this effect has already completed (to prevent double-fire)
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    // Reset completion tracking when text changes
    hasCompletedRef.current = false;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Instant display when: skipToEnd, reduced motion, or speed is 0 (animation off)
    if (skipToEnd || prefersReducedMotion || speed === 0) {
      setDisplayedText(text);
      setIsComplete(true);
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onCompleteRef.current?.();
      }
      return;
    }

    if (paused) return;

    // IMP-007: Use requestAnimationFrame with elapsed time for smoother animation
    let startTime: number | null = null;
    let lastCharIndex = -1;
    let animationFrameId: number;

    setDisplayedText('');
    setIsComplete(false);

    const animate = (timestamp: number) => { // code_id:178
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const charIndex = Math.min(Math.floor(elapsed / speed), text.length);

      // Only update state when character index changes
      if (charIndex !== lastCharIndex) {
        lastCharIndex = charIndex;
        setDisplayedText(text.slice(0, charIndex));
      }

      if (charIndex >= text.length) {
        setIsComplete(true);
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onCompleteRef.current?.();
        }
      } else {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [text, speed, paused, skipToEnd]); // Removed onComplete from deps - using ref instead

  return (
    <span className="typing-effect">
      <span className="typing-effect-text">{displayedText}</span>
      {!isComplete && (
        <span className="typing-effect-cursor" aria-hidden="true">
          |
        </span>
      )}
    </span>
  );
}
