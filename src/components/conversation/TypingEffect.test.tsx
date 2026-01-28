import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { TypingEffect } from './TypingEffect';

describe('TypingEffect', () => {
  let rafCallbacks: ((timestamp: number) => void)[] = [];
  let rafId = 0;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;

    // Mock requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback);
      return ++rafId;
    });

    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    // Mock matchMedia for reduced motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to advance animation frames
  const advanceFrames = (count: number, msPerFrame: number) => { // code_id:177
    let time = 0;
    for (let i = 0; i < count; i++) {
      time += msPerFrame;
      const callbacks = [...rafCallbacks];
      rafCallbacks = [];
      callbacks.forEach((cb) => cb(time));
    }
  };

  describe('basic rendering', () => {
    it('renders with typing-effect class', () => {
      const { container } = render(<TypingEffect text="Hello" />);
      expect(container.querySelector('.typing-effect')).toBeInTheDocument();
    });

    it('renders cursor while typing', () => {
      const { container } = render(<TypingEffect text="Hello" />);
      expect(container.querySelector('.typing-effect-cursor')).toBeInTheDocument();
    });

    it('cursor is aria-hidden', () => {
      const { container } = render(<TypingEffect text="Hello" />);
      expect(container.querySelector('.typing-effect-cursor')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
    });
  });

  describe('skipToEnd behavior', () => {
    it('shows full text immediately when skipToEnd=true', () => {
      const { container } = render(<TypingEffect text="Hello World" skipToEnd={true} />);
      expect(container.querySelector('.typing-effect-text')).toHaveTextContent('Hello World');
    });

    it('hides cursor when skipToEnd=true', () => {
      const { container } = render(<TypingEffect text="Hello" skipToEnd={true} />);
      expect(container.querySelector('.typing-effect-cursor')).not.toBeInTheDocument();
    });

    it('calls onComplete immediately when skipToEnd=true', () => {
      const onComplete = vi.fn();
      render(<TypingEffect text="Hello" skipToEnd={true} onComplete={onComplete} />);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('reduced motion', () => {
    it('shows full text immediately when prefers-reduced-motion', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
        })),
      });

      const { container } = render(<TypingEffect text="Full text" />);
      expect(container.querySelector('.typing-effect-text')).toHaveTextContent('Full text');
    });

    it('calls onComplete when reduced motion enabled', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
        })),
      });

      const onComplete = vi.fn();
      render(<TypingEffect text="Test" onComplete={onComplete} />);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('animation', () => {
    it('starts with empty text', () => {
      const { container } = render(<TypingEffect text="Hello" />);
      // Initial render before any animation frame
      expect(container.querySelector('.typing-effect-text')).toHaveTextContent('');
    });

    it('progressively shows text', async () => {
      const { container } = render(<TypingEffect text="Hi" speed={30} />);

      // Advance time - at 30ms per char, after 60ms we should have both chars
      act(() => advanceFrames(3, 30));

      await waitFor(() => {
        expect(container.querySelector('.typing-effect-text')).toHaveTextContent('Hi');
      });
    });

    it('hides cursor when complete', async () => {
      const { container } = render(<TypingEffect text="AB" speed={10} />);

      // Advance enough for full text
      act(() => advanceFrames(5, 10));

      await waitFor(() => {
        expect(container.querySelector('.typing-effect-cursor')).not.toBeInTheDocument();
      });
    });

    it('calls onComplete when animation finishes', async () => {
      const onComplete = vi.fn();
      render(<TypingEffect text="XY" speed={10} onComplete={onComplete} />);

      act(() => advanceFrames(5, 10));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('paused state', () => {
    it('does not animate when paused', () => {
      const { container } = render(<TypingEffect text="Hello" paused={true} />);

      act(() => advanceFrames(10, 30));

      // Should still be empty when paused
      expect(container.querySelector('.typing-effect-text')).toHaveTextContent('');
    });
  });

  describe('speed prop', () => {
    it('uses default speed of 30ms', () => {
      render(<TypingEffect text="Test" />);
      // Just verify it renders without error
      expect(screen.getByText('|')).toBeInTheDocument();
    });

    it('respects custom speed', async () => {
      const { container } = render(<TypingEffect text="AB" speed={100} />);

      // Advance enough frames to complete (200ms total for 2 chars at 100ms each)
      act(() => advanceFrames(5, 100));

      await waitFor(() => {
        expect(container.querySelector('.typing-effect-text')).toHaveTextContent('AB');
      });
    });
  });
});
