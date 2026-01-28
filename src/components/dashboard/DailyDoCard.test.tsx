import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyDoCard } from './DailyDoCard';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

describe('DailyDoCard', () => {
  const defaultProps = {
    type: 'flow-tracking' as const,
    title: 'Track Your Flow',
    subtitle: 'Log an activity where you lost track of time',
    action: { label: 'Log Flow', href: '/tools/flow-tracker' },
  };

  describe('content rendering', () => {
    it('renders title', () => {
      render(<DailyDoCard {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Track Your Flow' })).toBeInTheDocument();
    });

    it('renders subtitle', () => {
      render(<DailyDoCard {...defaultProps} />);

      expect(screen.getByText('Log an activity where you lost track of time')).toBeInTheDocument();
    });

    it('renders action link with label', () => {
      render(<DailyDoCard {...defaultProps} />);

      const link = screen.getByRole('link');
      expect(link).toHaveTextContent('Log Flow');
      expect(link).toHaveTextContent('→');
    });

    it('renders action link with correct href', () => {
      render(<DailyDoCard {...defaultProps} />);

      expect(screen.getByRole('link')).toHaveAttribute('href', '/tools/flow-tracker');
    });
  });

  describe('icon rendering', () => {
    it('renders icon with aria-hidden', () => {
      const { container } = render(<DailyDoCard {...defaultProps} />);

      const iconSpan = container.querySelector('.daily-do-icon');
      expect(iconSpan).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders SVG icon', () => {
      const { container } = render(<DailyDoCard {...defaultProps} />);

      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('different types', () => {
    const types = [
      'flow-tracking',
      'failure-reframe',
      'job-prospecting',
      'networking',
      'budget-check',
      'soared-prompt',
      'resume',
    ] as const;

    types.forEach((type) => {
      it(`renders ${type} type correctly`, () => {
        render(
          <DailyDoCard
            type={type}
            title={`Test ${type}`}
            subtitle="Test subtitle"
            action={{ label: 'Action', href: '/test' }}
          />
        );

        expect(screen.getByRole('heading', { name: `Test ${type}` })).toBeInTheDocument();
      });
    });
  });

  describe('CSS classes', () => {
    it('has daily-do-card class', () => {
      const { container } = render(<DailyDoCard {...defaultProps} />);

      expect(container.querySelector('.daily-do-card')).toBeInTheDocument();
    });

    it('has daily-do-content class for content wrapper', () => { // code_id:179
      const { container } = render(<DailyDoCard {...defaultProps} />);

      expect(container.querySelector('.daily-do-content')).toBeInTheDocument();
    });

    it('has daily-do-action class on link', () => { // code_id:180
      render(<DailyDoCard {...defaultProps} />);

      expect(screen.getByRole('link')).toHaveClass('daily-do-action');
    });
  });
});
