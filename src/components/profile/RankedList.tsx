'use client';

interface RankedItem {
  id: string;
  name: string;
  rank: number;
}

interface RankedListProps {
  items: RankedItem[];
  emptyMessage?: string;
}

export function RankedList({ items, emptyMessage = 'No items yet' }: RankedListProps) { // code_id:269
  if (items.length === 0) {
    return <p className="ranked-list-empty">{emptyMessage}</p>;
  }

  // Sort by rank
  const sorted = [...items].sort((a, b) => a.rank - b.rank);

  return (
    <ol className="ranked-list">
      {sorted.map((item) => (
        <li key={item.id} className="ranked-list-item">
          <span className="ranked-list-rank">{item.rank}.</span>
          <span className="ranked-list-name">{item.name}</span>
        </li>
      ))}
    </ol>
  );
}
