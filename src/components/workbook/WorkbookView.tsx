'use client';

/**
 * WorkbookView - Single Page Architecture
 *
 * Renders the entire workbook as one scrollable page.
 * Blocks 1..N+1 are fetched on load (completed + current).
 * When user responds, next block is fetched and appended.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const AUTO_SAVE_DELAY = 1500;

import { AppShell } from '../shell/AppShell';
import { ConversationThread } from '../conversation/ConversationThread';
import { ToolEmbed, type ToolEmbedRef } from './ToolEmbed';
import { WorkbookInputZone } from './WorkbookInputZone';
import { useToast, SaveIndicator } from '../feedback';
import { TextInput, TextArea } from '../forms';
import { SendIcon } from '../icons';
import { TOCPanel } from '../overlays/TOCPanel';
import type { WorkbookProgress, BreadcrumbLocation as TOCLocation } from '../overlays/types';

import { useApplyTheme } from '@/hooks/useApplyTheme';
import { trackExerciseStart, trackPromptSubmit } from '@/lib/analytics';
import type { SaveStatus } from '../feedback/types';
import type { BlockWithResponse, ToolData, ThemeSettings, ToolType } from './types';
import type { Message, ContentBlock, UserResponseContent, ToolMessageData } from '../conversation/types';
import type { BreadcrumbLocation, InputType } from '../shell/types';

// Schema consolidation: text input tools use InputArea, others use ToolEmbed
const TEXT_INPUT_TYPES: Set<ToolType> = new Set(['textarea', 'text_input']);

function isTextInputTool(block: BlockWithResponse): boolean { // code_id:923
  if (block.blockType !== 'tool') return false;
  const toolType = block.content.toolType as ToolType | undefined;
  return toolType !== undefined && TEXT_INPUT_TYPES.has(toolType);
}

function isStructuredInputTool(block: BlockWithResponse): boolean { // code_id:924
  if (block.blockType !== 'tool') return false;
  const toolType = block.content.toolType as ToolType | undefined;
  // Structured inputs are non-text simple tools (slider, checkbox, etc.)
  return toolType !== undefined && !TEXT_INPUT_TYPES.has(toolType) && toolType !== 'interactive';
}

interface WorkbookViewProps {
  initialBlocks: BlockWithResponse[];
  initialProgress: number;
  theme?: ThemeSettings;
}

// Convert block content to conversation content
function blockToConversationContent(block: BlockWithResponse): ContentBlock[] { // code_id:3
  const text = block.content.text || '';
  const type = block.content.type || 'paragraph';

  switch (type) {
    case 'heading':
      return [{ type: 'heading', level: 2, text }];
    case 'instruction':
    case 'transition':
      return [{ type: 'paragraph', text }];
    case 'note':
      return [{ type: 'emphasis', text }];
    case 'quote':
      return [{ type: 'quote', text }];
    case 'celebration':
      return [{ type: 'activity-header', title: text }];
    default:
      return [{ type: 'paragraph', text }];
  }
}

export function WorkbookView({ initialBlocks, initialProgress, theme }: WorkbookViewProps) { // code_id:2
  const { showToast } = useToast();
  const router = useRouter();

  // Apply user's theme on mount
  useApplyTheme({
    backgroundColor: theme?.backgroundColor,
    textColor: theme?.textColor,
    font: theme?.font,
  });

  // Core state: blocks array and progress
  const [blocks, setBlocks] = useState<BlockWithResponse[]>(initialBlocks);
  const [, setProgress] = useState(initialProgress);
  const [hasMore, setHasMore] = useState(initialBlocks.length > 0);

  // Track which block we're displaying (one-at-a-time progression)
  const [displayedBlockIndex, setDisplayedBlockIndex] = useState(() => {
    // Find first unanswered tool (text inputs or interactive tools), or show all if all answered
    const firstUnanswered = initialBlocks.findIndex(
      (b) => b.blockType === 'tool' && !b.response
    );
    if (firstUnanswered === -1) {
      return initialBlocks.length;
    }
    return firstUnanswered + 1;
  });

  // UI state
  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<InputType>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<SaveStatus>('idle');
  const [waitingForContinue, setWaitingForContinue] = useState(false);
  const [currentAnimationComplete, setCurrentAnimationComplete] = useState(false);
  const [promptAnimationComplete, setPromptAnimationComplete] = useState(false);
  const [inputZoneCollapsed, setInputZoneCollapsed] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  // Edit state
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputZoneRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const savedIndicatorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedValueRef = useRef<string>('');
  const blockContentCache = useRef<Map<number, ContentBlock[]>>(new Map());
  const animatedMessageIdsRef = useRef<Set<string>>(new Set());
  const isAdvancingRef = useRef(false);
  const isSavingRef = useRef(false); // Guard against save race conditions (BUG-022)
  const toolEmbedRef = useRef<ToolEmbedRef>(null); // Ref to call save() on active tool

  // State to sync with isAdvancingRef for button disabled state (refs don't trigger re-renders)
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isToolSaving, setIsToolSaving] = useState(false); // Track tool save in progress

  // Analytics tracking refs
  const exerciseStartTimeRef = useRef<number>(Date.now());
  const lastTrackedExerciseRef = useRef<string>('');

  // Initialize animated message IDs for returning users
  const isInitializedRef = useRef(false);
  if (!isInitializedRef.current && initialProgress > 0) {
    isInitializedRef.current = true;
    // Mark all blocks up to displayed index as already animated
    for (let i = 0; i < displayedBlockIndex && i < initialBlocks.length; i++) {
      const block = initialBlocks[i];
      animatedMessageIdsRef.current.add(`block-${block.id}`);
      // Text input tools have prompt-like display (question + response)
      if (isTextInputTool(block)) {
        animatedMessageIdsRef.current.add(`textinput-${block.id}`);
        if (block.response) {
          animatedMessageIdsRef.current.add(`response-${block.id}`);
        }
      }
    }
  } else if (!isInitializedRef.current) {
    isInitializedRef.current = true;
  }

  // Current active block for input
  const currentBlock = blocks[displayedBlockIndex - 1];
  const isToolBlock = currentBlock?.blockType === 'tool';
  const hasResponse = !!currentBlock?.response;

  // Build messages array from blocks
  const messages = useMemo(() => {
    const result: Message[] = [];
    const cache = blockContentCache.current;

    for (let i = 0; i < displayedBlockIndex && i < blocks.length; i++) {
      const block = blocks[i];

      if (block.blockType === 'content') {
        let content = cache.get(block.id);
        if (!content) {
          content = blockToConversationContent(block);
          cache.set(block.id, content);
        }
        result.push({
          id: `block-${block.id}`,
          type: 'content',
          data: content,
          timestamp: new Date(),
        });
      } else if (block.blockType === 'tool') {
        // Check if this is a text input tool (uses InputArea flow like old prompts)
        if (isTextInputTool(block)) {
          // Show prompt text if available (usually NULL after schema consolidation)
          if (block.content.promptText) {
            const promptCacheKey = block.id + 10000000;
            let promptContent = cache.get(promptCacheKey);
            if (!promptContent) {
              promptContent = [
                { type: 'paragraph' as const, text: block.content.promptText },
              ];
              cache.set(promptCacheKey, promptContent);
            }
            result.push({
              id: `textinput-${block.id}`,
              type: 'content',
              data: promptContent,
              timestamp: new Date(),
            });
          }

          // Show user's response if available
          if (block.response) {
            result.push({
              id: `response-${block.id}`,
              type: 'user',
              data: { type: 'text', value: block.response } as UserResponseContent,
              timestamp: new Date(),
            });
          }
        } else if (block.response) {
          // BUG-380: Add completed tools to conversation history
          // Only show tools that have been completed (have a response)
          const toolData: ToolMessageData = {
            toolId: block.content.id || 0,
            name: block.content.name || 'Tool',
            description: block.content.description,
            instructions: block.content.instructions,
            exerciseId: block.exerciseId,
            activityId: block.activityId || 1,
            connectionId: block.connectionId,
            response: block.response,
          };
          result.push({
            id: `tool-${block.id}`,
            type: 'tool',
            data: toolData,
            timestamp: new Date(),
          });
        }
      }
    }

    return result;
  }, [blocks, displayedBlockIndex]);

  // Determine input type based on current block
  useEffect(() => {
    if (!currentBlock) {
      setInputType('none');
      setWaitingForContinue(false);
      return;
    }

    if (currentBlock.blockType === 'content') {
      setInputType('none');
      setWaitingForContinue(true);
    } else if (currentBlock.blockType === 'tool' && !currentBlock.response) {
      setWaitingForContinue(false);
      // Schema consolidation: check toolType for text inputs
      const toolType = currentBlock.content.toolType;
      if (toolType === 'text_input') {
        setInputType('text');
      } else if (toolType === 'textarea') {
        setInputType('textarea');
      } else {
        // Structured inputs (slider, checkbox, etc.) and interactive tools handled by ToolEmbed
        setInputType('none');
      }
    } else {
      // Block already answered, advance
      if (displayedBlockIndex < blocks.length) {
        setDisplayedBlockIndex((prev) => prev + 1);
      }
    }
  }, [currentBlock, displayedBlockIndex, blocks.length]);

  // Fetch next block from server when we've exhausted loaded blocks
  const fetchNextBlock = useCallback(async () => {
    const lastBlock = blocks[blocks.length - 1];
    if (!lastBlock) return;

    try {
      const response = await fetch(`/api/workbook/next?after=${lastBlock.sequence}`);
      if (!response.ok) {
        console.error('Failed to fetch next block');
        return;
      }

      const data = await response.json();
      if (data.nextBlock) {
        setBlocks((prev) => [...prev, data.nextBlock]);
        setDisplayedBlockIndex((prev) => prev + 1);
      }
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching next block:', error);
    } finally {
      isAdvancingRef.current = false;
      setIsAdvancing(false);
    }
  }, [blocks]);

  // Handle animation completion
  const handleMessageAnimated = useCallback(
    (messageId: string, wasSkipped: boolean) => {
      animatedMessageIdsRef.current.add(messageId);

      if (currentBlock?.blockType === 'content' && messageId === `block-${currentBlock.id}`) {
        if (wasSkipped) {
          // Guard against rapid skips (same pattern as handleContinue)
          if (isAdvancingRef.current) return;
          isAdvancingRef.current = true;
          setIsAdvancing(true);

          setWaitingForContinue(false);

          if (displayedBlockIndex < blocks.length) {
            // More blocks already loaded - just advance
            setDisplayedBlockIndex((prev) => prev + 1);
            setTimeout(() => {
              isAdvancingRef.current = false;
              setIsAdvancing(false);
            }, 200);
          } else if (hasMore) {
            // Need to fetch next block from server (BUG-321 fix)
            fetchNextBlock();
          } else {
            // No more blocks - reset advancing state
            setTimeout(() => {
              isAdvancingRef.current = false;
              setIsAdvancing(false);
            }, 200);
          }
        } else {
          setCurrentAnimationComplete(true);
        }
      }

      // Text input tools have prompt-like animation handling
      if (currentBlock && isTextInputTool(currentBlock) && messageId === `textinput-${currentBlock.id}`) {
        setPromptAnimationComplete(true);
      }
    },
    [currentBlock, displayedBlockIndex, blocks.length, hasMore, fetchNextBlock]
  );

  // Reset animation states when block changes
  useEffect(() => {
    setCurrentAnimationComplete(false);
    setPromptAnimationComplete(false);

    // Check if new block is already animated (returning user)
    if (currentBlock?.blockType === 'content') {
      const contentMsgId = `block-${currentBlock.id}`;
      if (animatedMessageIdsRef.current.has(contentMsgId)) {
        setCurrentAnimationComplete(true);
      }
    }
    // Text input tools have prompt-like animation check
    if (currentBlock && isTextInputTool(currentBlock)) {
      const textInputMsgId = `textinput-${currentBlock.id}`;
      if (animatedMessageIdsRef.current.has(textInputMsgId)) {
        setPromptAnimationComplete(true);
      }
    }
  }, [displayedBlockIndex, currentBlock]);

  // Track exercise start when exercise changes
  useEffect(() => {
    const exerciseId = currentBlock?.exerciseId;
    if (exerciseId && exerciseId !== lastTrackedExerciseRef.current) {
      lastTrackedExerciseRef.current = exerciseId;
      exerciseStartTimeRef.current = Date.now();
      trackExerciseStart(exerciseId);
    }
  }, [currentBlock?.exerciseId]);

  // Track position for workbook return (BUG-357)
  // Debounced to avoid spam, one-way ratchet on server
  const lastReportedSequenceRef = useRef<number>(0);
  useEffect(() => {
    const block = blocks[displayedBlockIndex - 1];
    if (!block) return;

    const sequence = block.sequence;
    if (sequence <= lastReportedSequenceRef.current) return;

    const timer = setTimeout(() => {
      lastReportedSequenceRef.current = sequence;
      fetch('/api/workbook/position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence }),
      }).catch(() => {
        // Silent fail - position tracking is best-effort
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [displayedBlockIndex, blocks]);

  // Handle continue button (guarded against rapid clicks)
  const handleContinue = useCallback(() => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setIsAdvancing(true); // Sync state for button disabled UI

    setWaitingForContinue(false);

    if (displayedBlockIndex < blocks.length) {
      // More blocks already loaded - just advance
      setDisplayedBlockIndex((prev) => prev + 1);
      setTimeout(() => {
        isAdvancingRef.current = false;
        setIsAdvancing(false);
      }, 200);
    } else if (hasMore) {
      // Need to fetch next block from server
      fetchNextBlock();
    } else {
      // No more blocks - reset advancing state
      setTimeout(() => {
        isAdvancingRef.current = false;
        setIsAdvancing(false);
      }, 200);
    }
  }, [displayedBlockIndex, blocks.length, hasMore, fetchNextBlock]);

  // Handle tool Continue button - calls save() on the active tool via ref
  const handleToolContinue = useCallback(async () => {
    if (!toolEmbedRef.current || isToolSaving) return;
    setIsToolSaving(true);
    try {
      await toolEmbedRef.current.save();
    } catch (error) {
      console.error('Error saving tool:', error);
      showToast('Failed to save. Please try again.', { type: 'error' });
    } finally {
      setIsToolSaving(false);
    }
  }, [isToolSaving, showToast]);

  // Auto-save for text inputs (schema consolidation: now uses stemId for all tools)
  const autoSave = useCallback(
    async (responseText: string) => {
      if (!currentBlock || !responseText.trim()) return;
      if (responseText === lastSavedValueRef.current) return;
      // Only auto-save for text input tools
      if (!isTextInputTool(currentBlock)) return;

      setAutoSaveStatus('saving');
      try {
        const response = await fetch('/api/workbook/response', {
          method: editingBlockId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stemId: currentBlock.id,  // Use stemId for all tools now
            responseText,
          }),
        });

        if (response.ok) {
          lastSavedValueRef.current = responseText;
          // Update block in state
          setBlocks((prev) =>
            prev.map((b) => (b.id === currentBlock.id ? { ...b, response: responseText } : b))
          );
          setAutoSaveStatus('saved');
          if (savedIndicatorTimerRef.current) {
            clearTimeout(savedIndicatorTimerRef.current);
          }
          savedIndicatorTimerRef.current = setTimeout(() => {
            setAutoSaveStatus('idle');
          }, 2000);
        } else {
          setAutoSaveStatus('error');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
      }
    },
    [currentBlock, editingBlockId]
  );

  // Debounced auto-save effect
  useEffect(() => {
    if (inputType !== 'text' && inputType !== 'textarea') return;
    if (!inputValue.trim()) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSave(inputValue);
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [inputValue, inputType, autoSave]);

  // Save response and get next block (schema consolidation: uses stemId for all tools)
  const handleSaveResponse = useCallback(
    async (responseText: string) => {
      // Use ref guard to prevent race conditions (BUG-022)
      if (!currentBlock || isSavingRef.current) return;
      // Only handle text input tools through this handler
      if (!isTextInputTool(currentBlock)) return;
      isSavingRef.current = true;

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // Skip if unchanged and already saved
      if (responseText === lastSavedValueRef.current && !editingBlockId) {
        setInputValue('');
        setEditingBlockId(null);
        setInputType('none');
        lastSavedValueRef.current = '';
        setTimeout(() => {
          isSavingRef.current = false;
          setDisplayedBlockIndex((prev) => prev + 1);
        }, 300);
        return;
      }

      setIsSaving(true);
      try {
        const response = await fetch('/api/workbook/response', {
          method: editingBlockId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stemId: currentBlock.id,  // Use stemId for all tools now
            responseText,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save response');
        }

        const data = await response.json();

        // Track prompt submission
        if (currentBlock.content.id) {
          trackPromptSubmit(currentBlock.content.id.toString());
        }

        // Update current block with response
        setBlocks((prev) =>
          prev.map((b) => (b.id === currentBlock.id ? { ...b, response: responseText } : b))
        );

        // Append next block if available
        if (data.nextBlock) {
          setBlocks((prev) => [...prev, data.nextBlock]);
        }

        // Update progress
        if (data.newProgress !== undefined) {
          setProgress(data.newProgress);
        }
        if (data.hasMore !== undefined) {
          setHasMore(data.hasMore);
        }

        // Clear input state
        setInputValue('');
        setEditingBlockId(null);
        setInputType('none');
        lastSavedValueRef.current = '';

        // Advance to next block (unless editing)
        if (!editingBlockId) {
          setTimeout(() => {
            setDisplayedBlockIndex((prev) => prev + 1);
          }, 300);
        }
      } catch (error) {
        console.error('Error saving response:', error);
        if (error instanceof TypeError && error.message.includes('fetch')) {
          showToast('Unable to connect. Check your internet connection.', { type: 'error' });
        } else {
          showToast('Failed to save your response. Please try again.', { type: 'error' });
        }
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [currentBlock, editingBlockId, showToast]
  );

  // Handle tool completion - receives data from useToolSave
  // Updated: Now uses responseText from API instead of marker hack
  const handleToolComplete = useCallback(
    (data: { id: string; stemId?: number; responseText?: string; updated: boolean; newProgress?: number; nextBlock?: unknown | null; hasMore?: boolean }) => {
      if (!currentBlock || currentBlock.blockType !== 'tool') return;

      // Update block with actual response data (not marker)
      setBlocks((prev) =>
        prev.map((b) => (b.id === currentBlock.id ? { ...b, response: data.responseText || '' } : b))
      );

      // Append next block if available
      if (data.nextBlock) {
        setBlocks((prev) => [...prev, data.nextBlock as BlockWithResponse]);
      }

      if (data.newProgress !== undefined) {
        setProgress(data.newProgress);
      }
      if (data.hasMore !== undefined) {
        setHasMore(data.hasMore);
      }

      setTimeout(() => {
        setDisplayedBlockIndex((prev) => prev + 1);
      }, 300);
    },
    [currentBlock]
  );

  // BUG-404: Handle tool edit completion
  const handleToolEditComplete = useCallback(
    (data: { id: string; stemId?: number; responseText?: string; updated: boolean }) => {
      // Update the block's response in state so UI reflects changes
      if (editingBlockId && data.responseText) {
        setBlocks((prev) =>
          prev.map((b) => (b.id === editingBlockId ? { ...b, response: data.responseText } : b))
        );
      }
      // Clear edit state
      setEditingBlockId(null);
      showToast('Tool updated', { type: 'success' });
    },
    [editingBlockId, showToast]
  );

  // Note: No longer need to fetch tool response on edit since we now store
  // actual response data in block.response instead of a marker

  // Handle editing a past response (text input tools or interactive tools)
  const handleEditMessage = useCallback(
    (messageId: string) => {
      // Text input response edit flow (schema consolidation: former prompts)
      if (messageId.startsWith('response-')) {
        const blockId = parseInt(messageId.replace('response-', ''), 10);
        const block = blocks.find((b) => b.id === blockId);

        if (!block || !isTextInputTool(block)) return;

        setEditingBlockId(blockId);
        setInputValue(block.response || '');

        const toolType = block.content.toolType;
        if (toolType === 'text_input') {
          setInputType('text');
        } else if (toolType === 'textarea') {
          setInputType('textarea');
        } else {
          setInputType('none');
        }
        return;
      }

      // Tool edit flow (interactive tools)
      if (messageId.startsWith('tool-')) {
        const blockId = parseInt(messageId.replace('tool-', ''), 10);
        const block = blocks.find((b) => b.id === blockId);

        if (!block || block.blockType !== 'tool') return;

        setEditingBlockId(blockId);
        // Tool will render in input zone with initialData from block.response
      }
    },
    [blocks]
  );

  // Scroll tracking for input zone collapse
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => { // code_id:386
      const scrollTop = container.scrollTop;
      const viewportHeight = window.innerHeight;
      setInputZoneCollapsed(scrollTop > viewportHeight);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleExpandInputZone = useCallback(() => {
    setInputZoneCollapsed(false);
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, []);

  // Auto-scroll input zone into view when content changes
  useEffect(() => {
    // Small delay to let the DOM update first
    const timer = setTimeout(() => {
      inputZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    return () => clearTimeout(timer);
  }, [displayedBlockIndex]);

  // Global Enter key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { // code_id:387
      if (e.key === 'Enter' && waitingForContinue && currentAnimationComplete) {
        const activeElement = document.activeElement;
        const isInputFocused =
          activeElement?.tagName === 'INPUT' ||
          activeElement?.tagName === 'TEXTAREA' ||
          activeElement?.tagName === 'SELECT';

        if (!isInputFocused) {
          e.preventDefault();
          handleContinue();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [waitingForContinue, currentAnimationComplete, handleContinue]);

  // Click-to-continue handler
  const handleContentAreaClick = useCallback(
    (e: React.MouseEvent) => {
      if (!waitingForContinue || !currentAnimationComplete) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('a')
      ) {
        return;
      }

      handleContinue();
    },
    [waitingForContinue, currentAnimationComplete, handleContinue]
  );

  // Build breadcrumb from current block's exercise
  const currentExerciseId = currentBlock?.exerciseId || blocks[0]?.exerciseId || '1.1.1';
  const [partStr, moduleStr] = currentExerciseId.split('.');
  const part = parseInt(partStr, 10) || 1;
  const moduleNum = parseInt(moduleStr, 10) || 1;

  const breadcrumbLocation: BreadcrumbLocation = {
    partId: partStr,
    partTitle: `Part ${part}`,
    moduleId: `${part}.${moduleNum}`,
    moduleTitle: `Module ${moduleNum}`,
    exerciseId: currentExerciseId,
    exerciseTitle: `Exercise ${currentExerciseId}`,
  };

  // TOC progress (minimal)
  const tocProgress: WorkbookProgress = useMemo(
    () => ({
      parts: [
        {
          id: partStr,
          title: `Part ${part}: ${part === 1 ? 'Roots' : part === 2 ? 'Trunk' : 'Branches'}`,
          status: 'in-progress',
          percentComplete: 0,
          modules: [
            {
              id: `${part}.${moduleNum}`,
              title: `Module ${moduleNum}`,
              status: 'in-progress',
              exercises: [
                {
                  id: currentExerciseId,
                  title: `Exercise ${currentExerciseId}`,
                  status: 'in-progress',
                },
              ],
            },
          ],
        },
      ],
    }),
    [partStr, part, moduleNum, currentExerciseId]
  );

  // Handle navigation
  const handleNavigate = (id: string) => { // code_id:388
    switch (id) {
      case 'contents':
        setTocOpen(true);
        break;
      case 'home':
        router.push('/');
        break;
      case 'profile':
        router.push('/profile');
        break;
      case 'tools':
        router.push('/tools');
        break;
    }
  };

  const handleTocNavigate = (location: TOCLocation) => { // code_id:389
    if (location.exerciseId) {
      // Update URL hash for navigation within single page
      window.location.hash = location.exerciseId;
      setTocOpen(false);
    }
  };

  // Determine what's active for input zone
  const isWorkbookComplete = displayedBlockIndex >= blocks.length && !hasMore;
  // Text input tools (textarea/text_input) use the floating InputArea
  const hasTextInput =
    (inputType === 'text' || inputType === 'textarea') && promptAnimationComplete && !hasResponse;
  // Structured input tools (slider, checkbox, etc.) and interactive tools use ToolEmbed
  const hasStructuredInput = currentBlock && isStructuredInputTool(currentBlock) && !hasResponse;
  // Interactive tools also use ToolEmbed
  const hasInteractiveToolInput = isToolBlock && !hasResponse && currentBlock?.content.toolType === 'interactive';
  // Combined tool input check
  const hasToolInput = hasStructuredInput || hasInteractiveToolInput;
  // BUG-449: Exclude Continue button when editing (in-place editing doesn't use input zone)
  const hasContinue = waitingForContinue && currentAnimationComplete && !editingBlockId;
  // Active input check (tool editing is now in-place, not in input zone)
  const hasActiveInput = hasTextInput || hasToolInput || hasContinue;

  const getCollapsedLabel = () => { // code_id:390
    if (hasTextInput) return 'Tap to respond';
    if (hasToolInput) return 'Tap to use tool';
    if (hasContinue) return 'Tap to continue';
    return 'Tap to continue';
  };

  // BUG-380: Render completed tools in conversation history
  // Tools stay editable - no read-only mode or Edit button needed
  const renderTool = useCallback((data: ToolMessageData, messageId: string) => {
    // Extract stemId from messageId (format: "tool-{stemId}")
    const stemId = parseInt(messageId.replace('tool-', ''), 10);
    const toolData: ToolData = {
      id: data.toolId,
      name: data.name,
      description: data.description,
      instructions: data.instructions,
    };

    // Always editable - changes auto-save
    return (
      <div className="workbook-completed-tool">
        <ToolEmbed
          tool={toolData}
          stemId={stemId}
          connectionId={data.connectionId}
          initialData={data.response}
          readOnly={false}
        />
      </div>
    );
  }, []);

  return (
    <AppShell
      currentLocation={breadcrumbLocation}
      showBreadcrumb={true}
      showInput={false}
      activeNavItem="home"
      onNavigate={handleNavigate}
    >
      <div
        className="workbook-view"
        ref={scrollContainerRef}
        onClick={handleContentAreaClick}
        data-tap-to-continue={hasContinue ? 'true' : 'false'}
      >
        <ConversationThread
          messages={messages}
          autoScrollOnNew={true}
          onEditMessage={handleEditMessage}
          animatedMessageIds={animatedMessageIdsRef.current}
          onMessageAnimated={handleMessageAnimated}
          scrollTrigger={displayedBlockIndex}
          renderTool={renderTool}
        />

        <div ref={inputZoneRef}>
          <WorkbookInputZone
            collapsed={inputZoneCollapsed}
            onExpand={handleExpandInputZone}
            hasActiveInput={hasActiveInput}
            collapsedLabel={getCollapsedLabel()}
          >
            {hasTextInput && autoSaveStatus !== 'idle' && (
              <div className="workbook-autosave">
                <SaveIndicator status={autoSaveStatus} />
              </div>
            )}

            {hasTextInput && (
              <div className="workbook-input-zone-text">
                {inputType === 'textarea' ? (
                  <TextArea
                    value={inputValue}
                    onChange={setInputValue}
                    placeholder={currentBlock?.content.inputConfig?.placeholder || 'Type your response...'}
                    minRows={3}
                  />
                ) : (
                  <TextInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSubmit={() => handleSaveResponse(inputValue)}
                    placeholder={currentBlock?.content.inputConfig?.placeholder || 'Type your response...'}
                  />
                )}
                <button
                  className="button button-primary"
                  onClick={() => handleSaveResponse(inputValue)}
                  disabled={isSaving || !inputValue.trim()}
                  aria-label="Send"
                >
                  <SendIcon />
                </button>
              </div>
            )}

            {/* Schema consolidation: all structured inputs and tools use ToolEmbed */}
            {hasToolInput && currentBlock && (
              <>
                <ToolEmbed
                  ref={toolEmbedRef}
                  tool={currentBlock.content as ToolData}
                  stemId={currentBlock.id}
                  connectionId={currentBlock.connectionId}
                  onComplete={handleToolComplete}
                />
                <div className="workbook-tool-continue">
                  <button
                    className="button button-primary"
                    onClick={handleToolContinue}
                    disabled={isToolSaving}
                  >
                    {isToolSaving ? 'Saving...' : 'Continue'}
                  </button>
                </div>
              </>
            )}

            {hasContinue && (
              <div className="workbook-continue">
                <button
                  className="button button-primary"
                  onClick={handleContinue}
                  disabled={isAdvancing}
                >
                  Continue
                </button>
              </div>
            )}

            {isWorkbookComplete && (
              <div className="workbook-complete">
                <p>You have completed all available content.</p>
              </div>
            )}
          </WorkbookInputZone>
        </div>
      </div>

      <TOCPanel
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        currentLocation={{
          partId: breadcrumbLocation.partId,
          partTitle: breadcrumbLocation.partTitle,
          moduleId: breadcrumbLocation.moduleId,
          moduleTitle: breadcrumbLocation.moduleTitle,
          exerciseId: breadcrumbLocation.exerciseId,
          exerciseTitle: breadcrumbLocation.exerciseTitle,
        }}
        progress={tocProgress}
        onNavigate={handleTocNavigate}
      />
    </AppShell>
  );
}
