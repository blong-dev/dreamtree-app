'use client';

interface TimestampProps {
  date: Date;
}

function formatTimestamp(date: Date): string { // code_id:176
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = now.getTime() - date.getTime();

  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    date.toDateString() === new Date(now.getTime() - dayMs).toDateString();
  const isWithinWeek = diff < 7 * dayMs;
  const isThisYear = date.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  if (isWithinWeek)
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  if (isThisYear)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function Timestamp({ date }: TimestampProps) { // code_id:175
  return (
    <div className="timestamp" role="separator">
      <time dateTime={date.toISOString()}>{formatTimestamp(date)}</time>
    </div>
  );
}
