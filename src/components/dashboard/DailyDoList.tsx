'use client';

import { DailyDoCard } from './DailyDoCard';
import type { DailyDo } from './types';

interface DailyDoListProps {
  items: DailyDo[];
}

export function DailyDoList({ items }: DailyDoListProps) { // code_id:182
  if (items.length === 0) {
    return (
      <div className="daily-do-list">
        <div className="daily-do-empty">
          <p>Complete your first exercise to unlock daily activities.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-do-list">
      {items.map((item) => (
        <DailyDoCard key={item.id} {...item} />
      ))}
    </div>
  );
}
