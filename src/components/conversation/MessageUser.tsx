'use client';

import { useId } from 'react';
import { UserResponseContent, SOAREDStory } from './types';

interface MessageUserProps {
  content: UserResponseContent;
  timestamp?: Date;
  id?: string;
  onEdit?: () => void;
}

function formatTime(date: Date): string { // code_id:174
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function UserContentRenderer({ content }: { content: UserResponseContent }) { // code_id:35
  switch (content.type) {
    case 'text':
      return <p>{content.value}</p>;

    case 'list':
      return (
        <ul>
          {content.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    case 'ranked-list':
      return (
        <ol>
          {content.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );

    case 'slider':
      return (
        <p>
          {content.value} — between {content.minLabel} and {content.maxLabel}
        </p>
      );

    case 'tags':
      return <p>{content.selected.join(', ')}</p>;

    case 'soared-story':
      return <SOAREDRenderer story={content.story} />;

    default:
      return null;
  }
}

function SOAREDRenderer({ story }: { story: SOAREDStory }) { // code_id:36
  const sections = [
    { label: 'Situation', value: story.situation },
    { label: 'Obstacle', value: story.obstacle },
    { label: 'Action', value: story.action },
    { label: 'Result', value: story.result },
    { label: 'Evaluation', value: story.evaluation },
    { label: 'Discovery', value: story.discovery },
  ];

  return (
    <div className="soared-story">
      {sections.map(({ label, value }) => (
        <div key={label} className="soared-section">
          <strong>{label}:</strong> {value}
        </div>
      ))}
    </div>
  );
}

export function MessageUser({ content, timestamp, id, onEdit }: MessageUserProps) { // code_id:34
  const generatedId = useId();
  const messageId = id || generatedId;

  const handleClick = () => { // code_id:172
    if (onEdit) {
      onEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { // code_id:173
    if (onEdit && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onEdit();
    }
  };

  return (
    <div
      className={`message-user${onEdit ? ' message-user--editable' : ''}`}
      id={messageId}
      role={onEdit ? 'button' : 'article'}
      aria-label={onEdit ? 'Click to edit your response' : 'Your response'}
      tabIndex={onEdit ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="message-user-bubble">
        <UserContentRenderer content={content} />
      </div>
      {timestamp && (
        <time className="message-user-time" dateTime={timestamp.toISOString()}>
          {formatTime(timestamp)}
        </time>
      )}
    </div>
  );
}
