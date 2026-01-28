import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkbookInputZone } from './WorkbookInputZone';

describe('WorkbookInputZone', () => {
  describe('when hasActiveInput is true', () => {
    it('renders children when not collapsed', () => {
      render(
        <WorkbookInputZone
          collapsed={false}
          onExpand={() => {}}
          hasActiveInput={true}
        >
          <button>Test Input</button>
        </WorkbookInputZone>
      );

      expect(screen.getByRole('button', { name: 'Test Input' })).toBeInTheDocument();
    });

    it('renders expand button when collapsed', () => {
      render(
        <WorkbookInputZone
          collapsed={true}
          onExpand={() => {}}
          hasActiveInput={true}
        >
          <button>Test Input</button>
        </WorkbookInputZone>
      );

      expect(screen.getByRole('button', { name: 'Expand input area' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Test Input' })).not.toBeInTheDocument();
    });

    it('shows default collapsed label', () => {
      render(
        <WorkbookInputZone
          collapsed={true}
          onExpand={() => {}}
          hasActiveInput={true}
        >
          <button>Test Input</button>
        </WorkbookInputZone>
      );

      expect(screen.getByText('Tap to continue')).toBeInTheDocument();
    });

    it('shows custom collapsed label', () => {
      render(
        <WorkbookInputZone
          collapsed={true}
          onExpand={() => {}}
          hasActiveInput={true}
          collapsedLabel="Custom label"
        >
          <button>Test Input</button>
        </WorkbookInputZone>
      );

      expect(screen.getByText('Custom label')).toBeInTheDocument();
    });

    it('calls onExpand when expand button clicked', () => {
      const onExpand = vi.fn();
      render(
        <WorkbookInputZone
          collapsed={true}
          onExpand={onExpand}
          hasActiveInput={true}
        >
          <button>Test Input</button>
        </WorkbookInputZone>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Expand input area' }));
      expect(onExpand).toHaveBeenCalledTimes(1);
    });
  });

  describe('when hasActiveInput is false', () => {
    it('renders placeholder (reserves space)', () => {
      const { container } = render(
        <WorkbookInputZone
          collapsed={false}
          onExpand={() => {}}
          hasActiveInput={false}
        >
          <button>Test Input</button>
        </WorkbookInputZone>
      );

      expect(container.querySelector('.workbook-input-zone-placeholder')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Test Input' })).not.toBeInTheDocument();
    });

    it('placeholder has aria-hidden for accessibility', () => {
      const { container } = render(
        <WorkbookInputZone
          collapsed={false}
          onExpand={() => {}}
          hasActiveInput={false}
        >
          <button>Test Input</button>
        </WorkbookInputZone>
      );

      const placeholder = container.querySelector('.workbook-input-zone-placeholder');
      expect(placeholder).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('data attributes', () => {
    it('sets data-collapsed attribute', () => {
      const { container, rerender } = render(
        <WorkbookInputZone
          collapsed={false}
          onExpand={() => {}}
          hasActiveInput={true}
        >
          <button>Test</button>
        </WorkbookInputZone>
      );

      expect(container.firstChild).toHaveAttribute('data-collapsed', 'false');

      rerender(
        <WorkbookInputZone
          collapsed={true}
          onExpand={() => {}}
          hasActiveInput={true}
        >
          <button>Test</button>
        </WorkbookInputZone>
      );

      expect(container.firstChild).toHaveAttribute('data-collapsed', 'true');
    });

    it('sets data-has-input attribute', () => {
      const { container, rerender } = render(
        <WorkbookInputZone
          collapsed={false}
          onExpand={() => {}}
          hasActiveInput={true}
        >
          <button>Test</button>
        </WorkbookInputZone>
      );

      expect(container.firstChild).toHaveAttribute('data-has-input', 'true');

      rerender(
        <WorkbookInputZone
          collapsed={false}
          onExpand={() => {}}
          hasActiveInput={false}
        >
          <button>Test</button>
        </WorkbookInputZone>
      );

      expect(container.firstChild).toHaveAttribute('data-has-input', 'false');
    });
  });
});
