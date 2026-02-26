-- WhatsApp conversations table
-- Replaces whatsapp_ticket_mapping with a full conversation lifecycle table.
-- Run: mysql -u user -p chatbot_db < create_whatsapp_conversations.sql

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_number VARCHAR(32) NOT NULL,
  phone_number_id VARCHAR(100) DEFAULT NULL,      -- Meta phone_number_id used to send messages back
  state ENUM('pre_selection', 'active') NOT NULL DEFAULT 'pre_selection',
  openai_thread_id VARCHAR(255) DEFAULT NULL,     -- Thread ID for the generic agent (keyed as wa_{phone})
  issue_key VARCHAR(50) DEFAULT NULL,             -- Set after service selection; links to Jira ticket
  service_id VARCHAR(100) DEFAULT NULL,           -- Set after service selection
  user_id INT NOT NULL,                           -- WHATSAPP_DEFAULT_USER_ID
  processed_msg_ids TEXT DEFAULT NULL,            -- JSON array of WhatsApp msg.id (deduplication)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_phone (phone_number),
  INDEX idx_issue_key (issue_key),
  INDEX idx_user (user_id),
  INDEX idx_state (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
