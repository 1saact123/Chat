/**
 * Migration: create whatsapp_conversations table.
 * Replaces whatsapp_ticket_mapping with a table that tracks the full conversation lifecycle.
 *
 * Run: npx ts-node src/scripts/create_whatsapp_conversations_table.ts
 */

import { sequelize } from '../config/database';

async function run() {
  console.log('🔧 Creating whatsapp_conversations table...');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone_number VARCHAR(32) NOT NULL,
      phone_number_id VARCHAR(100) DEFAULT NULL,
      state ENUM('pre_selection', 'active') NOT NULL DEFAULT 'pre_selection',
      openai_thread_id VARCHAR(255) DEFAULT NULL,
      issue_key VARCHAR(50) DEFAULT NULL,
      service_id VARCHAR(100) DEFAULT NULL,
      user_id INT NOT NULL,
      processed_msg_ids TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_phone (phone_number),
      INDEX idx_issue_key (issue_key),
      INDEX idx_user (user_id),
      INDEX idx_state (state)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('✅ whatsapp_conversations table ready.');

  // Migrate existing records from whatsapp_ticket_mapping (if table exists)
  const [tables] = await sequelize.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_ticket_mapping'`
  ) as [any[], unknown];

  if (tables.length > 0) {
    console.log('📦 Migrating existing records from whatsapp_ticket_mapping...');
    await sequelize.query(`
      INSERT IGNORE INTO whatsapp_conversations
        (phone_number, state, issue_key, service_id, user_id, created_at, updated_at)
      SELECT
        phone_number,
        'active',
        issue_key,
        service_id,
        user_id,
        created_at,
        updated_at
      FROM whatsapp_ticket_mapping
    `);
    const [migrated] = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM whatsapp_conversations WHERE state = 'active'`
    ) as [any[], unknown];
    console.log(`✅ Migrated ${(migrated as any[])[0].cnt} records.`);
  }

  await sequelize.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
