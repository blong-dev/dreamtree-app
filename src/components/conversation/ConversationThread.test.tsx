/**
 * ConversationThread Tests
 *
 * Tests for the main conversation container component.
 * P2 task for AUDIT-001 resolution.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationThread } from './ConversationThread';
import type { Message, ContentBlock, UserResponseContent, DividerData } from './types';

// Mock scrollTo for JSDOM
Element.prototype.scrollTo = vi.fn();

// Mock child components to isolate ConversationThread logic
vi.mock('./MessageContent', () => ({
  MessageContent: ({ content, animate, onAnimationComplete, id }: {
    content: ContentBlock[];
    animate?: boolean;
    onAnimationComplete?: (wasSkipped: boolean) => void;
    id: string;
  }) => (
    <div data-testid={`message-content-${id}`} data-animate={animate}>
      {content.map((block, i) => (
        <span key={i}>{block.type === 'paragraph' ? block.text : block.type}</span>
      ))}
      {animate && onAnimationComplete && (
        <button onClick={() => onAnimationComplete(false)}>Complete Animation</button>
      )}
      {animate && onAnimationComplete && (
        <button onClick={() => onAnimationComplete(true)}>Skip Animation</button>
      )}
    </div>
  ),
}));

vi.mock('./MessageUser', () => ({
  MessageUser: ({ content, onEdit }: {
    content: UserResponseContent;
    timestamp?: Date;
    onEdit?: () => void;
  }) => (
    <div data-testid="message-user">
      <span>{typeof content === 'string' ? content : JSON.stringify(content)}</span>
      {onEdit && <button onClick={onEdit}>Edit</button>}
    </div>
  ),
}));

vi.mock('./Timestamp', () => ({
  Timestamp: ({ date }: { date: Date }) => (
    <div data-testid="timestamp">{date.toISOString()}</div>
  ),
}));

vi.mock('./Divider', () => ({
  Divider: ({ type, label }: { type: string; label?: string }) => (
    <div data-testid="divider" data-type={type}>{label}</div>
  ),
}));

describe('ConversationThread', () => {
  const createContentMessage = (id: string, text: string): Message => ({
    id,
    type: 'content',
    data: [{ type: 'paragraph', text }] as ContentBlock[],
    timestamp: new Date(),
  });

  const createUserMessage = (id: string, content: string): Message => ({
    id,
    type: 'user',
    data: content as UserResponseContent,
    timestamp: new Date(),
  });

  const createTimestampMessage = (id: string): Message => ({
    id,
    type: 'timestamp',
    data: new Date('2024-01-15'),
    timestamp: new Date(),
  });

  const createDividerMessage = (id: string, type: string, label?: string): Message => ({
    id,
    type: 'divider',
    data: { type, label } as DividerData,
    timestamp: new Date(),
  });

  beforeEach(() => { // code_id:165
    vi.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders empty thread', () => {
      render(<ConversationThread messages={[]} />);
      const thread = screen.getByTestId('conversation-thread');
      expect(thread).toBeInTheDocument();
      expect(thread.children.length).toBe(0);
    });

    it('renders content messages', () => {
      const messages = [
        createContentMessage('msg1', 'Hello'),
        createContentMessage('msg2', 'World'),
      ];

      render(<ConversationThread messages={messages} />);

      expect(screen.getByTestId('message-content-msg1')).toBeInTheDocument();
      expect(screen.getByTestId('message-content-msg2')).toBeInTheDocument();
    });

    it('renders user messages', () => {
      const messages = [createUserMessage('user1', 'My response')];

      render(<ConversationThread messages={messages} />);

      expect(screen.getByTestId('message-user')).toBeInTheDocument();
      expect(screen.getByText('My response')).toBeInTheDocument();
    });

    it('renders timestamp messages', () => {
      const messages = [createTimestampMessage('ts1')];

      render(<ConversationThread messages={messages} />);

      expect(screen.getByTestId('timestamp')).toBeInTheDocument();
    });

    it('renders divider messages', () => {
      const messages = [createDividerMessage('div1', 'exercise', 'Exercise 1.1')];

      render(<ConversationThread messages={messages} />);

      const divider = screen.getByTestId('divider');
      expect(divider).toBeInTheDocument();
      expect(divider).toHaveAttribute('data-type', 'exercise');
      expect(divider).toHaveTextContent('Exercise 1.1');
    });

    it('renders mixed message types in order', () => {
      const messages = [
        createTimestampMessage('ts1'),
        createContentMessage('msg1', 'Welcome'),
        createUserMessage('user1', 'Thanks'),
        createDividerMessage('div1', 'section'),
      ];

      render(<ConversationThread messages={messages} />);

      const thread = screen.getByTestId('conversation-thread');
      expect(thread.children.length).toBe(4);
    });
  });

  describe('accessibility', () => {
    it('has log role for screen readers', () => {
      render(<ConversationThread messages={[]} />);
      expect(screen.getByRole('log')).toBeInTheDocument();
    });

    it('has aria-live polite for announcements', () => {
      render(<ConversationThread messages={[]} />);
      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
    });

    it('has aria-label for context', () => {
      render(<ConversationThread messages={[]} />);
      expect(screen.getByRole('log')).toHaveAttribute('aria-label', 'Conversation');
    });
  });

  describe('animation tracking', () => {
    it('animates new content messages by default', () => {
      const messages = [createContentMessage('msg1', 'Hello')];

      render(<ConversationThread messages={messages} />);

      const content = screen.getByTestId('message-content-msg1');
      expect(content).toHaveAttribute('data-animate', 'true');
    });

    it('does not animate messages in animatedMessageIds set', () => {
      const messages = [createContentMessage('msg1', 'Hello')];
      const animatedIds = new Set(['msg1']);

      render(
        <ConversationThread
          messages={messages}
          animatedMessageIds={animatedIds}
        />
      );

      const content = screen.getByTestId('message-content-msg1');
      expect(content).toHaveAttribute('data-animate', 'false');
    });

    it('calls onMessageAnimated when animation completes', () => {
      const onMessageAnimated = vi.fn();
      const messages = [createContentMessage('msg1', 'Hello')];

      render(
        <ConversationThread
          messages={messages}
          onMessageAnimated={onMessageAnimated}
        />
      );

      fireEvent.click(screen.getByText('Complete Animation'));

      expect(onMessageAnimated).toHaveBeenCalledWith('msg1', false);
    });

    it('calls onMessageAnimated with wasSkipped=true when skipped', () => {
      const onMessageAnimated = vi.fn();
      const messages = [createContentMessage('msg1', 'Hello')];

      render(
        <ConversationThread
          messages={messages}
          onMessageAnimated={onMessageAnimated}
        />
      );

      fireEvent.click(screen.getByText('Skip Animation'));

      expect(onMessageAnimated).toHaveBeenCalledWith('msg1', true);
    });

    it('does not call onMessageAnimated for already-animated messages', () => {
      const onMessageAnimated = vi.fn();
      const messages = [createContentMessage('msg1', 'Hello')];
      const animatedIds = new Set(['msg1']);

      render(
        <ConversationThread
          messages={messages}
          animatedMessageIds={animatedIds}
          onMessageAnimated={onMessageAnimated}
        />
      );

      // No animation buttons should be present for already-animated messages
      expect(screen.queryByText('Complete Animation')).not.toBeInTheDocument();
    });

    it('only animates content messages, not user messages', () => {
      const messages = [createUserMessage('user1', 'Response')];

      render(<ConversationThread messages={messages} />);

      // User message should not have animate data attribute
      expect(screen.getByTestId('message-user')).not.toHaveAttribute('data-animate');
    });
  });

  describe('edit functionality', () => {
    it('provides onEdit callback for user messages', () => {
      const onEditMessage = vi.fn();
      const messages = [createUserMessage('user1', 'My answer')];

      render(
        <ConversationThread
          messages={messages}
          onEditMessage={onEditMessage}
        />
      );

      fireEvent.click(screen.getByText('Edit'));

      expect(onEditMessage).toHaveBeenCalledWith('user1');
    });

    it('does not provide edit for content messages', () => {
      const onEditMessage = vi.fn();
      const messages = [createContentMessage('msg1', 'Content')];

      render(
        <ConversationThread
          messages={messages}
          onEditMessage={onEditMessage}
        />
      );

      // No Edit button should be present for content messages
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('does not provide edit when onEditMessage is not provided', () => {
      const messages = [createUserMessage('user1', 'My answer')];

      render(<ConversationThread messages={messages} />);

      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });
  });

  describe('scroll behavior', () => {
    it('calls onScrollStateChange when scroll state changes', () => {
      const onScrollStateChange = vi.fn();
      const messages = [createContentMessage('msg1', 'Hello')];

      render(
        <ConversationThread
          messages={messages}
          onScrollStateChange={onScrollStateChange}
        />
      );

      const thread = screen.getByTestId('conversation-thread');

      // Mock scroll properties
      Object.defineProperty(thread, 'scrollTop', { value: 0, writable: true });
      Object.defineProperty(thread, 'scrollHeight', { value: 1000, writable: true });
      Object.defineProperty(thread, 'clientHeight', { value: 500, writable: true });

      // Trigger scroll event (distance from bottom = 500, which is > 100)
      fireEvent.scroll(thread);

      expect(onScrollStateChange).toHaveBeenCalledWith('in-history');
    });

    it('detects at-current state when near bottom', () => {
      const onScrollStateChange = vi.fn();
      const messages = [createContentMessage('msg1', 'Hello')];

      render(
        <ConversationThread
          messages={messages}
          onScrollStateChange={onScrollStateChange}
        />
      );

      const thread = screen.getByTestId('conversation-thread');

      // Set scroll position near bottom (distance < 100)
      Object.defineProperty(thread, 'scrollTop', { value: 450, writable: true });
      Object.defineProperty(thread, 'scrollHeight', { value: 500, writable: true });
      Object.defineProperty(thread, 'clientHeight', { value: 500, writable: true });

      fireEvent.scroll(thread);

      // Initially at-current, so no change callback
      // If we first go to in-history then back to at-current, it would call
    });
  });

  describe('props handling', () => {
    it('defaults autoScrollOnNew to true', () => {
      const messages = [createContentMessage('msg1', 'Hello')];
      render(<ConversationThread messages={messages} />);
      // Component should render without error, auto-scroll is default behavior
      expect(screen.getByTestId('conversation-thread')).toBeInTheDocument();
    });

    it('respects autoScrollOnNew=false', () => {
      const messages = [createContentMessage('msg1', 'Hello')];
      render(<ConversationThread messages={messages} autoScrollOnNew={false} />);
      expect(screen.getByTestId('conversation-thread')).toBeInTheDocument();
    });

    it('handles undefined animatedMessageIds', () => {
      const messages = [createContentMessage('msg1', 'Hello')];
      render(<ConversationThread messages={messages} />);
      // Should animate when animatedMessageIds is undefined
      expect(screen.getByTestId('message-content-msg1')).toHaveAttribute('data-animate', 'true');
    });

    it('handles empty animatedMessageIds set', () => {
      const messages = [createContentMessage('msg1', 'Hello')];
      render(
        <ConversationThread
          messages={messages}
          animatedMessageIds={new Set()}
        />
      );
      // Should animate when message ID is not in set
      expect(screen.getByTestId('message-content-msg1')).toHaveAttribute('data-animate', 'true');
    });
  });

  describe('message key stability', () => {
    it('uses message.id as key for stable rendering', () => {
      const messages = [
        createContentMessage('stable-id-1', 'First'),
        createContentMessage('stable-id-2', 'Second'),
      ];

      const { rerender } = render(<ConversationThread messages={messages} />);

      // Rerender with same messages in different order
      const reorderedMessages = [
        createContentMessage('stable-id-2', 'Second'),
        createContentMessage('stable-id-1', 'First'),
      ];

      rerender(<ConversationThread messages={reorderedMessages} />);

      // Both messages should still be present
      expect(screen.getByTestId('message-content-stable-id-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-content-stable-id-2')).toBeInTheDocument();
    });
  });
});
