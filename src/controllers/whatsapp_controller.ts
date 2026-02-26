/**
 * WhatsApp Cloud API webhook controller.
 *
 * Two-phase conversation model:
 *
 * PHASE 1 – pre_selection
 *   Customer has not yet chosen a service. A generic AI agent (service_id='whatsapp-generic'
 *   in unified_configurations) handles the conversation conversationally and guides the user.
 *   When the user sends a valid selection (number 1-N or exact service name) the system
 *   transitions to phase 2.
 *
 * PHASE 2 – active
 *   A Jira ticket has been created for the selected service. Every WhatsApp message is added
 *   as a comment to that ticket. The service-specific AI agent (configured in
 *   unified_configurations) then responds via the Jira webhook → chatbot_controller flow,
 *   and chatbot_controller sends the AI reply back to WhatsApp (bidirectional).
 *
 * Webhook endpoints:
 *   GET  /api/whatsapp/webhook  – Meta verification
 *   POST /api/whatsapp/webhook  – Incoming messages
 */

import { Request, Response } from 'express';
import { WhatsAppConversationService } from '../services/whatsapp_conversation_service';
import { WhatsAppAgentService } from '../services/whatsapp_agent_service';
import {
  getRoutableServicesFromDb,
  parseServiceSelection,
  RoutableService
} from '../services/whatsapp_intent_router';
import { sendWhatsAppText } from '../services/whatsapp_send_service';
import { ServiceTicketController } from './service_ticket_controller';
import { UserJiraService } from '../services/user_jira_service';
import { User } from '../models';
import { ServiceJiraAccountsController } from './service_jira_accounts_controller';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'chatbot_webhook_verify';
const DEFAULT_USER_ID = parseInt(process.env.WHATSAPP_DEFAULT_USER_ID || '0', 10);

// Keywords that reset the conversation so the customer can choose a new service.
const RESET_KEYWORDS = ['menu', 'inicio', 'reiniciar', 'reset', 'volver', 'start'];

export class WhatsAppController {
  private serviceTicketController: ServiceTicketController;

  constructor() {
    this.serviceTicketController = new ServiceTicketController();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/whatsapp/webhook – Meta verification
  // ─────────────────────────────────────────────────────────────────────────
  async verifyWebhook(req: Request, res: Response): Promise<void> {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[WhatsApp] Verification GET', { mode, tokenMatch: token === VERIFY_TOKEN });

    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge != null) {
      console.log('✅ WhatsApp webhook verified');
      res.type('text/plain').status(200).send(String(challenge));
    } else {
      console.warn('⚠️ WhatsApp webhook verification failed');
      res.status(403).send('Forbidden');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/whatsapp/webhook – Incoming messages from Meta
  // ─────────────────────────────────────────────────────────────────────────
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as {
        object?: string;
        entry?: Array<{
          id: string;
          changes?: Array<{
            field?: string;
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
          }>;
        }>;
      };

      console.log('[WhatsApp] POST webhook', {
        object: body?.object,
        entryCount: body?.entry?.length ?? 0
      });

      if (body?.object !== 'whatsapp_business_account') {
        res.status(200).send('ok');
        return;
      }

      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== 'messages' || !change.value?.messages) continue;

          const value = change.value;
          const phoneNumberId =
            value.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
          const contactMap = new Map(
            (value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name || 'WhatsApp User'])
          );

          for (const msg of value.messages ?? []) {
            if (msg.type !== 'text' || !msg.text?.body) continue;
            const phone = msg.from;
            const text = msg.text.body.trim();
            const senderName = contactMap.get(phone) || `+${phone}`;
            await this.processIncomingMessage(phone, senderName, text, phoneNumberId, msg.id);
          }
        }
      }

      res.status(200).send('ok');
    } catch (error) {
      console.error('❌ WhatsApp webhook error:', error);
      res.status(200).send('ok'); // Always 200 to Meta
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core message dispatcher
  // ─────────────────────────────────────────────────────────────────────────
  private async processIncomingMessage(
    phone: string,
    senderName: string,
    text: string,
    phoneNumberId: string,
    msgId: string
  ): Promise<void> {
    if (!DEFAULT_USER_ID) {
      console.warn('⚠️ WhatsApp: WHATSAPP_DEFAULT_USER_ID not set. Skipping.');
      return;
    }

    // Ensure conversation row exists and phone_number_id is up to date
    const conv = await WhatsAppConversationService.getOrCreateConversation(
      phone,
      phoneNumberId,
      DEFAULT_USER_ID
    );

    // Deduplication: skip messages already processed (Meta can retry)
    if (await WhatsAppConversationService.isMessageProcessed(phone, msgId)) {
      console.log(`[WhatsApp] Duplicate msg ${msgId} ignored for ${phone}`);
      return;
    }
    await WhatsAppConversationService.markMessageProcessed(phone, msgId);

    // Allow customer to reset conversation at any time
    if (RESET_KEYWORDS.includes(text.toLowerCase())) {
      await WhatsAppConversationService.resetConversation(phone);
      const services = await getRoutableServicesFromDb(DEFAULT_USER_ID);
      if (phoneNumberId && services.length > 0) {
        await sendWhatsAppText(phoneNumberId, phone, this.buildServiceListMessage(services));
      }
      return;
    }

    // ── PHASE 2: active ───────────────────────────────────────────────────
    if (conv.state === 'active' && conv.issue_key && conv.service_id) {
      console.log(`📱 [WhatsApp] Active conversation ${phone} → ${conv.issue_key}`);
      await this.addMessageToTicket(
        phone,
        senderName,
        text,
        conv.issue_key,
        conv.service_id,
        conv.user_id
      );
      return;
    }

    // ── PHASE 1: pre_selection ────────────────────────────────────────────
    const services = await getRoutableServicesFromDb(DEFAULT_USER_ID);

    if (services.length === 0) {
      console.warn('⚠️ WhatsApp: no active services for user.');
      if (phoneNumberId) {
        await sendWhatsAppText(
          phoneNumberId,
          phone,
          'Hola. No hay servicios disponibles en este momento.'
        );
      }
      return;
    }

    // Check for explicit service selection
    const selection = parseServiceSelection(services, text, true);
    if (selection) {
      await this.switchToService(phone, senderName, text, selection, phoneNumberId, conv);
      return;
    }

    // No selection → generic AI agent responds
    await this.respondWithGenericAgent(phone, senderName, text, services, phoneNumberId, conv);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 1 → Phase 2 transition: create ticket and activate service agent
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Transition from pre_selection to active:
   * create Jira ticket, save mapping, send confirmation to customer, post first comment.
   *
   * @param confirmationText - Optional custom message from the generic agent.
   *                           Falls back to a default if not provided.
   */
  private async switchToService(
    phone: string,
    senderName: string,
    text: string,
    selection: { serviceId: string; serviceName: string },
    phoneNumberId: string,
    conv: { user_id: number },
    confirmationText?: string
  ): Promise<void> {
    const userId = conv.user_id;
    const customerInfo = {
      name: senderName,
      email: `${phone.replace(/\D/g, '')}@whatsapp.placeholder`,
      phone
    };

    try {
      const result = await this.serviceTicketController.createTicketForWhatsApp(
        userId,
        selection.serviceId,
        customerInfo
      );

      await WhatsAppConversationService.activateConversation(
        phone,
        result.issueKey,
        selection.serviceId
      );

      console.log(
        `📱 [WhatsApp] ${phone} → service "${selection.serviceName}" → ticket ${result.issueKey}`
      );

      // Send confirmation (use agent's text if available, otherwise default)
      if (phoneNumberId) {
        const msg =
          confirmationText ||
          `Te hemos conectado con *${selection.serviceName}*. Un agente te atenderá en breve. ¿En qué podemos ayudarte?`;
        await sendWhatsAppText(phoneNumberId, phone, msg);
      }

      // Forward the triggering message to Jira as first comment
      const firstComment = `Usuario conectado al servicio: ${selection.serviceName}. Mensaje: ${text}`;
      await this.addMessageToTicket(
        phone,
        senderName,
        firstComment,
        result.issueKey,
        selection.serviceId,
        userId
      );
    } catch (err) {
      console.error('❌ WhatsApp: failed to create ticket after service selection:', err);
      if (phoneNumberId) {
        await sendWhatsAppText(
          phoneNumberId,
          phone,
          'No pudimos conectar con ese servicio. Por favor intenta de nuevo o elige otra opción.'
        );
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 1: generic agent responds using function calling
  //
  // The agent can either:
  //   a) Reply conversationally (guide the user, answer questions about services)
  //   b) Call select_service(service_id) when the customer has decided
  //
  // Case (b) triggers the Phase 1 → Phase 2 transition directly from within
  // the agent, without requiring the customer to type an exact number/name.
  // ─────────────────────────────────────────────────────────────────────────
  private async respondWithGenericAgent(
    phone: string,
    senderName: string,
    text: string,
    services: RoutableService[],
    phoneNumberId: string,
    conv: { user_id: number; openai_thread_id: string | null }
  ): Promise<void> {
    const userId = conv.user_id;

    try {
      const user = await User.findByPk(userId);
      if (!user || !user.openaiToken) {
        console.warn('⚠️ WhatsApp: default user has no OpenAI token. Falling back to list.');
        if (phoneNumberId) {
          await sendWhatsAppText(phoneNumberId, phone, this.buildServiceListMessage(services));
        }
        return;
      }

      const result = await WhatsAppAgentService.processMessage(
        user.openaiToken,
        userId,
        phone,
        text,
        services.map((s) => ({ serviceId: s.serviceId, serviceName: s.serviceName })),
        conv.openai_thread_id
      );

      if (result.type === 'select_service') {
        // ── Agent decided the customer wants a service ──────────────────
        console.log(`📱 [WhatsApp] Agent triggered service switch → ${result.serviceId}`);
        await this.switchToService(
          phone,
          senderName,
          text,
          { serviceId: result.serviceId, serviceName: result.serviceName },
          phoneNumberId,
          conv,
          result.text  // Use the agent's own confirmation message
        );
        return;
      }

      // ── Conversational reply ──────────────────────────────────────────
      if (result.text) {
        if (phoneNumberId) {
          const sendResult = await sendWhatsAppText(phoneNumberId, phone, result.text);
          if (sendResult.success) {
            console.log(`📱 [WhatsApp] Generic agent replied to ${phone}`);
          } else {
            console.warn(`⚠️ WhatsApp send failed for ${phone}: ${sendResult.error}`);
          }
        }
      } else {
        // Agent returned empty text (service not configured or error) → fallback list
        console.warn('⚠️ WhatsApp: generic agent returned empty response. Falling back to list.');
        if (phoneNumberId) {
          await sendWhatsAppText(phoneNumberId, phone, this.buildServiceListMessage(services));
        }
      }
    } catch (err) {
      console.error('❌ WhatsApp: generic agent error:', err);
      if (phoneNumberId) {
        await sendWhatsAppText(phoneNumberId, phone, this.buildServiceListMessage(services)).catch(() => {});
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2: add customer message to Jira ticket as a comment
  // ─────────────────────────────────────────────────────────────────────────
  private async addMessageToTicket(
    phone: string,
    senderName: string,
    text: string,
    issueKey: string,
    serviceId: string,
    userId: number
  ): Promise<void> {
    const jiraCredentials = await this.getJiraCredentials(userId, serviceId);
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
      console.log(`✅ [WhatsApp] Comment added to ${issueKey}`);
    } catch (err) {
      console.error(`❌ WhatsApp: failed to add comment to ${issueKey}:`, err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────
  private async getJiraCredentials(
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

  private buildServiceListMessage(services: RoutableService[]): string {
    const lines = [
      'Hola, soy *Asistente Movonte*.',
      '',
      'Nuestros servicios disponibles:',
      ...services.map((s, i) => `${i + 1}. ${s.serviceName}`),
      '',
      'Responde con el *número* o el *nombre del servicio* para continuar.'
    ];
    return lines.join('\n');
  }
}
