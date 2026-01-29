'use client';

import { useRef, useState, useEffect, memo } from 'react';
import { Message, ContentBlock, UserResponseContent, DividerData, ToolMessageData, ScrollState } from './types';
import { MessageContent } from './MessageContent';
import { MessageUser } from './MessageUser';
import { Timestamp } from './Timestamp';
import { Divider } from './Divider';

interface ConversationThreadProps {
  messages: Message[];
  onScrollStateChange?: (state: ScrollState) => void;
  autoScrollOnNew?: boolean;
  onEditMessage?: (messageId: string) => void;
  /** Set of message IDs that have already been animated (should not re-animate) */
  animatedMessageIds?: Set<string>;
  /** Callback when a message animation completes. wasSkipped is true if user clicked to skip. */
  onMessageAnimated?: (messageId: string, wasSkipped: boolean) => void;
  /** Trigger value that forces scroll to bottom when changed (e.g., displayedBlockIndex) */
  scrollTrigger?: number;
  /** Called when user scrolls near top - use to load more history */
  onLoadMore?: () => void;
  /** Whether more history is available to load */
  hasMoreHistory?: boolean;
  /** Whether history is currently being loaded */
  isLoadingHistory?: boolean;
  /** Disable typing animation entirely (for onboarding, etc.) */
  disableAnimation?: boolean;
  /** BUG-380: Callback to render completed tools in conversation history */
  renderTool?: (data: ToolMessageData, messageId: string) => React.ReactNode;
  /** Always scroll to bottom on new content, regardless of scroll position */
  alwaysScrollToBottom?: boolean;
}

// IMP-006: Memoize MessageRenderer to prevent re-renders when messages array changes
const MessageRenderer = memo(function MessageRenderer({
  message,
  onEdit,
  animate,
  onAnimationComplete,
  renderTool,
}: {
  message: Message;
  onEdit?: () => void;
  animate?: boolean;
  onAnimationComplete?: (wasSkipped: boolean) => void;
  renderTool?: (data: ToolMessageData, messageId: string) => React.ReactNode;
}) { // code_id:29
  switch (message.type) {
    case 'content':
      return (
        <MessageContent
          content={message.data as ContentBlock[]}
          animate={animate}
          onAnimationComplete={onAnimationComplete}
          id={message.id}
        />
      );
    case 'user':
      return (
        <MessageUser
          content={message.data as UserResponseContent}
          timestamp={message.timestamp}
          onEdit={onEdit}
        />
      );
    case 'timestamp':
      return <Timestamp date={message.data as Date} />;
    case 'divider':
      const dividerData = message.data as DividerData;
      return <Divider type={dividerData.type} label={dividerData.label} />;
    case 'tool':
      // BUG-380: Render completed tools via callback
      if (renderTool) {
        return <>{renderTool(message.data as ToolMessageData, message.id)}</>;
      }
      return null;
    default:
      return null;
  }
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if key props change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.type === nextProps.message.type &&
    prevProps.animate === nextProps.animate &&
    // For user messages, check if onEdit callback exists (not the reference)
    !!prevProps.onEdit === !!nextProps.onEdit &&
    // For tool messages, check if renderTool exists
    !!prevProps.renderTool === !!nextProps.renderTool
  );
});

export function ConversationThread({
  messages,
  onScrollStateChange,
  autoScrollOnNew = true,
  onEditMessage,
  animatedMessageIds,
  onMessageAnimated,
  scrollTrigger,
  onLoadMore,
  hasMoreHistory = false,
  isLoadingHistory = false,
  disableAnimation = false,
  renderTool,
  alwaysScrollToBottom = false,
}: ConversationThreadProps) { // code_id:28
  const threadRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<ScrollState>('at-current');

  // Track previous message count to preserve scroll position on prepend
  const prevMessageCountRef = useRef(messages.length);
  const prevScrollHeightRef = useRef(0);

  const handleScroll = () => { // code_id:167
    if (!threadRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = threadRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    const newState: ScrollState =
      distanceFromBottom < 100 ? 'at-current' : 'in-history';

    if (newState !== scrollState) {
      setScrollState(newState);
      onScrollStateChange?.(newState);
    }

    // Lazy load: when user scrolls near top, load more history
    if (scrollTop < 200 && hasMoreHistory && !isLoadingHistory && onLoadMore) {
      onLoadMore();
    }
  };

  // Auto-scroll on new message or when scrollTrigger changes
  useEffect(() => {
    if (!threadRef.current) return;

    // alwaysScrollToBottom: unconditional scroll (for workbook)
    // autoScrollOnNew: only scroll if user is already at bottom
    const shouldScroll = alwaysScrollToBottom || (autoScrollOnNew && scrollState === 'at-current');

    if (shouldScroll) {
      threadRef.current.scrollTo({
        top: threadRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages.length, autoScrollOnNew, alwaysScrollToBottom, scrollState, scrollTrigger]);

  // Preserve scroll position when history is prepended
  useEffect(() => {
    if (!threadRef.current) return;

    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;

    // If messages were prepended (count increased but we're not at bottom)
    if (currentCount > prevCount && scrollState === 'in-history') {
      const newScrollHeight = threadRef.current.scrollHeight;
      const scrollDelta = newScrollHeight - prevScrollHeightRef.current;

      // Adjust scroll position to maintain visual position
      if (scrollDelta > 0) {
        threadRef.current.scrollTop += scrollDelta;
      }
    }

    // Update refs for next comparison
    prevMessageCountRef.current = currentCount;
    prevScrollHeightRef.current = threadRef.current.scrollHeight;
  }, [messages.length, scrollState]);

  return (
    <div
      className="conversation-thread"
      role="log"
      aria-live="polite"
      aria-label="Conversation"
      ref={threadRef}
      onScroll={handleScroll}
      data-testid="conversation-thread"
    >
      {/* Loading indicator for history */}
      {isLoadingHistory && (
        <div className="conversation-thread-loading" aria-label="Loading more history">
          <span className="loading-spinner" />
        </div>
      )}

      {messages.map((message) => {
        // Only animate content messages that haven't been animated yet
        const shouldAnimate = !disableAnimation &&
          message.type === 'content' &&
          (!animatedMessageIds || !animatedMessageIds.has(message.id));

        return (
          <MessageRenderer
            key={message.id}
            message={message}
            animate={shouldAnimate}
            onAnimationComplete={
              shouldAnimate && onMessageAnimated
                ? (wasSkipped: boolean) => onMessageAnimated(message.id, wasSkipped)
                : undefined
            }
            onEdit={
              message.type === 'user' && onEditMessage
                ? () => onEditMessage(message.id)
                : undefined
            }
            renderTool={renderTool}
          />
        );
      })}
    </div>
  );
}
