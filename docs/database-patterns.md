# Database Optimization Patterns for D1/SQLite

This document captures the optimization patterns implemented in our domain writers and data fetchers. These patterns are specifically designed for Cloudflare D1 (SQLite) constraints.

## Why These Patterns Matter

D1 has specific characteristics that make these optimizations important:

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **Single writer lock** | Only one write at a time; concurrent writes queue | Batch writes, debounce non-critical updates |
| **Round-trip latency** | ~50-100ms per query from edge to D1 | Reduce query count with JOINs and batching |
| **No stored procedures** | Can't run logic server-side | Pre-fetch data, compute in JS, batch results |
| **Transaction limits** | `db.batch()` is atomic but has size limits | Keep batches reasonable (<100 statements) |

---

## Pattern 1: Session Query Consolidation

**File:** `src/lib/auth/session.ts`

### Problem
Session validation ran 3 sequential queries on every authenticated request:
1. Fetch session
2. Fetch user
3. Fetch settings

Plus a `last_seen_at` UPDATE on every request causing write lock contention.

### Solution
Single JOIN query + debounced writes.

```typescript
// ONE query instead of three
const result = await db
  .prepare(`
    SELECT
      s.id as session_id, s.user_id, s.created_at as session_created,
      s.last_seen_at, s.data_key,
      u.is_anonymous, u.workbook_complete, u.user_role,
      u.marketing_consent, u.consent_given_at,
      u.created_at as user_created, u.updated_at as user_updated,
      us.background_color, us.text_color, us.font, us.text_size,
      us.personality_type, us.created_at as settings_created,
      us.updated_at as settings_updated
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    JOIN user_settings us ON u.id = us.user_id
    WHERE s.id = ?
  `)
  .bind(sessionId)
  .first<JoinedSessionRow>();

// Debounced last_seen_at update (fire-and-forget, only if >5 min stale)
maybeUpdateLastSeen(db, sessionId, result.last_seen_at);
```

### Debounce Implementation
```typescript
const LAST_SEEN_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function maybeUpdateLastSeen(db: D1Database, sessionId: string, lastSeenAt: string): void {
  const lastSeenTime = new Date(lastSeenAt).getTime();
  const now = Date.now();

  // Only update if more than 5 minutes stale
  if (now - lastSeenTime < LAST_SEEN_THRESHOLD_MS) {
    return; // Skip the write entirely
  }

  // Fire-and-forget - don't await, don't block the response
  db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), sessionId)
    .run()
    .catch(() => {}); // Silent fail - not critical
}
```

### Impact
- **Before:** 3 queries + 1 write per request
- **After:** 1 query + 0-1 writes (debounced)

---

## Pattern 2: Batch Upserts

**File:** `src/lib/domain-writers/index.ts` → `writeSkills()`

### Problem
Skill tagger saves N skills. Naive approach: N queries to fetch categories + N upserts = 2N round trips.

### Solution
Pre-fetch all categories in one query, batch all upserts.

```typescript
async function writeSkills(db: D1Database, userId: string, _stemId: number, data: unknown): Promise<void> {
  const { selectedSkillIds } = data as SkillTaggerData;
  if (selectedSkillIds.length === 0) return;

  const now = new Date().toISOString();

  // 1. Fetch all skill categories in ONE query
  const placeholders = selectedSkillIds.map(() => '?').join(',');
  const skillsResult = await db
    .prepare(`SELECT id, category FROM skills WHERE id IN (${placeholders})`)
    .bind(...selectedSkillIds)
    .all<{ id: string; category: string | null }>();

  const skillMap = new Map(
    (skillsResult.results || []).map(s => [s.id, s.category])
  );

  // 2. Build batch statements for all upserts
  const statements = selectedSkillIds.map((skillId, i) =>
    db.prepare(`
      INSERT INTO user_skills (id, user_id, skill_id, category, rank, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, skill_id) DO UPDATE SET
        rank = excluded.rank,
        updated_at = excluded.updated_at
    `).bind(nanoid(), userId, skillId, skillMap.get(skillId) || 'transferable', i + 1, now, now)
  );

  // 3. Execute atomically (1 round-trip)
  await db.batch(statements);
}
```

### Impact
- **Before:** 2N queries (N category lookups + N upserts)
- **After:** 2 queries (1 bulk fetch + 1 batch)

---

## Pattern 3: Atomic Replace

**File:** `src/lib/domain-writers/index.ts` → `writeCareerOptions()`

### Problem
Career assessment is a snapshot - need to replace all existing options with new ones. DELETE then INSERT risks partial state if INSERT fails.

### Solution
DELETE + all INSERTs in single atomic batch.

```typescript
async function writeCareerOptions(db: D1Database, userId: string, _stemId: number, data: unknown): Promise<void> {
  const { options } = data as CareerAssessmentData;
  const now = new Date().toISOString();

  // DELETE + all INSERTs in single atomic batch
  // If any INSERT fails, DELETE rolls back too
  const statements = [
    db.prepare('DELETE FROM user_career_options WHERE user_id = ?').bind(userId),
    ...options.map((opt, i) =>
      db.prepare(`
        INSERT INTO user_career_options
        (id, user_id, title, description, rank, coherence_score, work_needs_score, life_needs_score, unknowns_score, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        opt.id || nanoid(),
        userId,
        opt.title,
        opt.description || null,
        opt.rank ?? (i + 1),
        opt.coherenceScore ?? null,
        opt.workNeedsScore ?? null,
        opt.lifeNeedsScore ?? null,
        opt.unknownsScore ?? null,
        now,
        now
      )
    )
  ];

  await db.batch(statements);
}
```

### Why This Works
`db.batch()` executes all statements in a single transaction. If any statement fails, the entire batch rolls back - user never sees partial data.

### Impact
- **Before:** 1 DELETE + N INSERTs = N+1 queries, non-atomic
- **After:** 1 batch call, fully atomic

---

## Pattern 4: Pre-fetch for Conditional Logic

**File:** `src/lib/domain-writers/index.ts` → `writeFlowEntries()`

### Problem
Flow tracker has entries that may be new or updates. Naive approach: check existence for each entry individually.

### Solution
Pre-fetch all existing entries, build conditional statements in JS, batch execute.

```typescript
async function writeFlowEntries(db: D1Database, userId: string, _stemId: number, data: unknown): Promise<void> {
  const { entries } = data as FlowTrackerData;
  if (entries.length === 0) return;

  const now = new Date().toISOString();

  // 1. Pre-fetch all existing entries for this user
  const existingResult = await db
    .prepare('SELECT id, activity, logged_date FROM user_flow_logs WHERE user_id = ?')
    .bind(userId)
    .all<{ id: string; activity: string; logged_date: string }>();

  // Build lookup map: "activity|date" -> id
  const existingMap = new Map<string, string>();
  for (const row of existingResult.results || []) {
    existingMap.set(`${row.activity}|${row.logged_date}`, row.id);
  }

  // 2. Build batch statements (UPDATE for existing, INSERT for new)
  const statements = entries.map(entry => {
    const key = `${entry.activity}|${entry.date}`;
    const existingId = existingMap.get(key);

    if (existingId) {
      // Update existing entry
      return db
        .prepare('UPDATE user_flow_logs SET energy = ?, focus = ? WHERE id = ?')
        .bind(entry.energy, entry.focus, existingId);
    } else {
      // Insert new entry
      return db
        .prepare(`
          INSERT INTO user_flow_logs (id, user_id, activity, energy, focus, logged_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(entry.id || nanoid(), userId, entry.activity, entry.energy, entry.focus, entry.date, now);
    }
  });

  // 3. Execute atomically
  await db.batch(statements);
}
```

### When to Use This vs ON CONFLICT
- Use `ON CONFLICT` when you have a unique constraint and simple upsert logic
- Use pre-fetch when:
  - Natural key spans multiple columns (no easy unique constraint)
  - Update logic differs significantly from insert logic
  - You need the existing IDs for other operations

---

## Pattern 5: Complex Operations with Cleanup

**File:** `src/lib/domain-writers/index.ts` → `writeTasksPerExperience()`

### Problem
Tasks per experience involves:
1. Creating custom skills if they don't exist
2. Creating junction table entries
3. Deleting removed tasks
4. Cleaning up orphaned skills

### Solution
Multi-phase approach: bulk pre-fetch, batch main operations, then cleanup.

```typescript
async function writeTasksPerExperience(db: D1Database, userId: string, _stemId: number, data: unknown): Promise<void> {
  const { experiencesWithTasks } = data as TasksPerExperienceData;
  if (experiencesWithTasks.length === 0) return;

  const now = new Date().toISOString();
  const experienceIds = experiencesWithTasks.map(e => e.experience.id);

  // Phase 1: Pre-fetch ALL existing data in bulk queries
  const expPlaceholders = experienceIds.map(() => '?').join(',');

  // 1a. Get all existing experience-skill junctions for these experiences
  const existingJunctionsResult = await db
    .prepare(`
      SELECT ues.id as junction_id, ues.experience_id, ues.skill_id, s.name
      FROM user_experience_skills ues
      JOIN skills s ON ues.skill_id = s.id
      WHERE ues.experience_id IN (${expPlaceholders}) AND s.created_by = ?
    `)
    .bind(...experienceIds, userId)
    .all<{ junction_id: string; experience_id: string; skill_id: string; name: string }>();

  // 1b. Get all custom skills created by this user (for reuse across experiences)
  const userSkillsResult = await db
    .prepare('SELECT id, name FROM skills WHERE created_by = ?')
    .bind(userId)
    .all<{ id: string; name: string }>();

  // Build lookup structures...
  // (See full implementation for Map building)

  // Phase 2: Build all batch statements in memory (no queries)
  const statements: ReturnType<D1Database['prepare']>[] = [];
  const skillIdsToCheck = new Set<string>();

  for (const expWithTasks of experiencesWithTasks) {
    // Build DELETE statements for removed tasks
    // Build INSERT statements for new skills
    // Build INSERT statements for new junctions
    // Track skill IDs that might be orphaned
  }

  // Phase 3: Execute main batch
  if (statements.length > 0) {
    await db.batch(statements);
  }

  // Phase 4: Clean up orphaned skills (must be after main batch)
  if (skillIdsToCheck.size > 0) {
    // Find skills with zero remaining junctions
    const orphanedResult = await db
      .prepare(`
        SELECT s.id FROM skills s
        LEFT JOIN user_experience_skills ues ON s.id = ues.skill_id
        WHERE s.id IN (${skillPlaceholders}) AND ues.id IS NULL
      `)
      .bind(...skillIds)
      .all<{ id: string }>();

    // Batch delete orphaned skills
    if (orphanedSkillIds.length > 0) {
      await db.batch(cleanupStatements);
    }
  }
}
```

### Key Insight
Cleanup queries must run AFTER the main batch because they depend on post-deletion state. This is one case where multiple batches are necessary.

---

## Pattern 6: JOIN-based Fetching

**File:** `src/lib/connections/data-fetchers.ts` → `fetchUserLists()`

### Problem
Fetching lists with items: naive approach queries lists, then loops to query items for each list. N+1 query problem.

### Solution
Single JOIN query, group results in JavaScript.

```typescript
export async function fetchUserLists(
  db: D1Database,
  userId: string,
  listType?: string
): Promise<Array<{ id: string; name: string; type: string; items: Array<{ id: string; content: string; rank: number }> }>> {

  // Single query with JOIN to fetch all lists and items
  const query = `
    SELECT
      l.id as list_id, l.name, l.list_type, l.created_at,
      i.id as item_id, i.content, i.rank
    FROM user_lists l
    LEFT JOIN user_list_items i ON l.id = i.list_id
    WHERE l.user_id = ?
    ORDER BY l.created_at ASC, i.rank ASC
  `;

  const result = await db.prepare(query).bind(userId).all<{
    list_id: string;
    name: string;
    list_type: string;
    item_id: string | null;
    content: string | null;
    rank: number | null;
  }>();

  // Group results by list in JavaScript
  const listMap = new Map<string, { id: string; name: string; type: string; items: Array<...> }>();

  for (const row of result.results || []) {
    if (!listMap.has(row.list_id)) {
      listMap.set(row.list_id, {
        id: row.list_id,
        name: row.name,
        type: row.list_type,
        items: [],
      });
    }

    // Add item if it exists (LEFT JOIN may produce null items for empty lists)
    if (row.item_id) {
      listMap.get(row.list_id)!.items.push({
        id: row.item_id,
        content: row.content!,
        rank: row.rank!,
      });
    }
  }

  return Array.from(listMap.values());
}
```

### Why LEFT JOIN
Empty lists (no items) should still appear in results. `LEFT JOIN` ensures parent rows appear even with no matching children.

### Impact
- **Before:** 1 + N queries (1 for lists, N for items)
- **After:** 1 query

---

## Quick Reference: When to Use Each Pattern

| Scenario | Pattern | Example |
|----------|---------|---------|
| Multiple related tables on read | JOIN consolidation | Session + User + Settings |
| High-frequency non-critical updates | Debounce | last_seen_at |
| Save N items with lookups | Batch upsert | Skill tagger |
| Replace all items (snapshot) | Atomic replace | Career options |
| Mixed inserts/updates | Pre-fetch + conditional batch | Flow entries |
| Parent-child relationships | JOIN + JS grouping | Lists with items |
| Complex multi-table writes | Multi-phase batch | Tasks per experience |

---

## Anti-Patterns to Avoid

1. **Loop queries** - Never `for (item of items) { await db.query() }`
2. **Unbatched writes** - Always use `db.batch()` for multiple writes
3. **Blocking non-critical updates** - Debounce or fire-and-forget
4. **Sequential independent queries** - Use `Promise.all()` for reads
5. **Over-fetching** - Only SELECT columns you need
