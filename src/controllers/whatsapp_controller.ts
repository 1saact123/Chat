/**
 * WhatsApp Cloud API webhook controller.
 * - GET: verification (hub.mode, hub.verify_token, hub.challenge).
 * - POST: incoming messages -> map phone to Jira ticket, add comment, optionally reply.
 */

import { Request, Response } from 'express';
import { WhatsAppTicketService } from '../services/whatsapp_ticket_service';
import {
  getRoutableServicesFromDb,
  parseServiceSelection,
  buildAssistantListMessage
} from '../services/whatsapp_intent_router';
import { sendWhatsAppText } from '../services/whatsapp_send_service';
import { ServiceTicketController } from './service_ticket_controller';
import { UserJiraService } from '../services/user_jira_service';
import { User } from '../models';
import { ServiceJiraAccountsController } from './service_jira_accounts_controller';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'chatbot_webhook_verify';
const DEFAULT_USER_ID = parseInt(process.env.WHATSAPP_DEFAULT_USER_ID || '0', 10);

export class WhatsAppController {
  private serviceTicketController: ServiceTicketController;

  constructor() {
    this.serviceTicketController = new ServiceTicketController();
  }

  /**
   * GET /api/whatsapp/webhook - Meta verification.
   * Meta sends: hub.mode=subscribe, hub.verify_token=..., hub.challenge=...
   * We must respond with the challenge (plain text) and 200.
   */
  async verifyWebhook(req: Request, res: Response): Promise<void> {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[WhatsApp] Verification GET', { mode, tokenMatch: token === VERIFY_TOKEN, hasChallenge: !!challenge });

    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge != null) {
      const challengeStr = String(challenge);
      console.log('✅ WhatsApp webhook verified, sending challenge');
      res.type('text/plain').status(200).send(challengeStr);
    } else {
      console.warn('⚠️ WhatsApp webhook verification failed', { mode, expectedToken: !!VERIFY_TOKEN });
      res.status(403).send('Forbidden');
    }
  }

  /**
   * POST /api/whatsapp/webhook - Incoming messages from Meta.
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Log every POST to confirm Meta is hitting the server
      const bodyRaw = req.body;
      console.log('[WhatsApp] POST webhook received', {
        hasBody: !!bodyRaw,
        object: bodyRaw?.object,
        entryCount: bodyRaw?.entry?.length ?? 0,
        firstChangeField: bodyRaw?.entry?.[0]?.changes?.[0]?.field
      });

      const body = bodyRaw as {
        object?: string;
        entry?: Array<{
          id: string;
          changes?: Array<{
            value?: {
              messaging_product?: string;
              metadata?: { phone_number_id?: string; display_phone_number?: string };
              contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
              messages?: Array<{
                from: string;
                id: string;
                timestamp: string;
                type: string;
                text?: { body: string };
              }>;
            };
            field?: string;
          }>;
        }>;
      };

      if (body?.object !== 'whatsapp_business_account') {
        res.status(200).send('ok');
        return;
      }

      const entry = body.entry?.[0];
      const changes = entry?.changes;
      if (!changes?.length) {
        res.status(200).send('ok');
        return;
      }

      for (const change of changes) {
        if (change.field !== 'messages' || !change.value?.messages) continue;
        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
        const contacts = value.contacts || [];
        const contactMap = new Map(contacts.map((c) => [c.wa_id, c.profile?.name || 'WhatsApp User']));

        for (const msg of value.messages ?? []) {
          if (msg.type !== 'text' || !msg.text?.body) continue;
          const phone = msg.from;
          const text = msg.text.body.trim();
          const senderName = contactMap.get(phone) || `+${phone}`;

          await this.processIncomingMessage(phone, senderName, text, phoneNumberId);
        }
      }

      res.status(200).send('ok');
    } catch (error) {
      console.error('❌ WhatsApp webhook error:', error);
      res.status(200).send('ok'); // Meta expects 200 to avoid retries on our logic errors
    }
  }

  /**
   * Asistente Movonte (predefined, not in DB): no Jira ticket until user selects a service.
   * - No mapping: show list of services from DB; if user selects one -> create ticket and switch.
   * - Mapping exists: conversation goes to that service's Jira ticket.
   */
  private async processIncomingMessage(
    phone: string,
    senderName: string,
    text: string,
    phoneNumberId: string
  ): Promise<void> {
    const userId = DEFAULT_USER_ID;

    if (!userId) {
      console.warn('⚠️ WhatsApp: WHATSAPP_DEFAULT_USER_ID not set. Skipping message.');
      return;
    }

    const mapping = await WhatsAppTicketService.getMapping(phone);

    if (mapping) {
      // Phone already linked to a service/ticket → add message to Jira (no Asistente Movonte list)
      console.log('📱 WhatsApp: existing mapping', phone, '→', mapping.issue_key, mapping.service_id);
      await this.addMessageToTicket(phone, senderName, text, mapping.issue_key, mapping.service_id, mapping.user_id);
      return;
    }

    // --- Asistente Movonte: no ticket yet, show list or handle selection ---
    const services = await getRoutableServicesFromDb(userId);
    if (services.length === 0) {
      console.warn('⚠️ WhatsApp: no active services for user. Cannot show assistant list.');
      if (phoneNumberId) {
        await sendWhatsAppText(phoneNumberId, phone, 'Hola. No hay servicios disponibles en este momento.');
      }
      return;
    }

    // strictFirstContact: true = only "1"/"2" or exact service name counts as selection; else we always show the list first
    const selection = parseServiceSelection(services, text, true);
    if (selection) {
      // User chose a service: create ticket and switch (first message goes to Jira)
      const user = await User.findByPk(userId);
      if (!user) {
        console.error(`❌ WhatsApp: default user ${userId} not found.`);
        return;
      }
      const customerInfo = {
        name: senderName,
        email: `${phone.replace(/\D/g, '')}@whatsapp.placeholder`,
        phone
      };
      try {
        const result = await this.serviceTicketController.createTicketForWhatsApp(userId, selection.serviceId, customerInfo);
        await WhatsAppTicketService.setMapping(phone, result.issueKey, selection.serviceId, userId);
        console.log(`📱 WhatsApp: user chose "${selection.serviceName}" -> ticket ${result.issueKey} for ${phone}`);

        const firstComment = `Usuario eligió servicio: ${selection.serviceName}. Mensaje: ${text}`;
        await this.addMessageToTicket(phone, senderName, firstComment, result.issueKey, selection.serviceId, userId);

        if (phoneNumberId) {
          await sendWhatsAppText(
            phoneNumberId,
            phone,
            `Te hemos conectado con *${selection.serviceName}*. ¿En qué podemos ayudarte?`
          );
        }
      } catch (err) {
        console.error('❌ WhatsApp: failed to create ticket after selection:', err);
        if (phoneNumberId) {
          await sendWhatsAppText(phoneNumberId, phone, 'No pudimos conectar con ese servicio. Intenta de nuevo o elige otro.');
        }
      }
      return;
    }

    // No selection: show Asistente Movonte list (no Jira)
    const listMessage = buildAssistantListMessage(services);
    if (phoneNumberId) {
      await sendWhatsAppText(phoneNumberId, phone, listMessage);
      console.log('📱 WhatsApp: Asistente Movonte → list sent to', phone, '(no ticket created)');
    } else {
      console.warn('⚠️ WhatsApp: no phone_number_id; cannot send assistant list. Set WHATSAPP_PHONE_NUMBER_ID or ensure webhook sends metadata.phone_number_id.');
    }
  }

  private async addMessageToTicket(
    phone: string,
    senderName: string,
    text: string,
    issueKey: string,
    serviceId: string,
    userId: number
  ): Promise<void> {
    const jiraCredentials = await this.getJiraCredentialsForUserAndService(userId, serviceId);
    if (!jiraCredentials) {
      console.error('❌ WhatsApp: no Jira credentials for user/service.');
      return;
    }
    const userJiraService = new UserJiraService(
      userId,
      jiraCredentials.token,
      jiraCredentials.url,
      jiraCredentials.email
    );
    const commentText = `[WhatsApp] ${senderName}: ${text}`;
    try {
      await userJiraService.addCommentToIssue(issueKey, commentText);
      console.log(`✅ WhatsApp: message added to ${issueKey}`);
    } catch (err) {
      console.error('❌ WhatsApp: failed to add comment to Jira:', err);
    }
  }

  private async getJiraCredentialsForUserAndService(
    userId: number,
    serviceId: string
  ): Promise<{ email: string; token: string; url: string } | null> {
    const assistant = await ServiceJiraAccountsController.getAssistantJiraAccount(userId, serviceId);
    if (assistant) return assistant;
    const user = await User.findByPk(userId);
    if (!user?.jiraToken || !(user as any).jiraUrl) return null;
    return {
      email: user.email,
      token: user.jiraToken,
      url: (user as any).jiraUrl
    };
  }
}
