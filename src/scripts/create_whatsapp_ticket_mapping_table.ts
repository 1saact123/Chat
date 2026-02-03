/**
 * Creates whatsapp_ticket_mapping table for phone -> Jira ticket mapping.
 * Run: npx ts-node src/scripts/create_whatsapp_ticket_mapping_table.ts
 */

import { sequelize } from '../config/database';

async function run() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_ticket_mapping (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone_number VARCHAR(32) NOT NULL,
        issue_key VARCHAR(50) NOT NULL,
        service_id VARCHAR(100) NOT NULL,
        user_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_phone (phone_number),
        INDEX idx_phone (phone_number),
        INDEX idx_issue_key (issue_key),
        INDEX idx_user_service (user_id, service_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Table whatsapp_ticket_mapping created or already exists.');
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
