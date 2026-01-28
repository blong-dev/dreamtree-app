'use client';

/**
 * ToolEmbed - Dispatcher for tool wrapper components
 * IMP-002: Refactored from 600+ lines with 15 useState to simple dispatcher
 *
 * Each tool now manages its own state in a dedicated wrapper component.
 * This component just dispatches to the right wrapper.
 *
 * Schema consolidation: Now handles simple input types (former prompts)
 * via SimpleInputWrapper when tool.toolType is textarea, slider, etc.
 */

import { useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import type { ToolData, ToolType } from './types';
import { trackToolOpen, trackToolSubmit } from '@/lib/analytics';
import { ErrorBoundary } from '../feedback';
import {
  ListBuilderWrapper,
  SOAREDFormWrapper,
  SkillTaggerWrapper,
  RankingGridWrapper,
  FlowTrackerWrapper,
  LifeDashboardWrapper,
  FailureReframerWrapper,
  BucketingToolWrapper,
  MBTISelectorWrapper,
  BudgetCalculatorWrapper,
  IdeaTreeWrapper,
  MindsetProfilesWrapper,
  CareerTimelineWrapper,
  CareerAssessmentWrapper,
  CompetencyAssessmentWrapper,
  SimpleInputWrapper,
  ExperienceBuilderWrapper,
  TasksPerExperienceBuilderWrapper,
  SkillMasteryRaterWrapper,
  type ToolSaveResponse,
  type ToolWrapperRef,
} from './tool-wrappers';

// Simple input types from schema consolidation (former prompts)
const SIMPLE_INPUT_TYPES: Set<ToolType> = new Set([
  'textarea',
  'text_input',
  'slider',
  'checkbox',
  'checkbox_group',
  'radio',
  'select',
]);

interface ToolEmbedProps {
  tool: ToolData;
  /** The stem.id - unique identifier for this tool instance */
  stemId: number;
  connectionId: number | null;
  onComplete?: (data: ToolSaveResponse) => void;
  /** BUG-380: Pre-populated data for completed tools in history */
  initialData?: string;
  /** BUG-380: Read-only mode for completed tools in history */
  readOnly?: boolean;
}

/**
 * Ref handle exposed by ToolEmbed for parent control
 * Allows WorkbookView to trigger save without tools having their own Continue buttons
 */
export interface ToolEmbedRef {
  save: () => Promise<void>;
}

type ToolName =
  | 'list_builder'
  | 'soared_form'
  | 'skill_tagger'
  | 'ranking_grid'
  | 'flow_tracker'
  | 'life_dashboard'
  | 'failure_reframer'
  | 'bucketing_tool'
  | 'mbti_selector'
  | 'budget_calculator'
  | 'idea_tree'
  | 'mindset_profiles'
  | 'career_timeline'
  | 'career_assessment'
  | 'competency_assessment'
  | 'experience_builder'
  | 'tasks_per_experience_builder'
  | 'skill_mastery_rater';

export const ToolEmbed = forwardRef<ToolEmbedRef, ToolEmbedProps>(function ToolEmbed(
  { tool, stemId, connectionId, onComplete, initialData, readOnly = false },
  ref
) { // code_id:13
  const toolName = (tool.name || '').toLowerCase().replace(/-/g, '_') as ToolName;
  const wrapperRef = useRef<ToolWrapperRef>(null);

  // Expose save method to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      if (wrapperRef.current) {
        await wrapperRef.current.save();
      }
    }
  }), []);

  // Track tool open on mount (only for active tools, not read-only history)
  useEffect(() => {
    if (tool.id && !readOnly) {
      trackToolOpen(tool.id.toString());
    }
  }, [tool.id, readOnly]);

  // Wrap onComplete to track tool submission
  const handleComplete = useCallback((data: ToolSaveResponse) => {
    if (tool.id) {
      trackToolSubmit(tool.id.toString());
    }
    onComplete?.(data);
  }, [tool.id, onComplete]);

  // Guard: stemId is required for saving
  if (!stemId) {
    return (
      <div className="tool-embed">
        <div className="tool-embed-error-state">
          <p>Tool configuration error: missing stemId.</p>
        </div>
      </div>
    );
  }

  const commonProps = {
    ref: wrapperRef,
    stemId,
    connectionId,
    instructions: tool.instructions,
    onComplete: handleComplete,
    // BUG-380: Support read-only mode for completed tools in history
    initialData,
    readOnly,
  };

  const renderTool = () => { // code_id:383
    // Schema consolidation: Check for simple input types first
    const toolType = tool.toolType as ToolType | undefined;
    if (toolType && SIMPLE_INPUT_TYPES.has(toolType)) {
      return (
        <SimpleInputWrapper
          {...commonProps}
          toolType={toolType}
          promptText={tool.promptText}
          inputConfig={tool.inputConfig}
        />
      );
    }

    // Interactive tools: route by name
    switch (toolName) {
      case 'list_builder':
        return <ListBuilderWrapper {...commonProps} />;
      case 'soared_form':
        return <SOAREDFormWrapper {...commonProps} />;
      case 'skill_tagger':
        return <SkillTaggerWrapper {...commonProps} />;
      case 'ranking_grid':
        return <RankingGridWrapper {...commonProps} />;
      case 'flow_tracker':
        return <FlowTrackerWrapper {...commonProps} />;
      case 'life_dashboard':
        return <LifeDashboardWrapper {...commonProps} />;
      case 'failure_reframer':
        return <FailureReframerWrapper {...commonProps} />;
      case 'bucketing_tool':
        return <BucketingToolWrapper {...commonProps} />;
      case 'mbti_selector':
        return <MBTISelectorWrapper {...commonProps} />;
      case 'budget_calculator':
        return <BudgetCalculatorWrapper {...commonProps} />;
      case 'idea_tree':
        return <IdeaTreeWrapper {...commonProps} />;
      case 'mindset_profiles':
        return <MindsetProfilesWrapper {...commonProps} />;
      case 'career_timeline':
        return <CareerTimelineWrapper {...commonProps} />;
      case 'career_assessment':
        return <CareerAssessmentWrapper {...commonProps} />;
      case 'competency_assessment':
        return <CompetencyAssessmentWrapper {...commonProps} />;
      case 'experience_builder':
        return <ExperienceBuilderWrapper {...commonProps} />;
      case 'tasks_per_experience_builder':
        return <TasksPerExperienceBuilderWrapper {...commonProps} />;
      case 'skill_mastery_rater':
        return <SkillMasteryRaterWrapper {...commonProps} />;
      default:
        return (
          <div className="tool-embed-placeholder">
            <p>Tool interface for: {tool.name || 'Unknown Tool'}</p>
            <p className="tool-embed-note">This tool type is not yet implemented.</p>
          </div>
        );
    }
  };

  return (
    <div className="tool-embed">
      {tool.instructions && (
        <div className="tool-embed-instructions">
          <p>{tool.instructions}</p>
        </div>
      )}

      <div className="tool-embed-content">
        {/* IMP-023: Isolate tool crashes from killing the workbook */}
        <ErrorBoundary
          fallback={
            <div className="tool-embed-error-state">
              <p>This tool encountered an error.</p>
              <button
                className="button button-secondary"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          }
        >
          {renderTool()}
        </ErrorBoundary>
      </div>
    </div>
  );
});
