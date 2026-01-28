/**
 * DreamTree D1 Database Client
 *
 * Provides typed database access for all tables.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type {
  User,
  Session,
  UserSettings,
  UserModule,
  Stem,
  ContentBlock,
  Tool,
  PersonalityType,
  Competency,
  CompetencyLevel,
  Skill,
} from '@/types/database';

export function createDb(db: D1Database) { // code_id:461
  return {
    // ============================================================
    // USER QUERIES
    // ============================================================

    async createUser(id: string): Promise<User> {
      const now = new Date().toISOString();
      await db
        .prepare(
          `INSERT INTO users (id, is_anonymous, workbook_complete, user_role, created_at, updated_at)
           VALUES (?, 1, 0, 'user', ?, ?)`
        )
        .bind(id, now, now)
        .run();

      return {
        id,
        is_anonymous: 1,
        workbook_complete: 0,
        user_role: 'user' as const,
        marketing_consent: 0,
        consent_given_at: null,
        created_at: now,
        updated_at: now,
      };
    },

    async getUserById(id: string): Promise<User | null> {
      const result = await db
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(id)
        .first<User>();
      return result || null;
    },

    async updateUser(
      id: string,
      updates: Partial<Pick<User, 'is_anonymous' | 'workbook_complete'>>
    ): Promise<void> {
      const sets: string[] = ['updated_at = ?'];
      const values: (string | number)[] = [new Date().toISOString()];

      if (updates.is_anonymous !== undefined) {
        sets.push('is_anonymous = ?');
        values.push(updates.is_anonymous);
      }
      if (updates.workbook_complete !== undefined) {
        sets.push('workbook_complete = ?');
        values.push(updates.workbook_complete);
      }

      values.push(id);
      await db
        .prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();
    },

    // ============================================================
    // SESSION QUERIES
    // ============================================================

    async createSession(id: string, userId: string): Promise<Session> {
      const now = new Date().toISOString();
      await db
        .prepare(
          `INSERT INTO sessions (id, user_id, created_at, last_seen_at)
           VALUES (?, ?, ?, ?)`
        )
        .bind(id, userId, now, now)
        .run();

      return { id, user_id: userId, created_at: now, last_seen_at: now };
    },

    async getSessionById(id: string): Promise<Session | null> {
      const result = await db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(id)
        .first<Session>();
      return result || null;
    },

    async updateSessionLastSeen(id: string): Promise<void> {
      await db
        .prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?')
        .bind(new Date().toISOString(), id)
        .run();
    },

    async deleteSession(id: string): Promise<void> {
      await db.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
    },

    // ============================================================
    // USER SETTINGS QUERIES
    // ============================================================

    async createUserSettings(userId: string): Promise<UserSettings> {
      const now = new Date().toISOString();
      await db
        .prepare(
          `INSERT INTO user_settings (user_id, background_color, text_color, font, created_at, updated_at)
           VALUES (?, 'ivory', 'charcoal', 'inter', ?, ?)`
        )
        .bind(userId, now, now)
        .run();

      return {
        user_id: userId,
        background_color: 'ivory',
        text_color: 'charcoal',
        font: 'inter',
        personality_type: null,
        created_at: now,
        updated_at: now,
      };
    },

    async getUserSettings(userId: string): Promise<UserSettings | null> {
      const result = await db
        .prepare('SELECT * FROM user_settings WHERE user_id = ?')
        .bind(userId)
        .first<UserSettings>();
      return result || null;
    },

    async updateUserSettings(
      userId: string,
      updates: Partial<
        Pick<UserSettings, 'background_color' | 'text_color' | 'font' | 'personality_type'>
      >
    ): Promise<void> {
      const sets: string[] = ['updated_at = ?'];
      const values: (string | null)[] = [new Date().toISOString()];

      if (updates.background_color !== undefined) {
        sets.push('background_color = ?');
        values.push(updates.background_color);
      }
      if (updates.text_color !== undefined) {
        sets.push('text_color = ?');
        values.push(updates.text_color);
      }
      if (updates.font !== undefined) {
        sets.push('font = ?');
        values.push(updates.font);
      }
      if (updates.personality_type !== undefined) {
        sets.push('personality_type = ?');
        values.push(updates.personality_type);
      }

      values.push(userId);
      await db
        .prepare(`UPDATE user_settings SET ${sets.join(', ')} WHERE user_id = ?`)
        .bind(...values)
        .run();
    },

    // ============================================================
    // CONTENT QUERIES
    // ============================================================

    async getStemBySequence(sequence: number): Promise<Stem | null> {
      const result = await db
        .prepare('SELECT * FROM stem WHERE sequence = ?')
        .bind(sequence)
        .first<Stem>();
      return result || null;
    },

    async getStemRange(start: number, end: number): Promise<Stem[]> {
      const result = await db
        .prepare('SELECT * FROM stem WHERE sequence >= ? AND sequence <= ? ORDER BY sequence')
        .bind(start, end)
        .all<Stem>();
      return result.results || [];
    },

    async getContentBlock(id: number): Promise<ContentBlock | null> {
      const result = await db
        .prepare('SELECT * FROM content_blocks WHERE id = ? AND is_active = 1')
        .bind(id)
        .first<ContentBlock>();
      return result || null;
    },

    async getTool(id: number): Promise<Tool | null> {
      const result = await db
        .prepare('SELECT * FROM tools WHERE id = ? AND is_active = 1')
        .bind(id)
        .first<Tool>();
      return result || null;
    },

    async getToolByName(name: string): Promise<Tool | null> {
      const result = await db
        .prepare('SELECT * FROM tools WHERE name = ? AND is_active = 1')
        .bind(name)
        .first<Tool>();
      return result || null;
    },

    async getToolsWithReminders(): Promise<Tool[]> {
      const result = await db
        .prepare('SELECT * FROM tools WHERE has_reminder = 1 AND is_active = 1')
        .all<Tool>();
      return result.results || [];
    },

    // ============================================================
    // REFERENCE QUERIES
    // ============================================================

    async getAllPersonalityTypes(): Promise<PersonalityType[]> {
      const result = await db.prepare('SELECT * FROM personality_types').all<PersonalityType>();
      return result.results || [];
    },

    async getPersonalityType(code: string): Promise<PersonalityType | null> {
      const result = await db
        .prepare('SELECT * FROM personality_types WHERE code = ?')
        .bind(code)
        .first<PersonalityType>();
      return result || null;
    },

    async getAllCompetencies(): Promise<Competency[]> {
      const result = await db
        .prepare('SELECT * FROM competencies ORDER BY category, sort_order')
        .all<Competency>();
      return result.results || [];
    },

    async getCompetencyLevels(competencyId: string): Promise<CompetencyLevel[]> {
      const result = await db
        .prepare('SELECT * FROM competency_levels WHERE competency_id = ? ORDER BY level')
        .bind(competencyId)
        .all<CompetencyLevel>();
      return result.results || [];
    },

    async searchSkills(query: string, category?: string): Promise<Skill[]> {
      let sql = 'SELECT * FROM skills WHERE name LIKE ?';
      const params: string[] = [`%${query}%`];

      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }

      sql += ' ORDER BY name LIMIT 50';

      const result = await db
        .prepare(sql)
        .bind(...params)
        .all<Skill>();
      return result.results || [];
    },

    // ============================================================
    // USER PROGRESS QUERIES
    // ============================================================

    async getUserModules(userId: string): Promise<UserModule[]> {
      const result = await db
        .prepare('SELECT * FROM user_modules WHERE user_id = ?')
        .bind(userId)
        .all<UserModule>();
      return result.results || [];
    },

    async getMaxSequenceCompleted(userId: string): Promise<number> {
      const result = await db
        .prepare(
          `SELECT MAX(s.sequence) as max_seq
           FROM user_responses ur
           JOIN stem s ON ur.exercise_id = (s.part || '.' || s.module || '.' || s.exercise)
           WHERE ur.user_id = ?`
        )
        .bind(userId)
        .first<{ max_seq: number | null }>();
      return result?.max_seq || 0;
    },

    // Raw query access for custom queries
    raw: db,
  };
}

export type Database = ReturnType<typeof createDb>;
