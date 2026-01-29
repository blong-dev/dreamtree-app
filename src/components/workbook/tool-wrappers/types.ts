/**
 * Response from tool save API
 */
export interface ToolSaveResponse {
  id: string;
  stemId?: number;
  responseText?: string; // Now returned by API for WorkbookView to use
  updated: boolean;
  newProgress?: number;
  nextBlock?: unknown | null;
  hasMore?: boolean;
}

/**
 * Ref handle exposed by tool wrappers for parent control
 * Allows WorkbookView to trigger save without tools having their own Continue buttons
 */
export interface ToolWrapperRef {
  save: () => Promise<void>;
  /** Returns true if the tool has valid data that can be saved */
  isValid: () => boolean;
}

/**
 * Common props for all tool wrapper components
 * IMP-002: Shared interface for tool wrappers
 * Updated: Now uses stemId as the single identifier instead of compound key
 */
export interface ToolWrapperProps {
  /** The stem.id - unique identifier for this tool instance */
  stemId: number;
  connectionId: number | null;
  instructions?: string;
  onComplete: (data: ToolSaveResponse) => void;
  /** BUG-380: Pre-populated data for completed tools in history */
  initialData?: string;
  /** BUG-380: Read-only mode for completed tools in history */
  readOnly?: boolean;
  /** Counter to trigger data refetch (for Part B responsiveness to Part A edits) */
  refreshTrigger?: number;
  /** Called after successful auto-save (for completed tools to trigger refresh of dependent tools) */
  onDataChange?: () => void;
}
