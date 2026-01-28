// Workbook component types

import type { ThemeSettings } from '@/lib/theme';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlockContent = Record<string, any>;

// Re-export ThemeSettings for convenience
export type { ThemeSettings };

// Block type - 'prompt' removed in schema consolidation
export interface ExerciseBlock {
  id: number;
  sequence: number;
  blockType: 'content' | 'tool';
  activityId: number;
  connectionId: number | null;
  content: BlockContent;
}

export interface ContentData {
  id?: number;
  type?: 'heading' | 'instruction' | 'note' | 'quote' | 'transition' | 'celebration';
  text?: string;
}

// Input config for simple tool types (former prompts)
export interface InputConfig {
  min?: number;
  max?: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  labels?: string[]; // For sliders with custom labels
}

// Tool types - interactive for complex tools, simple types for former prompts
export type ToolType = 'interactive' | 'text_input' | 'textarea' | 'slider' | 'checkbox' | 'checkbox_group' | 'radio' | 'select';

export interface ToolData {
  id?: number;
  name?: string;
  description?: string;
  instructions?: string;
  // Schema consolidation: tools now include simple input types
  toolType?: ToolType;
  promptText?: string | null;  // Label for simple inputs (NULL if preceding content has instruction)
  inputConfig?: InputConfig;   // Config for simple inputs
}

export interface ExerciseContent {
  exerciseId: string;
  part: number;
  module: number;
  exercise: number;
  title: string;
  blocks: ExerciseBlock[];
  nextExerciseId: string | null;
  prevExerciseId: string | null;
}

export interface SavedResponse {
  id: string;
  prompt_id: number | null;
  tool_id: number | null;
  exercise_id: string;
  activity_id: string | null;
  response_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkbookMessage {
  id: string;
  type: 'content' | 'user' | 'tool';  // Schema consolidation: 'prompt' removed
  block?: ExerciseBlock;
  userResponse?: string;
  timestamp: Date;
}

/**
 * Single Page Architecture: Block with response merged in
 * Used by GET /api/workbook and POST /api/workbook/response
 *
 * Note: After schema consolidation, all inputs are tools.
 * blockType will always be 'content' or 'tool'.
 */
export interface BlockWithResponse {
  id: number;
  sequence: number;
  exerciseId: string;
  blockType: 'content' | 'tool';
  activityId: number;
  connectionId: number | null;
  content: {
    id?: number;
    // Content block fields
    type?: string;
    text?: string;
    // Tool fields (including simple inputs)
    name?: string;
    description?: string;
    instructions?: string;
    toolType?: ToolType;
    promptText?: string | null;  // Label for simple inputs
    inputConfig?: InputConfig;   // Config for simple inputs
  };
  response?: string | null;
  responseId?: string | null;
}
