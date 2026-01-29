# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DreamTree is a career development workbook application built with Next.js 15 and deployed on Cloudflare Workers. Users complete guided exercises to discover their professional path through skills assessment, values exploration, and interactive tools. The app emphasizes privacy-first design and data ownership via AT Protocol (Bluesky) integration.

## When Debugging or Fixing Issues

- Stop and understand before writing code. Ask the user what they're experiencing - what they clicked, what happened, what they expected.
- Read the relevant code and trace through the actual execution path before proposing solutions.
- If a fix doesn't work, don't layer another patch on top. Step back, reassess, and make sure you understand the real problem.
- When the user suggests a different approach, take it seriously - they understand their codebase and the problem better than your assumptions.
- Adding code is not progress. Engineering efficient machines is progress.

## Code Integrity - Non-Negotiable

- **Every line has dependencies.** Before modifying or deleting ANY code, understand what depends on it. Trace imports, usages, and side effects.
- **Never delete without checking.** Run `git diff` before any checkout/restore. Search the codebase for usages before removing functions, classes, or files.
- **No patchwork.** This is a robust, clean, secure application. Quick fixes that don't address root causes are not acceptable. If you don't understand the problem, keep investigating until you do.
- **Respect uncommitted work.** Working directory changes are NOT recoverable once discarded. Always verify what exists before running destructive git commands.

## Commands

```bash
npm run dev              # Start local dev server (Next.js)
npm run build            # Build for Next.js
npm run build:pages      # Build for Cloudflare Workers (OpenNext adapter)
npm run deploy           # Build and deploy to production
npm run deploy:staging   # Build and deploy to staging

npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run tests with coverage
# Run single test file:
npx vitest run src/components/conversation/MessageContent.test.tsx

npm run lint             # ESLint

npm run db:seed          # Seed local SQLite database
npm run db:reset         # Delete and reseed local database
npm run db:sync          # Sync from remote D1
```

## Architecture

### Data Flow
1. User input captured in workbook tool components
2. Saved via `/api/workbook/response` → `user_responses` table (raw JSON)
3. Domain writers (`src/lib/domain-writers/`) normalize data to domain tables (user_skills, user_stories, etc.)
4. Connections system (`src/lib/connections/`) pre-populates downstream tools from domain tables

### Database
- **Production**: Cloudflare D1 (SQLite)
- **Local dev**: better-sqlite3 with D1-compatible adapter
- `getDB()` from `src/lib/db/connection.ts` auto-switches between environments
- `createDb(rawDB)` wraps with typed query methods
- Set `USE_LOCAL_DB=true` in `.env.local` for local development

### Authentication
- Session-based auth with `dt_session` cookie
- All protected API routes use `withAuth()` wrapper from `src/lib/auth/with-auth.ts`
- Middleware (`src/middleware.ts`) guards routes before page load
- Admin routes (`/admin`, `/ops`) return 404 for non-admins (security by obscurity)
- PII encryption for sensitive tool data (budget, contacts)

### Workbook Architecture
The workbook is a single-page app at `/workbook` with hash navigation. It renders blocks 1..N+1 (completed + current). Content comes from the `stem` table which references either `content_blocks` or `tools`.

### Content Schema
- `stem` table: ordered sequence of blocks (part.module.exercise.activity.sequence)
- `block_type`: 'content' | 'tool'
- `content_blocks`: static text (heading, instruction, note, quote, transition, celebration)
- `tools`: interactive components (tool_type: 'interactive' | 'text_input' | 'textarea' | etc.)

## Key Patterns

### API Route Pattern
```typescript
import { withAuth } from '@/lib/auth';

export const POST = withAuth(async (request, { userId, db, userRole, session, env }) => {
  // Handler has validated session, userId, and db ready to use
  return NextResponse.json({ success: true });
});
```

### Environment Detection
- Production: `hostname === 'dreamtree.org'`
- Coming-soon routes (`/workbook`, `/tools`) redirect on production, work on staging

### Testing
Uses Vitest with React Testing Library. Tests located alongside components (`.test.tsx` files).

## Known Gotchas

### Rapid Animation Skipping (BUG-460)
When users skip animations rapidly (holding Enter), `displayedBlockIndex` can exceed `blocks.length` due to async state updates in the fetch-and-advance cycle. Fix:
1. Use `effectiveDisplayIndex = Math.min(displayedBlockIndex, blocks.length)` for currentBlock lookup
2. Add corrective useEffect that syncs displayedBlockIndex back to bounds if it overshoots

### Connection Data Caching
When fetching data from connections for tool pre-population, add cache-busting (`?_t=${Date.now()}`) and `cache: 'no-store'` to ensure fresh data after previous tool saves.


## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes (use withAuth for protection)
│   ├── workbook/       # Main SPA workbook
│   └── (auth)/         # Login/signup pages
├── components/
│   ├── workbook/       # Workbook blocks, input zones, tool wrappers
│   ├── tools/          # Interactive tool components
│   └── conversation/   # Message threading, typing effects
├── lib/
│   ├── db/             # Database client and connection
│   ├── auth/           # Auth utilities (withAuth, session, PII encryption)
│   ├── domain-writers/ # Normalize tool responses to domain tables
│   ├── connections/    # Pre-fill tools from previous responses
│   └── analytics/      # Privacy-first event tracking (metadata only)
└── types/
    └── database.ts     # TypeScript types for all tables
```
