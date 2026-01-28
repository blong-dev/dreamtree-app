/**
 * Local SQLite Adapter for Development
 *
 * Wraps better-sqlite3 to match Cloudflare D1's async API.
 * This allows the same code to work locally and in production.
 */

import type { D1Database, D1PreparedStatement, D1Result } from '@cloudflare/workers-types';

// Only import better-sqlite3 in Node.js environment
let Database: typeof import('better-sqlite3') | null = null;
let dbInstance: import('better-sqlite3').Database | null = null;

function getLocalDatabase(): import('better-sqlite3').Database { // code_id:930
  if (dbInstance) return dbInstance;

  // Dynamic import to avoid bundling in Cloudflare
  if (!Database) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Database = require('better-sqlite3');
  }

  const dbPath = process.env.LOCAL_DB_PATH || './data/dreamtree.db';
  dbInstance = new Database!(dbPath);

  // Enable foreign keys
  dbInstance.pragma('foreign_keys = ON');

  return dbInstance;
}

/**
 * Creates a D1-compatible prepared statement wrapper around better-sqlite3
 *
 * Note: Uses type assertions where needed since we're mimicking D1's API
 * for local development only.
 */
function createPreparedStatement(
  db: import('better-sqlite3').Database,
  sql: string
): D1PreparedStatement { // code_id:931
  let boundArgs: unknown[] = [];

  // Use a partial implementation with type assertion at the end
  const statement = {
    bind(...args: unknown[]) {
      boundArgs = args;
      return statement;
    },

    async first<T = unknown>(colName?: string): Promise<T | null> {
      const stmt = db.prepare(sql);
      const row = stmt.get(...boundArgs) as Record<string, unknown> | undefined;
      if (!row) return null;
      if (colName) return row[colName] as T;
      return row as T;
    },

    async all<T = unknown>(): Promise<D1Result<T>> {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...boundArgs) as T[];
      return {
        results: rows,
        success: true,
        meta: {
          duration: 0,
          changes: 0,
          last_row_id: 0,
          changed_db: false,
          size_after: 0,
          rows_read: rows.length,
          rows_written: 0,
        },
      };
    },

    async run(): Promise<D1Result<unknown>> {
      const stmt = db.prepare(sql);
      const result = stmt.run(...boundArgs);
      return {
        results: [],
        success: true,
        meta: {
          duration: 0,
          changes: result.changes,
          last_row_id: Number(result.lastInsertRowid),
          changed_db: result.changes > 0,
          size_after: 0,
          rows_read: 0,
          rows_written: result.changes,
        },
      };
    },

    async raw<T = unknown[]>(): Promise<T[]> {
      const stmt = db.prepare(sql);
      const rows = stmt.raw().all(...boundArgs);
      return rows as T[];
    },
  } as unknown as D1PreparedStatement;

  return statement;
}

/**
 * Creates a D1-compatible database wrapper around better-sqlite3
 *
 * Uses type assertions where D1's interface has evolved beyond our simple implementation.
 */
export function createLocalD1(): D1Database { // code_id:928
  const db = getLocalDatabase();

  const wrapper = {
    prepare(sql: string): D1PreparedStatement {
      return createPreparedStatement(db, sql);
    },

    async dump(): Promise<ArrayBuffer> {
      throw new Error('dump() not supported in local development');
    },

    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      // Run all statements in a transaction for atomicity
      const transaction = db.transaction(() => {
        for (const stmt of statements) {
          // Use run() for write operations - batch is typically used for writes
          results.push(stmt.run() as unknown as D1Result<T>);
        }
      });
      transaction();
      return results;
    },

    async exec(sql: string) {
      db.exec(sql);
      return {
        count: 1,
        duration: 0,
      };
    },
  } as unknown as D1Database;

  return wrapper;
}

/**
 * Check if we're running in a local Node.js environment
 */
export function isLocalEnvironment(): boolean { // code_id:929
  // In Cloudflare Workers, process is undefined
  // In Node.js with explicit flag, use local
  return typeof process !== 'undefined' && process.env.USE_LOCAL_DB === 'true';
}
