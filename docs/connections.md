# Connections System

Data flows through **domain tables**, never tool-to-tool.

```
Tool saves → user_responses → Domain Writer → Domain Table → Fetcher → Downstream Tool
```

## Key Files
- `src/lib/connections/resolver.ts` - Routes to data fetchers
- `src/lib/connections/data-fetchers.ts` - Extracts from domain tables
- `src/lib/domain-writers/index.ts` - Normalizes tool JSON to domain tables
- `src/hooks/useConnectionData.ts` - Client-side fetch hook

---

## Design Decisions

### 1. Key Strategy: `user_id + stem_id`
All domain writers should use `user_id + stem_id` as composite key for upsert.
- Enables re-saving without duplicates
- Tracks which stem instance produced the data

**Exception:** Skills use `user_id + skill_id` because skills are shared across stems.

### 2. No Delete-All Pattern
Never delete all records before inserting. Always upsert.

**TODO - Fix these:**
- `writeCareerOptions` (career_assessment) - currently deletes all
- `writeCompetencyScores` (competency_assessment) - currently deletes all

### 3. Use `useConnectionData` Hook
All wrappers should use the hook, not inline fetch.

```typescript
const { data, loading, refresh } = useConnectionData<T>({
  connectionId,
  readOnly,        // Skip fetch in history view
  refreshTrigger,  // Re-fetch when Part A saves
  mergeWithExisting, // Preserve WIP on refresh
});
```

### 4. Return Values
- Collections: Return `[]` when empty
- Singletons: Return `null` when missing
- Never `undefined`

---

## Connection Patterns

### Forward
One tool's output feeds another tool's input. No transformation.
```
SkillTagger → user_skills → SkillMasteryRater
```
Most common pattern. Data flows through domain table unchanged.

### Filtered
Apply filter param to narrow results from domain table.
```
user_skills + filter='top_10_by_mastery' → CareerAssessment
user_stories + filter='index_0' → First story only
```

**Filter types:**
- **Boolean:** `top_10_by_mastery` - applies sort+limit
- **Index:** `index_N` - returns item at position N (0-based)
- **Type:** `job`, `education` - filters by type column
- **Field:** `headline`, `summary` - extracts specific field from record

### Aggregation
Pull all items from domain table for batch processing.
```
user_skills (all) → BucketingTool (categorize into buckets)
```

### Reference
Read-only master data, not user data. Uses `connection_type: 'resource'`.
```
skills (is_custom=0) → SkillTagger palette
```

### Multi-Part (A→B Refresh)
Part A edits trigger Part B to refetch while preserving user's work-in-progress.

```typescript
const { data } = useConnectionData({
  connectionId,
  refreshTrigger,  // Increments when Part A saves
  mergeWithExisting: (freshData, existingData) => {
    // freshData = new fetch from domain table
    // existingData = user's current WIP in Part B
    // Return merged result that preserves their work
    return freshData.map(item => ({
      ...item,
      userSelections: existingData.find(e => e.id === item.id)?.userSelections
    }));
  }
});
```

Used by: SkillsPerStoryBuilder (stories refresh, skill selections preserved)

---

## Migration Backlog

### Module 1 - Inline fetch → useConnectionData
| Wrapper | Status |
|---------|--------|
| TasksPerExperienceBuilderWrapper | Done |
| SkillMasteryRaterWrapper | Done |
| SkillsPerStoryBuilderWrapper | Done |
| ExperienceBuilderWrapper | Done |
| BucketingToolWrapper | **TODO** |
| SkillTaggerWrapper | **TODO** |

### Domain Writers - Delete-all → Upsert
| Writer | Status |
|--------|--------|
| writeCareerOptions | **TODO** |
| writeCompetencyScores | **TODO** |

---

## Adding a Connection

1. **Domain Writer** - Add to `DOMAIN_WRITERS` map in `domain-writers/index.ts`
2. **Data Fetcher** - Add function to `data-fetchers.ts`
3. **Register Source** - Add case to `fetchDataSource()` in `resolver.ts`
4. **Add Type** - Update `DataSourceType` in `types.ts`
5. **DB Record** - Insert into `connections` table

---

## Domain Writers Reference

| Tool | Table | Key |
|------|-------|-----|
| soared_form | user_stories | stem_id |
| skill_tagger | user_skills | user_id + skill_id |
| skill_mastery_rater | user_skills | user_id + skill_id |
| experience_builder | user_experiences | id |
| tasks_per_experience | user_experience_skills | composite |
| flow_tracker | user_flow_logs | user_id + activity + date |
| life_dashboard | user_profile | user_id |
| mbti_selector | user_settings | user_id |
| budget_calculator | user_budget | user_id |
| career_assessment | user_career_options | **fix: delete-all** |
| competency_assessment | user_competency_scores | **fix: delete-all** |

**No domain writer** (data stays in user_responses only):
- list_builder, ranking_grid, idea_tree, failure_reframer, mindset_profiles, bucketing_tool, career_timeline

---

## Checklist

When adding/reviewing connections:
- [ ] Domain writer uses `user_id + stem_id` key (or appropriate composite)
- [ ] Fetcher returns `[]` for collections, `null` for singletons
- [ ] Wrapper uses `useConnectionData` hook
- [ ] Filter semantics documented if non-obvious
- [ ] Tested: save in source → data appears in target
