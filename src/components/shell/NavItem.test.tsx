/**
 * NavItem Unit Tests
 *
 * Tests for the NavItem shell component.
 * Validates rendering, interaction, accessibility.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavItem } from './NavItem';
import { HomeIcon } from '../icons';

describe('NavItem', () => {
  const defaultProps = {
    id: 'home' as const,
    icon: HomeIcon,
    label: 'Home',
    onClick: vi.fn(),
  };

  it('renders with label', () => {
    render(<NavItem {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<NavItem {...defaultProps} />);
    // Icon is inside button, check it renders an SVG
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<NavItem {...defaultProps} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('sets aria-current when active', () => {
    render(<NavItem {...defaultProps} isActive />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'page');
  });

  it('does not set aria-current when inactive', () => {
    render(<NavItem {...defaultProps} isActive={false} />);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-current');
  });

  it('sets data-active attribute based on isActive', () => {
    const { rerender } = render(<NavItem {...defaultProps} isActive />);
    expect(screen.getByRole('button')).toHaveAttribute('data-active', 'true');

    rerender(<NavItem {...defaultProps} isActive={false} />);
    expect(screen.getByRole('button')).toHaveAttribute('data-active', 'false');
  });

  describe('badge', () => {
    it('renders numeric badge', () => {
      render(<NavItem {...defaultProps} badge={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders empty badge when true', () => {
      render(<NavItem {...defaultProps} badge={true} />);
      const badge = document.querySelector('.nav-item-badge');
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe('');
    });

    it('does not render badge when undefined', () => {
      render(<NavItem {...defaultProps} />);
      expect(document.querySelector('.nav-item-badge')).not.toBeInTheDocument();
    });

    it('does not render badge when false', () => {
      render(<NavItem {...defaultProps} badge={false} />);
      expect(document.querySelector('.nav-item-badge')).not.toBeInTheDocument();
    });
  });

  describe('expansion chevron', () => {
    it('renders chevron when hasExpansion is true', () => {
      render(<NavItem {...defaultProps} hasExpansion />);
      expect(document.querySelector('.nav-item-chevron')).toBeInTheDocument();
    });

    it('does not render chevron when hasExpansion is false', () => {
      render(<NavItem {...defaultProps} hasExpansion={false} />);
      expect(document.querySelector('.nav-item-chevron')).not.toBeInTheDocument();
    });
  });

  it('has correct aria-label', () => {
    render(<NavItem {...defaultProps} label="Tools" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Tools');
  });
});
