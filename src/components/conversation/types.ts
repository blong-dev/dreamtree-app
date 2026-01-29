export type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'activity-header'; title: string; description?: string }
  | { type: 'quote'; text: string; attribution?: string }
  | { type: 'emphasis'; text: string }
  | { type: 'resource-link'; title: string; url: string; description?: string };

export type SOAREDStory = {
  situation: string;
  obstacle: string;
  action: string;
  result: string;
  evaluation: string;
  discovery: string;
};

export type UserResponseContent =
  | { type: 'text'; value: string }
  | { type: 'list'; items: string[] }
  | { type: 'ranked-list'; items: string[] }
  | { type: 'slider'; value: number; minLabel: string; maxLabel: string }
  | { type: 'tags'; selected: string[] }
  | { type: 'soared-story'; story: SOAREDStory };

export type DividerData = {
  type: 'section' | 'module';
  label?: string;
};

// BUG-380: Tool data for rendering completed tools in conversation
export type ToolMessageData = {
  toolId: number;
  name: string;
  description?: string;
  instructions?: string;
  exerciseId: string;
  activityId: number;
  connectionId: number | null;
  response: string; // JSON stringified tool data
  // Schema consolidation: simple input tools need these fields
  toolType?: string;
  promptText?: string | null;
  inputConfig?: Record<string, unknown>;
};

export type Message = {
  id: string;
  type: 'content' | 'user' | 'timestamp' | 'divider' | 'tool';
  data: ContentBlock[] | UserResponseContent | Date | DividerData | ToolMessageData;
  timestamp: Date;
};

export type ScrollState = 'at-current' | 'in-history';
