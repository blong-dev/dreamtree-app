/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageContent } from './MessageContent';
import type { ContentBlock } from './types';

// Mock TypingEffect to make tests predictable
vi.mock('./TypingEffect', () => ({
  TypingEffect: ({ text, onComplete, skipToEnd }: any) => {
    // Immediately complete if skipToEnd, otherwise show text
    if (skipToEnd) {
      onComplete?.();
    }
    return <span data-testid="typing-effect">{text}</span>;
  },
}));

describe('MessageContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('block type rendering', () => {
    it('renders paragraph block', () => {
      const content: ContentBlock[] = [
        { type: 'paragraph', text: 'Hello world' },
      ];

      const { container } = render(<MessageContent content={content} animate={false} />);
      const messageContent = container.querySelector('.message-content');
      expect(messageContent?.querySelector('p')).toHaveTextContent('Hello world');
    });

    it('renders heading block with correct level', () => {
      const content: ContentBlock[] = [
        { type: 'heading', text: 'Section Title', level: 2 },
      ];

      render(<MessageContent content={content} animate={false} />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Section Title');
    });

    it('renders unordered list', () => {
      const content: ContentBlock[] = [
        { type: 'list', items: ['Item 1', 'Item 2', 'Item 3'], ordered: false },
      ];

      render(<MessageContent content={content} animate={false} />);
      const list = screen.getByRole('list');
      expect(list.tagName).toBe('UL');
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('renders ordered list', () => {
      const content: ContentBlock[] = [
        { type: 'list', items: ['First', 'Second'], ordered: true },
      ];

      render(<MessageContent content={content} animate={false} />);
      const list = screen.getByRole('list');
      expect(list.tagName).toBe('OL');
    });

    it('renders quote with attribution', () => {
      const content: ContentBlock[] = [
        { type: 'quote', text: 'To be or not to be', attribution: 'Shakespeare' },
      ];

      const { container } = render(<MessageContent content={content} animate={false} />);
      const blockquote = container.querySelector('blockquote');
      expect(blockquote?.querySelector('p')).toHaveTextContent('To be or not to be');
      expect(blockquote?.querySelector('cite')).toHaveTextContent('Shakespeare');
    });

    it('renders emphasis block', () => {
      const content: ContentBlock[] = [
        { type: 'emphasis', text: 'Important note' },
      ];

      const { container } = render(<MessageContent content={content} animate={false} />);
      expect(container.querySelector('.emphasis')).toHaveTextContent('Important note');
    });

    it('renders activity-header with title and description', () => {
      const content: ContentBlock[] = [
        { type: 'activity-header', title: 'Activity 1', description: 'Do this thing' },
      ];

      const { container } = render(<MessageContent content={content} animate={false} />);
      expect(container.querySelector('.activity-header-title')).toHaveTextContent('Activity 1');
      expect(container.querySelector('.activity-header-description')).toHaveTextContent('Do this thing');
    });

    it('renders resource-link with url', () => {
      const content: ContentBlock[] = [
        { type: 'resource-link', title: 'Learn More', url: 'https://example.com', description: 'Click here' },
      ];

      render(<MessageContent content={content} animate={false} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('animation behavior', () => {
    it('shows all blocks when animate=false', () => {
      const content: ContentBlock[] = [
        { type: 'paragraph', text: 'Block 1' },
        { type: 'paragraph', text: 'Block 2' },
        { type: 'paragraph', text: 'Block 3' },
      ];

      render(<MessageContent content={content} animate={false} />);
      expect(screen.getByText('Block 1')).toBeInTheDocument();
      expect(screen.getByText('Block 2')).toBeInTheDocument();
      expect(screen.getByText('Block 3')).toBeInTheDocument();
    });

    it('shows only first block initially when animate=true', () => {
      const content: ContentBlock[] = [
        { type: 'paragraph', text: 'Block 1' },
        { type: 'paragraph', text: 'Block 2' },
      ];

      render(<MessageContent content={content} animate={true} />);
      expect(screen.getByText('Block 1')).toBeInTheDocument();
      expect(screen.queryByText('Block 2')).not.toBeInTheDocument();
    });

    it('uses TypingEffect when animating', () => {
      const content: ContentBlock[] = [
        { type: 'paragraph', text: 'Animated text' },
      ];

      render(<MessageContent content={content} animate={true} />);
      expect(screen.getByTestId('typing-effect')).toBeInTheDocument();
    });
  });

  describe('skip functionality', () => {
    it('clicking paragraph skips animation', async () => {
      const onComplete = vi.fn();
      const content: ContentBlock[] = [
        { type: 'paragraph', text: 'Click me' },
      ];

      const { container } = render(
        <MessageContent content={content} animate={true} onAnimationComplete={onComplete} />
      );

      const paragraph = container.querySelector('.message-content p');
      fireEvent.click(paragraph!);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(true);
      });
    });

    it('clicking heading skips animation', async () => {
      const onComplete = vi.fn();
      const content: ContentBlock[] = [
        { type: 'heading', text: 'Click heading', level: 2 },
      ];

      const { container } = render(
        <MessageContent content={content} animate={true} onAnimationComplete={onComplete} />
      );

      const heading = container.querySelector('.message-content h2');
      fireEvent.click(heading!);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('accessibility', () => {
    it('has role="article" on message container', () => {
      const content: ContentBlock[] = [
        { type: 'paragraph', text: 'Test' },
      ];

      render(<MessageContent content={content} />);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('has aria-label for screen readers', () => {
      const content: ContentBlock[] = [
        { type: 'paragraph', text: 'Test' },
      ];

      render(<MessageContent content={content} />);
      expect(screen.getByRole('article')).toHaveAttribute('aria-label', 'dreamtree message');
    });

    it('provides screen reader text in sr-only div', () => {
      const content: ContentBlock[] = [
        { type: 'paragraph', text: 'Screen reader text' },
      ];

      const { container } = render(<MessageContent content={content} />);
      const srOnly = container.querySelector('.sr-only');
      expect(srOnly).toHaveTextContent('Screen reader text');
    });

    it('joins list items for screen reader', () => {
      const content: ContentBlock[] = [
        { type: 'list', items: ['A', 'B', 'C'], ordered: false },
      ];

      const { container } = render(<MessageContent content={content} />);
      const srOnly = container.querySelector('.sr-only');
      expect(srOnly).toHaveTextContent('A. B. C');
    });
  });

  describe('multiple blocks', () => {
    it('renders multiple block types together', () => {
      const content: ContentBlock[] = [
        { type: 'heading', text: 'Title', level: 2 },
        { type: 'paragraph', text: 'Introduction' },
        { type: 'list', items: ['Point 1', 'Point 2'], ordered: false },
      ];

      render(<MessageContent content={content} animate={false} />);

      expect(screen.getByRole('heading')).toHaveTextContent('Title');
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
  });

  describe('custom id', () => {
    it('uses provided id', () => {
      const content: ContentBlock[] = [
        { type: 'paragraph', text: 'Test' },
      ];

      render(<MessageContent content={content} id="custom-id" />);
      expect(screen.getByRole('article')).toHaveAttribute('id', 'custom-id');
    });
  });
});
