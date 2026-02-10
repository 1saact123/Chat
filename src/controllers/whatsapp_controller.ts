/**
 * WhatsApp Cloud API webhook controller.
 * - GET: verification (hub.mode, hub.verify_token, hub.challenge).
 * - POST: incoming messages -> map phone to Jira ticket, add comment, optionally reply.
 */

import { Request, Response } from 'express';
import { WhatsAppTicketService } from '../services/whatsapp_ticket_service';
import { routeToService } from '../services/whatsapp_intent_router';
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
        const contacts = value.contacts || [];
        const contactMap = new Map(contacts.map((c) => [c.wa_id, c.profile?.name || 'WhatsApp User']));

        for (const msg of value.messages ?? []) {
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
   * For new conversations: uses intent router (keywords or config) to choose service; else default.
   */
  private async processIncomingMessage(phone: string, senderName: string, text: string): Promise<void> {
    const userId = DEFAULT_USER_ID;
    const defaultServiceId = DEFAULT_SERVICE_ID;

    if (!userId || !defaultServiceId) {
      console.warn('⚠️ WhatsApp: WHATSAPP_DEFAULT_USER_ID or WHATSAPP_DEFAULT_SERVICE_ID not set. Skipping message.');
      return;
    }

    let issueKey: string;
    let serviceId = defaultServiceId;
    let mapping = await WhatsAppTicketService.getMapping(phone);

    if (mapping) {
      issueKey = mapping.issue_key;
      serviceId = mapping.service_id;
      console.log(`📱 WhatsApp: existing ticket for ${phone} -> ${issueKey} (service ${serviceId})`);
    } else {
      const routed = await routeToService(userId, text, defaultServiceId);
      serviceId = routed.serviceId;
      console.log(`📱 WhatsApp: new conversation, routed to service ${serviceId} (${routed.source})`);

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
        console.log(`📱 WhatsApp: new ticket created ${issueKey} for ${phone} (service ${serviceId})`);
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
