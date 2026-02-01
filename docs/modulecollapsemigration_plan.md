# Collapsible Modules with Module-Level Virtualization

## Problem

User overwhelm from scrolling through entire workbook. Need orientation and memory efficiency while preserving edit-anything functionality.

## Solution

Completed modules collapse to summary cards. Blocks are **unmounted** (not CSS hidden), giving module-level virtualization. Only current + user-expanded modules render their content.

---

## Interaction Model

| State | What Renders | Trigger |
|-------|--------------|---------|
| **Current module** | Full content | Always expanded |
| **Completed (collapsed)** | Summary card only | Default state |
| **Completed (picker)** | Card + exercise list | Click collapsed card |
| **Completed (expanded)** | Full content at exercise | Click exercise in picker |
| **Expanded → collapsed** | Back to card | Scrolls fully out of view |
| **Scroll back up** | Card | Must click to expand |

**Key behaviors:**
- Collapsed = blocks unmounted for memory savings
- Click card → shows exercise picker (still collapsed)
- Click exercise → module expands, renders at that exercise
- IntersectionObserver detects scroll-away → auto-collapse
- Click outside picker → dismisses back to card
- Current module never auto-collapses

---

## Implementation

### Phase 1: Types & Grouping

**`src/components/workbook/types.ts`** - Add:
```typescript
export interface ModuleSummary {
  skillsCount: number;
  storiesCount: number;
  valuesCount: number;
  experiencesCount: number;
}

export interface ModuleGroup {
  moduleId: string;        // "1.1", "1.2"
  moduleTitle: string;     // "Skills Discovery"
  blocks: BlockWithResponse[];
  isComplete: boolean;
  isCurrent: boolean;
  summary: ModuleSummary;
}
```

**`src/components/workbook/WorkbookView.tsx`** - Add utilities:
- `getModuleId(exerciseId)` - extracts "1.2" from "1.2.3"
- `groupBlocksByModule(blocks)` - returns `ModuleGroup[]`
- `getModuleSummary(blocks)` - counts from response data

---

### Phase 2: New Components

**`src/components/workbook/ModuleSummaryCard.tsx`**
- Shows "Module 1.2: [Title]"
- Brief summary: "5 skills identified, 3 stories written"
- Click → opens exercise picker

**`src/components/workbook/ModuleExercisePicker.tsx`**
- List of exercises in module (like TOC drill-down)
- Click exercise → module expands at that exercise
- Click outside → dismisses

**`src/components/workbook/ModuleSection.tsx`**
- Orchestrates collapsed/picker/expanded states
- Uses IntersectionObserver for scroll-away detection
- Calls `onScrollAway` when fully out of viewport

---

### Phase 3: WorkbookView Integration

**`src/components/workbook/WorkbookView.tsx`**

1. Add state: `expandedModules: Set<string>`
2. Use `useMemo` to compute `moduleGroups` from `blocks`
3. Replace flat ConversationThread with grouped ModuleSection rendering
4. Current module always in expanded state
5. Handle `onScrollAway` → remove from `expandedModules`
6. Handle exercise click → add to `expandedModules`, scroll to exercise

---

### Phase 4: Styling

**`src/app/globals.css`**
- `.module-section` - container
- `.module-summary-card` - collapsed card appearance
- `.module-exercise-picker` - dropdown list styling
- Follow TOCModule patterns for transitions

---

## Summary Counting

Count from loaded blocks (no API needed):

| Tool | Count Field |
|------|-------------|
| `skill_tagger` | `selectedSkillIds.length` |
| `skill_mastery_rater` | `skills.length` |
| `soared_form` | 1 per submission |
| `experience_builder` | `experiences.length` |
| `flow_tracker` | `entries.length` |

---

## Module Title Source

Extract from first heading block (`content_type = 'heading'`, `activity = 0`) in each module - same pattern as `src/app/page.tsx` TOC.

---

## Files

**Modify:**
1. `src/components/workbook/types.ts`
2. `src/components/workbook/WorkbookView.tsx`
3. `src/app/globals.css`

**Create:**
4. `src/components/workbook/ModuleSummaryCard.tsx`
5. `src/components/workbook/ModuleExercisePicker.tsx`
6. `src/components/workbook/ModuleSection.tsx`

---

## Verification

1. Completed modules show as collapsed summary cards
2. Current module is expanded
3. Click collapsed card → shows exercise picker
4. Click exercise → module expands, renders at that exercise
5. Click outside picker → dismisses
6. Scroll past expanded module → collapses
7. Scroll back up → shows card (no auto-expand)
8. DOM inspection: only current + expanded modules have blocks
9. Edit/save functionality still works
