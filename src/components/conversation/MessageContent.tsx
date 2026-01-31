'use client';

import { useState, useId, useCallback, useRef, useEffect } from 'react';
import { ContentBlock } from './types';
import { TypingEffect } from './TypingEffect';

interface MessageContentProps {
  content: ContentBlock[];
  animate?: boolean;
  /** Called when animation completes. wasSkipped is true if user clicked to skip. */
  onAnimationComplete?: (wasSkipped: boolean) => void;
  id?: string;
  /** Animation speed in ms per character (0 = instant, default 30) */
  animationSpeed?: number;
}

function ContentBlockRenderer({
  block,
  animate,
  onComplete,
  animationSpeed = 30,
}: {
  block: ContentBlock;
  animate: boolean;
  /** Called with wasSkipped=true if user clicked, false if animation completed naturally */
  onComplete?: (wasSkipped: boolean) => void;
  /** Animation speed in ms per character (0 = instant, default 30) */
  animationSpeed?: number;
}) { // code_id:32
  const [isSkipped, setIsSkipped] = useState(false);
  // Use ref to track completion state to avoid stale closures
  const hasCompletedRef = useRef(false);

  const handleSkip = useCallback(() => {
    if (animate && !isSkipped && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      setIsSkipped(true);
      onComplete?.(true); // User skipped (click or Enter)
    }
  }, [animate, isSkipped, onComplete]);

  // BUG-335: Enter key should skip typing effect (same as click)
  useEffect(() => {
    if (!animate || isSkipped || hasCompletedRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => { // code_id:867
      if (e.key === 'Enter') {
        // Don't skip if user is focused on an input element
        const activeEl = document.activeElement;
        const isInputFocused = activeEl?.tagName === 'INPUT' ||
          activeEl?.tagName === 'TEXTAREA' ||
          activeEl?.tagName === 'SELECT';

        if (!isInputFocused) {
          e.preventDefault();
          handleSkip();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [animate, isSkipped, handleSkip]);

  // Keep handleClick as alias for backwards compatibility
  const handleClick = handleSkip;

  // Memoize to prevent TypingEffect useEffect from restarting
  const handleNaturalComplete = useCallback(() => {
    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete?.(false); // Animation completed naturally
    }
  }, [onComplete]);

  // Parse markdown-style links [text](url) into React elements
  const parseLinks = (text: string): React.ReactNode => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      // Add the link
      parts.push(
        <a key={match.index} href={match[2]} className="inline-link">
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderText = (text: string) => { // code_id:169
    if (animate && !isSkipped) {
      return (
        <TypingEffect
          text={text}
          speed={animationSpeed}
          onComplete={handleNaturalComplete}
          skipToEnd={isSkipped || animationSpeed === 0}
        />
      );
    }
    // Parse links in non-animated text
    return parseLinks(text);
  };

  switch (block.type) {
    case 'paragraph':
      return <p onClick={handleClick}>{renderText(block.text)}</p>;

    case 'heading':
      const HeadingTag = `h${block.level}` as 'h2' | 'h3' | 'h4';
      return (
        <HeadingTag onClick={handleClick}>{renderText(block.text)}</HeadingTag>
      );

    case 'list':
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag onClick={handleClick}>
          {block.items.map((item, i) => (
            <li key={i}>{animate && !isSkipped ? renderText(item) : item}</li>
          ))}
        </ListTag>
      );

    case 'activity-header':
      return (
        <div className="activity-header" onClick={handleClick}>
          <p className="activity-header-title">{renderText(block.title)}</p>
          {block.description && (
            <p className="activity-header-description">
              {animate && !isSkipped
                ? renderText(block.description)
                : block.description}
            </p>
          )}
        </div>
      );

    case 'quote':
      return (
        <blockquote onClick={handleClick}>
          <p>{renderText(block.text)}</p>
          {block.attribution && <cite>— {block.attribution}</cite>}
        </blockquote>
      );

    case 'emphasis':
      return (
        <p className="emphasis" onClick={handleClick}>
          {renderText(block.text)}
        </p>
      );

    case 'resource-link':
      return (
        <a
          href={block.url}
          className="resource-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="resource-link-title">{block.title}</span>
          {block.description && (
            <span className="resource-link-description">{block.description}</span>
          )}
        </a>
      );

    default:
      return null;
  }
}

export function MessageContent({
  content,
  animate = true,
  onAnimationComplete,
  id,
  animationSpeed = 30,
}: MessageContentProps) { // code_id:31
  const generatedId = useId();
  const messageId = id || generatedId;
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  // Track if user skipped any block in this message (for passing to completion callback)
  const [userSkippedAny, setUserSkippedAny] = useState(false);

  const handleBlockComplete = (wasSkipped: boolean) => { // code_id:170
    if (wasSkipped) {
      setUserSkippedAny(true);
    }

    if (currentBlockIndex < content.length - 1) {
      setTimeout(() => {
        setCurrentBlockIndex((prev) => prev + 1);
      }, wasSkipped ? 50 : 200); // Faster transition when user is tapping through
    } else {
      // Pass through whether user skipped (any block in this message)
      onAnimationComplete?.(wasSkipped || userSkippedAny);
    }
  };

  // Get plain text for screen readers
  const getPlainText = (block: ContentBlock): string => {
    switch (block.type) { // code_id:171
      case 'paragraph':
      case 'heading':
      case 'emphasis':
      case 'quote':
        return block.text;
      case 'list':
        return block.items.join('. ');
      case 'activity-header':
        return `${block.title}. ${block.description || ''}`;
      case 'resource-link':
        return `${block.title}. ${block.description || ''}`;
      default:
        return '';
    }
  };

  return (
    <>
      <div
        className="message-content"
        id={messageId}
        role="article"
        aria-label="dreamtree message"
      >
        {content.slice(0, animate ? currentBlockIndex + 1 : content.length).map((block, index) => (
          <ContentBlockRenderer
            key={index}
            block={block}
            animate={animate && index === currentBlockIndex}
            onComplete={handleBlockComplete}
            animationSpeed={animationSpeed}
          />
        ))}
      </div>

      {/* Screen reader accessible version */}
      <div className="sr-only" aria-live="polite">
        {content.map((block) => getPlainText(block)).join(' ')}
      </div>
    </>
  );
}
