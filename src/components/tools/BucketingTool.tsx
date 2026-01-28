'use client';

import { useState } from 'react';
import { BucketItem, BucketingToolData } from './types';

interface BucketingToolProps {
  data: BucketingToolData;
  onChange: (data: BucketingToolData) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

const DEFAULT_BUCKET_LABELS: [string, string, string, string, string] = [
  'Most Often',
  'Frequently',
  'Sometimes',
  'Rarely',
  'Least Often',
];

export function BucketingTool({
  data,
  onChange,
  disabled = false,
  readOnly = false,
}: BucketingToolProps) { // code_id:77
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const bucketLabels = data.bucketLabels || DEFAULT_BUCKET_LABELS;

  const unassignedItems = data.items.filter((item) => item.bucketIndex === null);
  const buckets = [0, 1, 2, 3, 4].map((index) =>
    data.items.filter((item) => item.bucketIndex === index)
  );

  const handleDragStart = (itemId: string) => { // code_id:286
    if (disabled || readOnly) return;
    setDraggedItem(itemId);
  };

  const handleDragEnd = () => { // code_id:287
    setDraggedItem(null);
  };

  const handleDrop = (bucketIndex: number | null) => { // code_id:288
    if (!draggedItem || disabled || readOnly) return;

    const newItems = data.items.map((item) =>
      item.id === draggedItem ? { ...item, bucketIndex } : item
    );

    onChange({ ...data, items: newItems });
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => { // code_id:289
    e.preventDefault();
  };

  const moveItemToBucket = (itemId: string, bucketIndex: number | null) => { // code_id:290
    if (disabled || readOnly) return;

    const newItems = data.items.map((item) =>
      item.id === itemId ? { ...item, bucketIndex } : item
    );

    onChange({ ...data, items: newItems });
  };

  return (
    <div className="bucketing-tool" data-disabled={disabled}>
      <div className="bucketing-tool-layout">
        {/* Unassigned items */}
        <div
          className="bucketing-tool-source"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(null)}
          data-drop-target={draggedItem !== null}
        >
          <h4 className="bucketing-tool-source-title">Items to Sort</h4>
          {unassignedItems.length === 0 ? (
            <p className="bucketing-tool-source-empty">All items sorted!</p>
          ) : (
            <ul className="bucketing-tool-source-list">
              {unassignedItems.map((item) => (
                <BucketItemRow
                  key={item.id}
                  item={item}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedItem === item.id}
                  disabled={disabled || readOnly}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Buckets */}
        <div className="bucketing-tool-buckets">
          {buckets.map((bucketItems, index) => (
            <div
              key={index}
              className="bucketing-tool-bucket"
              data-bucket-index={index}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              data-drop-target={draggedItem !== null}
            >
              <h4 className="bucketing-tool-bucket-title">
                {bucketLabels[index]}
              </h4>
              <ul className="bucketing-tool-bucket-list">
                {bucketItems.map((item) => (
                  <BucketItemRow
                    key={item.id}
                    item={item}
                    onDragStart={() => handleDragStart(item.id)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedItem === item.id}
                    disabled={disabled || readOnly}
                    onRemove={() => moveItemToBucket(item.id, null)}
                  />
                ))}
              </ul>
              {bucketItems.length === 0 && (
                <p className="bucketing-tool-bucket-empty">Drop items here</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bucketing-tool-progress">
        <div className="bucketing-tool-progress-bar">
          <div
            className="bucketing-tool-progress-fill"
            style={{
              width: `${((data.items.length - unassignedItems.length) / data.items.length) * 100}%`,
            }}
          />
        </div>
        <span className="bucketing-tool-progress-text">
          {data.items.length - unassignedItems.length} of {data.items.length} items sorted
        </span>
      </div>
    </div>
  );
}

// BucketItemRow component
interface BucketItemRowProps {
  item: BucketItem;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  disabled: boolean;
  onRemove?: () => void;
}

function BucketItemRow({
  item,
  onDragStart,
  onDragEnd,
  isDragging,
  disabled,
  onRemove,
}: BucketItemRowProps) { // code_id:291
  return (
    <li
      className="bucket-item"
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-dragging={isDragging}
    >
      <span className="bucket-item-value">{item.value}</span>
      {onRemove && !disabled && (
        <button
          type="button"
          className="bucket-item-remove"
          onClick={onRemove}
          aria-label="Remove from bucket"
        >
          <XIcon />
        </button>
      )}
    </li>
  );
}

function XIcon() { // code_id:292
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
