/**
 * Service for mapping WhatsApp phone numbers to Jira tickets.
 */

import { sequelize } from '../config/database';

export interface WhatsAppMapping {
  phone_number: string;
  issue_key: string;
  service_id: string;
  user_id: number;
  created_at: Date;
  updated_at: Date;
}

export class WhatsAppTicketService {
  /**
   * Normalize phone for storage (E.164-like: digits only, optional leading +).
   */
  static normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits ? `+${digits}` : phone;
  }

  /**
   * Get existing mapping for a phone number.
   */
  static async getMapping(phone: string): Promise<WhatsAppMapping | null> {
    const normalized = this.normalizePhone(phone);
    const [rows] = await sequelize.query(
      `SELECT phone_number, issue_key, service_id, user_id, created_at, updated_at
       FROM whatsapp_ticket_mapping WHERE phone_number = :phone LIMIT 1`,
      { replacements: { phone: normalized } }
    ) as any;
    if (!rows || rows.length === 0) return null;
    return rows[0] as WhatsAppMapping;
  }

  /**
   * Save or update mapping: phone -> (issueKey, serviceId, userId).
   */
  static async setMapping(
    phone: string,
    issueKey: string,
    serviceId: string,
    userId: number
  ): Promise<void> {
    const normalized = this.normalizePhone(phone);
    await sequelize.query(
      `INSERT INTO whatsapp_ticket_mapping (phone_number, issue_key, service_id, user_id)
       VALUES (:phone, :issueKey, :serviceId, :userId)
       ON DUPLICATE KEY UPDATE issue_key = :issueKey, service_id = :serviceId, user_id = :userId, updated_at = CURRENT_TIMESTAMP`,
      {
        replacements: {
          phone: normalized,
          issueKey,
          serviceId,
          userId
        }
      }
    );
  }
}
