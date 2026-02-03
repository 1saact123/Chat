/**
 * WhatsApp Cloud API webhook controller.
 * - GET: verification (hub.mode, hub.verify_token, hub.challenge).
 * - POST: incoming messages -> map phone to Jira ticket, add comment, optionally reply.
 */

import { Request, Response } from 'express';
import { WhatsAppTicketService } from '../services/whatsapp_ticket_service';
import { ServiceTicketController } from './service_ticket_controller';
import { UserJiraService } from '../services/user_jira_service';
import { User } from '../models';
import { ServiceJiraAccountsController } from './service_jira_accounts_controller';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'chatbot_webhook_verify';
const DEFAULT_USER_ID = parseInt(process.env.WHATSAPP_DEFAULT_USER_ID || '0', 10);
const DEFAULT_SERVICE_ID = process.env.WHATSAPP_DEFAULT_SERVICE_ID || '';

export class WhatsAppController {
  private serviceTicketController: ServiceTicketController;

  constructor() {
    this.serviceTicketController = new ServiceTicketController();
  }

  /**
   * GET /api/whatsapp/webhook - Meta verification.
   */
  async verifyWebhook(req: Request, res: Response): Promise<void> {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WhatsApp webhook verified');
      res.status(200).send(challenge);
    } else {
      console.warn('⚠️ WhatsApp webhook verification failed: invalid mode or token');
      res.status(403).send('Forbidden');
    }
  }

  /**
   * POST /api/whatsapp/webhook - Incoming messages from Meta.
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as {
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
        const contacts = value.contacts || [];
        const contactMap = new Map(contacts.map((c) => [c.wa_id, c.profile?.name || 'WhatsApp User']));

        for (const msg of value.messages) {
          if (msg.type !== 'text' || !msg.text?.body) continue;
          const phone = msg.from;
          const text = msg.text.body.trim();
          const senderName = contactMap.get(phone) || `+${phone}`;

          await this.processIncomingMessage(phone, senderName, text);
        }
      }

      res.status(200).send('ok');
    } catch (error) {
      console.error('❌ WhatsApp webhook error:', error);
      res.status(200).send('ok'); // Meta expects 200 to avoid retries on our logic errors
    }
  }

  /**
   * Resolve or create Jira ticket for this phone, then add message as comment.
   */
  private async processIncomingMessage(phone: string, senderName: string, text: string): Promise<void> {
    const userId = DEFAULT_USER_ID;
    const serviceId = DEFAULT_SERVICE_ID;

    if (!userId || !serviceId) {
      console.warn('⚠️ WhatsApp: WHATSAPP_DEFAULT_USER_ID or WHATSAPP_DEFAULT_SERVICE_ID not set. Skipping message.');
      return;
    }

    let issueKey: string;
    let mapping = await WhatsAppTicketService.getMapping(phone);

    if (mapping) {
      issueKey = mapping.issue_key;
      console.log(`📱 WhatsApp: existing ticket for ${phone} -> ${issueKey}`);
    } else {
      const user = await User.findByPk(userId);
      if (!user) {
        console.error(`❌ WhatsApp: default user ${userId} not found.`);
        return;
      }
      const customerInfo = {
        name: senderName,
        email: `${phone.replace(/\D/g, '')}@whatsapp.placeholder`,
        phone: phone
      };
      try {
        const result = await this.serviceTicketController.createTicketForWhatsApp(userId, serviceId, customerInfo);
        issueKey = result.issueKey;
        await WhatsAppTicketService.setMapping(phone, issueKey, serviceId, userId);
        console.log(`📱 WhatsApp: new ticket created ${issueKey} for ${phone}`);
      } catch (err) {
        console.error('❌ WhatsApp: failed to create ticket:', err);
        return;
      }
    }

    const mappingAfter = await WhatsAppTicketService.getMapping(phone);
    const uid = mappingAfter?.user_id ?? userId;
    const jiraCredentials = await this.getJiraCredentialsForUserAndService(uid, mappingAfter?.service_id ?? serviceId);
    if (!jiraCredentials) {
      console.error('❌ WhatsApp: no Jira credentials for user/service.');
      return;
    }

    const userJiraService = new UserJiraService(
      uid,
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
