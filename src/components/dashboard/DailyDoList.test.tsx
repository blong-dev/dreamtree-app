import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyDoList } from './DailyDoList';
import type { DailyDo } from './types';

describe('DailyDoList', () => {
  describe('when items is empty', () => {
    it('renders empty state message', () => {
      render(<DailyDoList items={[]} />);

      expect(
        screen.getByText('Complete your first exercise to unlock daily activities.')
      ).toBeInTheDocument();
    });

    it('renders with daily-do-empty class', () => {
      const { container } = render(<DailyDoList items={[]} />);

      expect(container.querySelector('.daily-do-empty')).toBeInTheDocument();
    });
  });

  describe('when items exist', () => {
    const mockItems: DailyDo[] = [
      {
        id: '1',
        type: 'flow-tracking',
        title: 'Track Your Flow',
        subtitle: 'Log an activity',
        action: { label: 'Log Flow', href: '/tools/flow-tracker' },
      },
      {
        id: '2',
        type: 'soared-prompt',
        title: 'SOARED Story',
        subtitle: 'Write a story',
        action: { label: 'Write Story', href: '/tools/soared-form' },
      },
    ];

    it('renders all items', () => {
      render(<DailyDoList items={mockItems} />);

      expect(screen.getByText('Track Your Flow')).toBeInTheDocument();
      expect(screen.getByText('SOARED Story')).toBeInTheDocument();
    });

    it('does not show empty state', () => {
      render(<DailyDoList items={mockItems} />);

      expect(
        screen.queryByText('Complete your first exercise to unlock daily activities.')
      ).not.toBeInTheDocument();
    });

    it('renders with daily-do-list class', () => {
      const { container } = render(<DailyDoList items={mockItems} />);

      expect(container.querySelector('.daily-do-list')).toBeInTheDocument();
    });

    it('renders correct number of cards', () => {
      const { container } = render(<DailyDoList items={mockItems} />);

      const cards = container.querySelectorAll('.daily-do-card');
      expect(cards.length).toBe(2);
    });
  });

  describe('single item', () => {
    it('renders one item correctly', () => {
      const singleItem: DailyDo[] = [
        {
          id: '1',
          type: 'budget-check',
          title: 'Budget Review',
          subtitle: 'Check your finances',
          action: { label: 'Review', href: '/tools/budget' },
        },
      ];

      render(<DailyDoList items={singleItem} />);

      expect(screen.getByText('Budget Review')).toBeInTheDocument();
      expect(screen.getByText('Check your finances')).toBeInTheDocument();
    });
  });
});
