/**
 * Service for managing WhatsApp conversation lifecycle.
 * Replaces whatsapp_ticket_service.ts / whatsapp_ticket_mapping table.
 *
 * Table: whatsapp_conversations
 * States:
 *   pre_selection – customer has not yet selected a service; generic agent responds.
 *   active        – service selected, Jira ticket created, service agent handles messages.
 */

import { sequelize } from '../config/database';

export interface WhatsAppConversation {
  id: number;
  phone_number: string;
  phone_number_id: string | null;
  state: 'pre_selection' | 'active';
  openai_thread_id: string | null;
  issue_key: string | null;
  service_id: string | null;
  user_id: number;
  processed_msg_ids: string | null; // JSON array string
  created_at: Date;
  updated_at: Date;
}

export class WhatsAppConversationService {
  /** Normalize phone to E.164-like digits-only with leading + */
  static normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits ? `+${digits}` : phone;
  }

  /** Retrieve conversation for a phone number (or null if none). */
  static async getConversation(phone: string): Promise<WhatsAppConversation | null> {
    const normalized = this.normalizePhone(phone);
    const [rows] = await sequelize.query(
      `SELECT * FROM whatsapp_conversations WHERE phone_number = :phone LIMIT 1`,
      { replacements: { phone: normalized } }
    ) as [any[], unknown];
    return rows?.[0] ?? null;
  }

  /**
   * Get existing conversation or create a new one in 'pre_selection' state.
   * Updates phone_number_id if it changed (Meta can change it).
   */
  static async getOrCreateConversation(
    phone: string,
    phoneNumberId: string,
    userId: number
  ): Promise<WhatsAppConversation> {
    const normalized = this.normalizePhone(phone);

    await sequelize.query(
      `INSERT INTO whatsapp_conversations (phone_number, phone_number_id, state, user_id)
       VALUES (:phone, :phoneNumberId, 'pre_selection', :userId)
       ON DUPLICATE KEY UPDATE
         phone_number_id = COALESCE(:phoneNumberId, phone_number_id),
         updated_at = CURRENT_TIMESTAMP`,
      { replacements: { phone: normalized, phoneNumberId: phoneNumberId || null, userId } }
    );

    const conv = await this.getConversation(normalized);
    return conv!;
  }

  /**
   * Transition conversation to 'active' after service selection.
   * Stores the Jira issue key and service id.
   */
  static async activateConversation(
    phone: string,
    issueKey: string,
    serviceId: string
  ): Promise<void> {
    const normalized = this.normalizePhone(phone);
    await sequelize.query(
      `UPDATE whatsapp_conversations
       SET state = 'active', issue_key = :issueKey, service_id = :serviceId,
           updated_at = CURRENT_TIMESTAMP
       WHERE phone_number = :phone`,
      { replacements: { phone: normalized, issueKey, serviceId } }
    );
  }

  /**
   * Update the OpenAI thread ID for the generic agent conversation.
   * Called after the first AI response creates a thread.
   */
  static async updateThreadId(phone: string, threadId: string): Promise<void> {
    const normalized = this.normalizePhone(phone);
    await sequelize.query(
      `UPDATE whatsapp_conversations
       SET openai_thread_id = :threadId, updated_at = CURRENT_TIMESTAMP
       WHERE phone_number = :phone`,
      { replacements: { phone: normalized, threadId } }
    );
  }

  /**
   * Find an active conversation by Jira issue key.
   * Used by chatbot_controller to send AI responses back to WhatsApp.
   */
  static async findByIssueKey(issueKey: string): Promise<WhatsAppConversation | null> {
    const [rows] = await sequelize.query(
      `SELECT * FROM whatsapp_conversations
       WHERE issue_key = :issueKey AND state = 'active' LIMIT 1`,
      { replacements: { issueKey } }
    ) as [any[], unknown];
    return rows?.[0] ?? null;
  }

  /**
   * Check whether a specific WhatsApp message ID has already been processed.
   * Prevents duplicate processing when Meta retries webhook delivery.
   */
  static async isMessageProcessed(phone: string, msgId: string): Promise<boolean> {
    const conv = await this.getConversation(phone);
    if (!conv?.processed_msg_ids) return false;
    try {
      const ids: string[] = JSON.parse(conv.processed_msg_ids);
      return ids.includes(msgId);
    } catch {
      return false;
    }
  }

  /**
   * Record a WhatsApp message ID as processed.
   * Keeps only the last 20 IDs to avoid unbounded growth.
   */
  static async markMessageProcessed(phone: string, msgId: string): Promise<void> {
    const normalized = this.normalizePhone(phone);
    const conv = await this.getConversation(normalized);
    let ids: string[] = [];
    if (conv?.processed_msg_ids) {
      try {
        ids = JSON.parse(conv.processed_msg_ids);
      } catch {
        ids = [];
      }
    }
    if (!ids.includes(msgId)) {
      ids.push(msgId);
      if (ids.length > 20) ids = ids.slice(-20);
    }
    await sequelize.query(
      `UPDATE whatsapp_conversations
       SET processed_msg_ids = :ids, updated_at = CURRENT_TIMESTAMP
       WHERE phone_number = :phone`,
      { replacements: { phone: normalized, ids: JSON.stringify(ids) } }
    );
  }

  /**
   * Reset a conversation back to pre_selection (e.g. customer types "menu" or "inicio").
   * Clears the Jira ticket link and service so a new service can be selected.
   */
  static async resetConversation(phone: string): Promise<void> {
    const normalized = this.normalizePhone(phone);
    await sequelize.query(
      `UPDATE whatsapp_conversations
       SET state = 'pre_selection', issue_key = NULL, service_id = NULL,
           openai_thread_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE phone_number = :phone`,
      { replacements: { phone: normalized } }
    );
  }
}
