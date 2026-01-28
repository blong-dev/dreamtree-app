/**
 * Database Connection
 *
 * Auto-switches between local SQLite (dev) and Cloudflare D1 (production).
 *
 * Usage:
 *   import { getDB, getEnv } from '@/lib/db/connection';
 *   const db = getDB();
 *   const loopsKey = getEnv('LOOPS_API_KEY');
 *
 * Environment:
 *   - Local dev (USE_LOCAL_DB=true): Uses better-sqlite3, process.env for vars
 *   - Cloudflare Workers: Uses D1 via getCloudflareContext()
 */

import type { D1Database } from '@cloudflare/workers-types';
import { createLocalD1, isLocalEnvironment } from './local-adapter';

let cachedLocalDB: D1Database | null = null;

/**
 * Get the database connection.
 * Automatically uses local SQLite in dev, D1 in production.
 */
export function getDB(): D1Database { // code_id:925
  // Check for local environment first
  if (isLocalEnvironment()) {
    if (!cachedLocalDB) {
      cachedLocalDB = createLocalD1();
    }
    return cachedLocalDB;
  }

  // Production: use Cloudflare D1
  // Dynamic import to avoid issues when better-sqlite3 isn't available
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getCloudflareContext } = require('@opennextjs/cloudflare');
  const { env } = getCloudflareContext();
  return env.DB;
}

/**
 * Get an environment variable.
 * Uses process.env in local dev, Cloudflare env in production.
 */
export function getEnv(key: string): string | undefined {
  if (isLocalEnvironment()) { // code_id:926
    return process.env[key];
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getCloudflareContext } = require('@opennextjs/cloudflare');
  const { env } = getCloudflareContext();
  return env[key];
}

/**
 * Get the full Cloudflare environment (for backward compatibility).
 * In local dev, returns an object with DB and process.env values.
 */
export function getFullEnv(): { DB: D1Database; [key: string]: unknown } {
  if (isLocalEnvironment()) { // code_id:927
    return {
      DB: getDB(),
      ...process.env,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getCloudflareContext } = require('@opennextjs/cloudflare');
  const { env } = getCloudflareContext();
  return env;
}
