/**
 * Setup script: inserts the whatsapp-generic service and runs the
 * whatsapp_conversations table migration in one step.
 *
 * Run from the server:
 *   npx ts-node src/scripts/setup_whatsapp_generic_agent.ts
 */

import { sequelize } from '../config/database';

const WHATSAPP_DEFAULT_USER_ID = parseInt(process.env.WHATSAPP_DEFAULT_USER_ID || '1', 10);
const GENERIC_ASSISTANT_ID = 'asst_m8oOEEIJxH29nxBngTvYp7Ng';
const GENERIC_ASSISTANT_NAME = 'Asistente Movonte';

async function run() {
  console.log('🔧 Step 1 – Creating whatsapp_conversations table...');
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

  // Migrate from legacy table if it exists
  const [tables] = await sequelize.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_ticket_mapping'`
  ) as [any[], unknown];

  if (tables.length > 0) {
    console.log('📦 Migrating records from whatsapp_ticket_mapping...');
    await sequelize.query(`
      INSERT IGNORE INTO whatsapp_conversations
        (phone_number, state, issue_key, service_id, user_id, created_at, updated_at)
      SELECT phone_number, 'active', issue_key, service_id, user_id, created_at, updated_at
      FROM whatsapp_ticket_mapping
    `);
    console.log('✅ Migration done.');
  }

  console.log(`\n🔧 Step 2 – Inserting whatsapp-generic service for user ${WHATSAPP_DEFAULT_USER_ID}...`);

  await sequelize.query(
    `INSERT INTO unified_configurations
       (user_id, service_id, service_name, assistant_id, assistant_name, is_active, approval_status, configuration)
     VALUES
       (:userId, 'whatsapp-generic', :assistantName, :assistantId, :assistantName, 1, 'approved', '{}')
     ON DUPLICATE KEY UPDATE
       assistant_id    = :assistantId,
       assistant_name  = :assistantName,
       is_active       = 1,
       approval_status = 'approved'`,
    {
      replacements: {
        userId: WHATSAPP_DEFAULT_USER_ID,
        assistantId: GENERIC_ASSISTANT_ID,
        assistantName: GENERIC_ASSISTANT_NAME
      }
    }
  );

  // Verify
  const [rows] = await sequelize.query(
    `SELECT service_id, service_name, assistant_id, is_active, approval_status
     FROM unified_configurations
     WHERE service_id = 'whatsapp-generic' AND user_id = :userId`,
    { replacements: { userId: WHATSAPP_DEFAULT_USER_ID } }
  ) as [any[], unknown];

  if (rows.length > 0) {
    const r = rows[0] as any;
    console.log('✅ whatsapp-generic service configured:');
    console.log(`   service_id:     ${r.service_id}`);
    console.log(`   service_name:   ${r.service_name}`);
    console.log(`   assistant_id:   ${r.assistant_id}`);
    console.log(`   is_active:      ${r.is_active}`);
    console.log(`   approval_status: ${r.approval_status}`);
  } else {
    console.error('❌ Insert failed – record not found after upsert.');
    process.exit(1);
  }

  await sequelize.close();
  console.log('\n🎉 Setup complete. WhatsApp agent system is ready.');
}

run().catch((err) => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
