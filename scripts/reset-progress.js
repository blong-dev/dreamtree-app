#!/usr/bin/env node

/**
 * Reset workbook progress for a specific user
 * Usage: npm run reset-progress -- --email you@example.com
 *    or: npm run reset-progress -- --user-id abc123
 */

const Database = require('better-sqlite3');
const path = require('path');

const args = process.argv.slice(2);
const emailIndex = args.indexOf('--email');
const userIdIndex = args.indexOf('--user-id');

if (emailIndex === -1 && userIdIndex === -1) {
  console.error('Usage: npm run reset-progress -- --email <email>');
  console.error('   or: npm run reset-progress -- --user-id <id>');
  process.exit(1);
}

const email = emailIndex !== -1 ? args[emailIndex + 1] : null;
const userId = userIdIndex !== -1 ? args[userIdIndex + 1] : null;

if (!email && !userId) {
  console.error('Please provide an email or user-id');
  process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'data', 'dreamtree.db');
const db = new Database(dbPath);

try {
  let targetUserId = userId;

  // Look up user by email if needed
  if (email) {
    const user = db.prepare(`
      SELECT u.id FROM users u
      JOIN emails e ON e.user_id = u.id
      WHERE e.email = ?
    `).get(email);

    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }
    targetUserId = user.id;
  }

  // Verify user exists
  const userCheck = db.prepare('SELECT id FROM users WHERE id = ?').get(targetUserId);
  if (!userCheck) {
    console.error(`No user found with id: ${targetUserId}`);
    process.exit(1);
  }

  console.log(`Resetting progress for user: ${targetUserId}`);

  // Delete user responses
  const responsesDeleted = db.prepare('DELETE FROM user_responses WHERE user_id = ?').run(targetUserId);
  console.log(`  Deleted ${responsesDeleted.changes} responses`);

  // Reset current_sequence to 0
  const sequenceReset = db.prepare('UPDATE user_settings SET current_sequence = 0 WHERE user_id = ?').run(targetUserId);
  console.log(`  Reset sequence position (${sequenceReset.changes} row updated)`);

  // Clear domain tables (data populated by domain writers)
  const domainTables = [
    'user_experiences',
    'user_experience_skills',
    'user_skills',
    'user_stories',
    'user_values',
    'user_profile',
  ];

  for (const table of domainTables) {
    try {
      const result = db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(targetUserId);
      if (result.changes > 0) {
        console.log(`  Deleted ${result.changes} rows from ${table}`);
      }
    } catch (e) {
      // Table might not exist, ignore
    }
  }

  console.log('\nProgress reset complete! Refresh the workbook page to start fresh.');

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} finally {
  db.close();
}
