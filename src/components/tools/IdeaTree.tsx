'use client';

import { useState, useMemo } from 'react';
import { IdeaTreeData, getDefaultIdeaTreeData } from './types';
import { TextInput } from '../forms';

interface IdeaTreeProps {
  data: IdeaTreeData;
  onChange: (data: IdeaTreeData) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

type IdeaTreeStep =
  | { type: 'intro' }
  | { type: 'root' }
  | { type: 'layer1' }
  | { type: 'layer2'; branch: 'A' | 'B' | 'C' }
  | { type: 'layer3'; branch: 'A1' | 'A2' | 'A3' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3' }
  | { type: 'complete' };

const STEP_ORDER: IdeaTreeStep[] = [
  { type: 'intro' },
  { type: 'root' },
  { type: 'layer1' },
  { type: 'layer2', branch: 'A' },
  { type: 'layer2', branch: 'B' },
  { type: 'layer2', branch: 'C' },
  { type: 'layer3', branch: 'A1' },
  { type: 'layer3', branch: 'A2' },
  { type: 'layer3', branch: 'A3' },
  { type: 'layer3', branch: 'B1' },
  { type: 'layer3', branch: 'B2' },
  { type: 'layer3', branch: 'B3' },
  { type: 'layer3', branch: 'C1' },
  { type: 'layer3', branch: 'C2' },
  { type: 'layer3', branch: 'C3' },
  { type: 'complete' },
];

const emptyTriple: [string, string, string] = ['', '', ''];

function calculateCurrentStep(data: IdeaTreeData): number { // code_id:321
  if (data.isComplete) return STEP_ORDER.length - 1;
  if (!data.rootIdea) return 1; // root step
  if (data.layer1.some((v) => !v)) return 2; // layer1 step
  if (data.layer2A.some((v) => !v)) return 3;
  if (data.layer2B.some((v) => !v)) return 4;
  if (data.layer2C.some((v) => !v)) return 5;
  if (data.layer3A1.some((v) => !v)) return 6;
  if (data.layer3A2.some((v) => !v)) return 7;
  if (data.layer3A3.some((v) => !v)) return 8;
  if (data.layer3B1.some((v) => !v)) return 9;
  if (data.layer3B2.some((v) => !v)) return 10;
  if (data.layer3B3.some((v) => !v)) return 11;
  if (data.layer3C1.some((v) => !v)) return 12;
  if (data.layer3C2.some((v) => !v)) return 13;
  if (data.layer3C3.some((v) => !v)) return 14;
  return 15; // complete
}

export function IdeaTree({
  data,
  onChange,
  disabled = false,
  readOnly = false,
}: IdeaTreeProps) { // code_id:85
  const [localInputs, setLocalInputs] = useState<[string, string, string]>([...emptyTriple]);
  const [rootInput, setRootInput] = useState(data.rootIdea || '');

  const currentStepIndex = useMemo(() => calculateCurrentStep(data), [data]);
  const currentStep = STEP_ORDER[currentStepIndex];

  const getPromptWord = (): string => {
    switch (currentStep.type) { // code_id:318
      case 'intro':
        return '';
      case 'root':
        return 'What topic are we thinking about?';
      case 'layer1':
        return data.rootIdea;
      case 'layer2': {
        const idx = { A: 0, B: 1, C: 2 }[currentStep.branch];
        return data.layer1[idx];
      }
      case 'layer3': {
        const branch = currentStep.branch[0] as 'A' | 'B' | 'C';
        const idx = parseInt(currentStep.branch[1]) - 1;
        const layer2Key = `layer2${branch}` as keyof IdeaTreeData;
        return (data[layer2Key] as [string, string, string])[idx];
      }
      case 'complete':
        return '';
    }
  };

  const handleContinue = () => { // code_id:319
    if (disabled || readOnly) return;

    if (currentStep.type === 'intro') {
      // Just move to next step, no data to save
      return;
    }

    if (currentStep.type === 'root') {
      if (rootInput.trim()) {
        onChange({ ...data, rootIdea: rootInput.trim() });
        setLocalInputs([...emptyTriple]);
      }
      return;
    }

    if (currentStep.type === 'layer1') {
      if (localInputs.every((v) => v.trim())) {
        onChange({
          ...data,
          layer1: localInputs.map((v) => v.trim()) as [string, string, string],
        });
        setLocalInputs([...emptyTriple]);
      }
      return;
    }

    if (currentStep.type === 'layer2') {
      if (localInputs.every((v) => v.trim())) {
        const key = `layer2${currentStep.branch}` as keyof IdeaTreeData;
        onChange({
          ...data,
          [key]: localInputs.map((v) => v.trim()) as [string, string, string],
        });
        setLocalInputs([...emptyTriple]);
      }
      return;
    }

    if (currentStep.type === 'layer3') {
      if (localInputs.every((v) => v.trim())) {
        const key = `layer3${currentStep.branch}` as keyof IdeaTreeData;
        const isLastStep = currentStepIndex === STEP_ORDER.length - 2;
        onChange({
          ...data,
          [key]: localInputs.map((v) => v.trim()) as [string, string, string],
          isComplete: isLastStep,
        });
        setLocalInputs([...emptyTriple]);
      }
    }
  };

  const handleStartNew = () => { // code_id:320
    onChange(getDefaultIdeaTreeData());
    setRootInput('');
    setLocalInputs([...emptyTriple]);
  };

  const allInputsFilled =
    currentStep.type === 'root'
      ? rootInput.trim().length > 0
      : localInputs.every((v) => v.trim());

  // Intro screen
  if (currentStep.type === 'intro') {
    return (
      <div className="idea-tree idea-tree-intro">
        <h2 className="idea-tree-title">Idea Tree</h2>
        <p className="idea-tree-intro-text">
          This is a word association game. You will start with one topic and
          branch out into 40 connected ideas. The tree will be revealed when
          you are done.
        </p>
        <p className="idea-tree-intro-text">
          Think fast and go with your gut. There are no wrong answers.
        </p>
        <button
          type="button"
          className="idea-tree-button idea-tree-button-primary"
          onClick={() => onChange({ ...data })}
          disabled={disabled}
        >
          Start
        </button>
      </div>
    );
  }

  // Complete screen with tree visualization
  if (currentStep.type === 'complete' || data.isComplete) {
    return (
      <div className="idea-tree idea-tree-complete">
        <h2 className="idea-tree-title">Your Idea Tree</h2>
        <p className="idea-tree-count">40 ideas generated from 1 root</p>

        <div className="idea-tree-visualization">
          <div className="idea-tree-node idea-tree-root">{data.rootIdea}</div>

          <div className="idea-tree-layer idea-tree-layer1">
            {data.layer1.map((idea, i) => (
              <div key={i} className="idea-tree-branch">
                <div className="idea-tree-node">{idea}</div>
                <div className="idea-tree-sublayer">
                  {(data[`layer2${'ABC'[i]}` as keyof IdeaTreeData] as string[]).map(
                    (subIdea, j) => (
                      <div key={j} className="idea-tree-subbranch">
                        <div className="idea-tree-node idea-tree-node-small">
                          {subIdea}
                        </div>
                        <div className="idea-tree-leaves">
                          {(
                            data[
                              `layer3${'ABC'[i]}${j + 1}` as keyof IdeaTreeData
                            ] as string[]
                          ).map((leaf, k) => (
                            <span key={k} className="idea-tree-leaf">
                              {leaf}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="idea-tree-actions">
          <button
            type="button"
            className="idea-tree-button idea-tree-button-secondary"
            onClick={handleStartNew}
            disabled={disabled || readOnly}
          >
            Start New Tree
          </button>
        </div>
      </div>
    );
  }

  // Entry screen
  return (
    <div className="idea-tree idea-tree-entry">
      <p className="idea-tree-prompt-label">
        What comes to mind when you think of...
      </p>

      <h2 className="idea-tree-prompt-word">{getPromptWord()}</h2>

      {currentStep.type === 'root' ? (
        <div className="idea-tree-inputs">
          <TextInput
            value={rootInput}
            onChange={setRootInput}
            placeholder="Enter your topic..."
            disabled={disabled || readOnly}
          />
        </div>
      ) : (
        <div className="idea-tree-inputs">
          {[0, 1, 2].map((i) => (
            <div key={i} className="idea-tree-input-row">
              <span className="idea-tree-input-number">{i + 1}.</span>
              <TextInput
                value={localInputs[i]}
                onChange={(v) => {
                  const newInputs = [...localInputs] as [string, string, string];
                  newInputs[i] = v;
                  setLocalInputs(newInputs);
                }}
                placeholder="Type an idea..."
                disabled={disabled || readOnly}
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="idea-tree-button idea-tree-button-primary"
        onClick={handleContinue}
        disabled={!allInputsFilled || disabled || readOnly}
      >
        Continue
      </button>

      <p className="idea-tree-step-indicator">
        Step {currentStepIndex} of 14
      </p>
    </div>
  );
}
