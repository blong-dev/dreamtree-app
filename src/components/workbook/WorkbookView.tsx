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

import { AppShell } from '../shell/AppShell';
import { ConversationThread } from '../conversation/ConversationThread';
import { ToolEmbed, type ToolEmbedRef } from './ToolEmbed';
import { WorkbookInputZone } from './WorkbookInputZone';
import { useToast } from '../feedback';
import { TOCPanel } from '../overlays/TOCPanel';
import type { WorkbookProgress, BreadcrumbLocation as TOCLocation } from '../overlays/types';

import { useApplyTheme } from '@/hooks/useApplyTheme';
import { trackExerciseStart } from '@/lib/analytics';
import type { BlockWithResponse, ToolData, ThemeSettings } from './types';
import type { Message, ContentBlock, ToolMessageData } from '../conversation/types';
import type { BreadcrumbLocation } from '../shell/types';


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
    textSize: theme?.textSize,
  });

  // Core state: blocks array and progress
  const [blocks, setBlocks] = useState<BlockWithResponse[]>(initialBlocks);
  const [, setProgress] = useState(initialProgress);
  const [hasMore, setHasMore] = useState(initialBlocks.length > 0);

  // Track which block we're displaying (one-at-a-time progression)
  const [displayedBlockIndex, setDisplayedBlockIndex] = useState(() => {
    // Find first unanswered tool - this check applies to ALL users
    // We must stop at unanswered tools regardless of saved position
    const firstUnanswered = initialBlocks.findIndex(
      (b) => b.blockType === 'tool' && !b.response
    );

    if (firstUnanswered === -1) {
      // All tools answered - show up to last block
      return initialBlocks.length;
    }

    // Show up to and including the first unanswered tool
    // Clamp to ensure we never exceed array bounds
    return Math.min(firstUnanswered + 1, initialBlocks.length);
  });

  // UI state
  const [waitingForContinue, setWaitingForContinue] = useState(false);
  const [currentAnimationComplete, setCurrentAnimationComplete] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  // Edit state
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);

  // Refs
  const inputZoneRef = useRef<HTMLDivElement>(null);
  const blockContentCache = useRef<Map<number, ContentBlock[]>>(new Map());
  const isAdvancingRef = useRef(false);
  const toolEmbedRef = useRef<ToolEmbedRef>(null); // Ref to call save() on active tool
  const isToolSavingRef = useRef(false); // Guard against rapid clicks (refs are synchronous)

  // State to sync with isAdvancingRef for button disabled state (refs don't trigger re-renders)
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isToolSaving, setIsToolSaving] = useState(false); // Track tool save in progress
  // Counter for connection data refresh - triggers Part B refresh when Part A saves
  const [connectionDataVersion, setConnectionDataVersion] = useState(0);

  // Analytics tracking refs
  const exerciseStartTimeRef = useRef<number>(Date.now());
  const lastTrackedExerciseRef = useRef<string>('');

  // Initialize animated message IDs for returning users using useState initializer
  // This runs once on mount and creates a stable Set reference
  const [animatedMessageIds, setAnimatedMessageIds] = useState<Set<string>>(() => {
    const hasAnyResponse = initialBlocks.some(b => b.response);
    if (initialProgress > 0 || hasAnyResponse) {
      // Returning user: mark all loaded blocks as already animated
      return new Set(initialBlocks.map(b => `block-${b.id}`));
    }
    // New user: start with empty set
    return new Set();
  });

  // Current active block for input
  // Clamp displayedBlockIndex to valid range to prevent off-by-one errors during rapid skipping
  const effectiveDisplayIndex = Math.min(displayedBlockIndex, blocks.length);
  const currentBlock = effectiveDisplayIndex > 0 ? blocks[effectiveDisplayIndex - 1] : undefined;

  // Sync displayedBlockIndex if it got out of bounds (can happen during rapid skipping)
  useEffect(() => {
    if (displayedBlockIndex > blocks.length && blocks.length > 0) {
      setDisplayedBlockIndex(blocks.length);
    }
  }, [displayedBlockIndex, blocks.length]);
  const hasResponse = !!currentBlock?.response;
  // Check if current block is an unanswered tool (needs input)
  const hasToolInput = currentBlock?.blockType === 'tool' && !hasResponse;

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
      } else if (block.blockType === 'tool' && block.response) {
        // Add completed tools to conversation history (all tools use ToolEmbed now)
        const toolData: ToolMessageData = {
          toolId: block.content.id || 0,
          name: block.content.name || 'Tool',
          description: block.content.description,
          instructions: block.content.instructions,
          exerciseId: block.exerciseId,
          activityId: block.activityId || 1,
          connectionId: block.connectionId,
          response: block.response,
          toolType: block.content.toolType,
          promptText: block.content.promptText,
          inputConfig: block.content.inputConfig,
        };
        result.push({
          id: `tool-${block.id}`,
          type: 'tool',
          data: toolData,
          timestamp: new Date(),
        });
      }
    }

    return result;
  }, [blocks, displayedBlockIndex]);

  // Determine what UI to show based on current block
  useEffect(() => {
    if (!currentBlock) {
      setWaitingForContinue(false);
      return;
    }

    if (currentBlock.blockType === 'content') {
      // Content blocks show Continue button after animation
      setWaitingForContinue(true);
    } else if (currentBlock.blockType === 'tool' && !currentBlock.response) {
      // Unanswered tools - ToolEmbed will render
      setWaitingForContinue(false);
    } else {
      // Completed tool - no action needed, handleToolComplete handles advancement
      setWaitingForContinue(false);
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
      // Add to animated set (for future reference if needed)
      setAnimatedMessageIds(prev => new Set(prev).add(messageId));

      if (currentBlock?.blockType === 'content' && messageId === `block-${currentBlock.id}`) {
        // Check if next block is a tool - auto-show it without Continue button
        // displayedBlockIndex is 1-indexed, so blocks[displayedBlockIndex] gets the next block
        const nextBlock = blocks[displayedBlockIndex];
        const nextIsTool = nextBlock?.blockType === 'tool';

        if (wasSkipped || nextIsTool) {
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
          // Next block is content - wait for Continue button
          setCurrentAnimationComplete(true);
        }
      }
    },
    [currentBlock, displayedBlockIndex, blocks.length, hasMore, fetchNextBlock]
  );

  // Reset animation states when block changes
  useEffect(() => {
    setCurrentAnimationComplete(false);

    // Check if new block is already animated (returning user)
    if (currentBlock?.blockType === 'content') {
      const contentMsgId = `block-${currentBlock.id}`;
      if (animatedMessageIds.has(contentMsgId)) {
        setCurrentAnimationComplete(true);
      }
    }
  }, [displayedBlockIndex, currentBlock, animatedMessageIds]);

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
    // Guard against rapid clicks using ref (synchronous check)
    if (!toolEmbedRef.current || isToolSavingRef.current) return;

    // Check validity before saving
    if (!toolEmbedRef.current.isValid()) {
      showToast('Please complete this section before continuing.', { type: 'error' });
      return;
    }

    // Set ref immediately to block further clicks
    isToolSavingRef.current = true;
    setIsToolSaving(true);
    try {
      await toolEmbedRef.current.save();
    } catch (error) {
      console.error('Error saving tool:', error);
      showToast('Failed to save. Please try again.', { type: 'error' });
    } finally {
      isToolSavingRef.current = false;
      setIsToolSaving(false);
    }
  }, [showToast]);

  // Handle tool completion - receives data from useToolSave
  // Updated: Now uses responseText from API instead of marker hack
  const handleToolComplete = useCallback(
    (data: { id: string; stemId?: number; responseText?: string; updated: boolean; newProgress?: number; nextBlock?: unknown | null; hasMore?: boolean }) => {
      if (!currentBlock || currentBlock.blockType !== 'tool') return;

      // Update block with actual response data (not marker)
      setBlocks((prev) =>
        prev.map((b) => (b.id === currentBlock.id ? { ...b, response: data.responseText || '' } : b))
      );

      // Increment connection data version to trigger refetch in dependent tools
      setConnectionDataVersion((v) => v + 1);

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

  // Handle editing a past tool response (all tools now use ToolEmbed in-place)
  const handleEditMessage = useCallback(
    (messageId: string) => {
      if (messageId.startsWith('tool-')) {
        const blockId = parseInt(messageId.replace('tool-', ''), 10);
        const block = blocks.find((b) => b.id === blockId);

        if (!block || block.blockType !== 'tool') return;

        // Tool will render in-place with initialData from block.response
        setEditingBlockId(blockId);
      }
    },
    [blocks]
  );

  // Check if window is scrolled to (or near) the bottom of the page
  const isScrolledToBottom = useCallback(() => {
    const threshold = 50; // pixels from bottom
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    return documentHeight - scrollTop - windowHeight < threshold;
  }, []);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    // Small delay to let the DOM update first
    const timer = setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [displayedBlockIndex]);

  // Global Enter key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { // code_id:387
      if (e.key !== 'Enter') return;

      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.tagName === 'SELECT';

      if (isInputFocused) return;

      // For content blocks - only continue if scrolled to bottom
      if (waitingForContinue && currentAnimationComplete && isScrolledToBottom()) {
        e.preventDefault();
        handleContinue();
        return;
      }

      // For tool blocks - validate before continuing (also requires scrolled to bottom)
      if (hasToolInput && !isToolSaving && isScrolledToBottom()) {
        e.preventDefault();
        handleToolContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [waitingForContinue, currentAnimationComplete, handleContinue, hasToolInput, isToolSaving, handleToolContinue, isScrolledToBottom]);

  // Click-to-continue handler (mobile/touch devices only)
  const handleContentAreaClick = useCallback(
    (e: React.MouseEvent) => {
      // Only allow click-to-continue on touch devices
      if (!('ontouchstart' in window)) return;

      if (!waitingForContinue || !currentAnimationComplete) return;

      const target = e.target as HTMLElement;
      // Exclude clicks on any interactive elements or inside forms
      if (
        target.closest('form') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[contenteditable]')
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
      case 'workbook':
        // Scroll to current block (input zone)
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        break;
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
  // BUG-449: Exclude Continue button when editing (in-place editing doesn't use input zone)
  const hasContinue = waitingForContinue && currentAnimationComplete && !editingBlockId;
  // Active input check (tool editing is now in-place, not in input zone)
  const hasActiveInput = hasToolInput || hasContinue;

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
      toolType: data.toolType,
      promptText: data.promptText,
      inputConfig: data.inputConfig,
    };

    // Always editable - changes auto-save
    // Pass connectionDataVersion as refreshTrigger so dependent tools refetch when Part A changes
    // Use separate connectionDataVersion to avoid scroll/focus issues caused by dataVersion
    return (
      <div className="workbook-completed-tool">
        <ToolEmbed
          tool={toolData}
          stemId={stemId}
          connectionId={data.connectionId}
          initialData={data.response}
          readOnly={false}
          refreshTrigger={connectionDataVersion}
          onComplete={() => {
            // When a completed tool saves via Continue, trigger refresh of dependent tools
            setConnectionDataVersion((v) => v + 1);
          }}
          onDataChange={() => {
            // When a completed tool auto-saves, only increment connectionDataVersion
            // This triggers Part B refresh without causing scroll/focus issues
            setConnectionDataVersion((v) => v + 1);
          }}
        />
      </div>
    );
  }, [connectionDataVersion]);

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
        onClick={handleContentAreaClick}
        data-tap-to-continue={hasContinue ? 'true' : 'false'}
      >
        <ConversationThread
          messages={messages}
          alwaysScrollToBottom={true}
          onEditMessage={handleEditMessage}
          animatedMessageIds={animatedMessageIds}
          onMessageAnimated={handleMessageAnimated}
          scrollTrigger={displayedBlockIndex}
          renderTool={renderTool}
          toolRefreshKey={connectionDataVersion}
        />

        <div ref={inputZoneRef}>
          <WorkbookInputZone hasActiveInput={hasActiveInput}>
            {/* All tools (textarea, text_input, structured, interactive) use ToolEmbed */}
            {/* Key forces remount when block changes, ensuring fresh data fetch */}
            {hasToolInput && currentBlock && (
              <>
                <ToolEmbed
                  key={`tool-${currentBlock.id}`}
                  ref={toolEmbedRef}
                  tool={currentBlock.content as ToolData}
                  stemId={currentBlock.id}
                  connectionId={currentBlock.connectionId}
                  refreshTrigger={connectionDataVersion}
                  onComplete={handleToolComplete}
                />
                <div className="workbook-tool-continue">
                  <button
                    type="button"
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
                  type="button"
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
