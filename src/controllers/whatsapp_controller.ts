/**
 * WhatsApp Cloud API webhook controller.
 *
 * Two-phase conversation model:
 *
 * PHASE 1 – pre_selection
 *   Generic AI agent (whatsapp-generic) handles the conversation.
 *   Services are presented as an interactive list/buttons (WhatsApp Flow).
 *   Selection is detected three ways:
 *     · Customer taps a button or list item  → interactive reply (serviceId direct)
 *     · Customer types a number or exact name → parseServiceSelection()
 *     · Agent calls select_service()          → function calling
 *
 * PHASE 2 – active
 *   Jira ticket created. Every WhatsApp message → Jira comment.
 *   Service-specific agent responds via Jira webhook → chatbot_controller.
 *   AI response is sent back to WhatsApp (bidirectional).
 */

import { Request, Response } from 'express';
import { WhatsAppConversationService } from '../services/whatsapp_conversation_service';
import { WhatsAppAgentService } from '../services/whatsapp_agent_service';
import {
  getRoutableServicesFromDb,
  parseServiceSelection,
  RoutableService
} from '../services/whatsapp_intent_router';
import {
  sendWhatsAppText,
  sendWhatsAppInteractiveServices
} from '../services/whatsapp_send_service';
import { ServiceTicketController } from './service_ticket_controller';
import { UserJiraService } from '../services/user_jira_service';
import { User } from '../models';
import { ServiceJiraAccountsController } from './service_jira_accounts_controller';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'chatbot_webhook_verify';
const DEFAULT_USER_ID = parseInt(process.env.WHATSAPP_DEFAULT_USER_ID || '0', 10);

// Keywords that reset the conversation so the customer can pick a new service.
const RESET_KEYWORDS = ['menu', 'inicio', 'reiniciar', 'reset', 'volver', 'start'];

// ─────────────────────────────────────────────────────────────────────────────
// Webhook payload types
// ─────────────────────────────────────────────────────────────────────────────
interface WaMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

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
              metadata?: { phone_number_id?: string };
              contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
              messages?: WaMessage[];
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
            const phone = msg.from;
            const senderName = contactMap.get(phone) || `+${phone}`;

            // ── Text message ─────────────────────────────────────────────
            if (msg.type === 'text' && msg.text?.body) {
              await this.processIncomingMessage(
                phone, senderName, msg.text.body.trim(), phoneNumberId, msg.id
              );
              continue;
            }

            // ── Interactive reply (button or list tap) ───────────────────
            if (msg.type === 'interactive' && msg.interactive) {
              const reply =
                msg.interactive.button_reply ?? msg.interactive.list_reply ?? null;
              if (reply) {
                await this.processInteractiveReply(
                  phone, senderName, reply.id, reply.title, phoneNumberId, msg.id
                );
              }
            }
          }
        }
      }

      res.status(200).send('ok');
    } catch (error) {
      console.error('❌ WhatsApp webhook error:', error);
      res.status(200).send('ok');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Interactive reply: customer tapped a button or list item
  // The id is the serviceId we set when building the interactive message.
  // ─────────────────────────────────────────────────────────────────────────
  private async processInteractiveReply(
    phone: string,
    senderName: string,
    serviceId: string,
    serviceName: string,
    phoneNumberId: string,
    msgId: string
  ): Promise<void> {
    if (!DEFAULT_USER_ID) return;

    const conv = await WhatsAppConversationService.getOrCreateConversation(
      phone, phoneNumberId, DEFAULT_USER_ID
    );

    if (await WhatsAppConversationService.isMessageProcessed(phone, msgId)) return;
    await WhatsAppConversationService.markMessageProcessed(phone, msgId);

    // Already active → ignore stale interactive reply
    if (conv.state === 'active') return;

    console.log(`📱 [WhatsApp] Interactive tap: ${phone} → service "${serviceName}" (${serviceId})`);

    await this.switchToService(
      phone, senderName, serviceName,
      { serviceId, serviceName },
      phoneNumberId, conv
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core text message dispatcher
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

    const conv = await WhatsAppConversationService.getOrCreateConversation(
      phone, phoneNumberId, DEFAULT_USER_ID
    );

    if (await WhatsAppConversationService.isMessageProcessed(phone, msgId)) {
      console.log(`[WhatsApp] Duplicate msg ${msgId} ignored for ${phone}`);
      return;
    }
    await WhatsAppConversationService.markMessageProcessed(phone, msgId);

    // Reset keyword → volver al menú de servicios
    if (RESET_KEYWORDS.includes(text.toLowerCase())) {
      await WhatsAppConversationService.resetConversation(phone);
      const services = await getRoutableServicesFromDb(DEFAULT_USER_ID);
      if (phoneNumberId && services.length > 0) {
        await sendWhatsAppInteractiveServices(phoneNumberId, phone, services);
      }
      return;
    }

    // ── PHASE 2: active ───────────────────────────────────────────────────
    if (conv.state === 'active' && conv.issue_key && conv.service_id) {
      console.log(`📱 [WhatsApp] Active → ${conv.issue_key}`);
      await this.addMessageToTicket(
        phone, senderName, text, conv.issue_key, conv.service_id, conv.user_id
      );
      return;
    }

    // ── PHASE 1: pre_selection ────────────────────────────────────────────
    const services = await getRoutableServicesFromDb(DEFAULT_USER_ID);

    if (services.length === 0) {
      if (phoneNumberId) {
        await sendWhatsAppText(phoneNumberId, phone, 'No hay servicios disponibles en este momento.');
      }
      return;
    }

    // Typed number or exact service name
    const selection = parseServiceSelection(services, text, true);
    if (selection) {
      await this.switchToService(phone, senderName, text, selection, phoneNumberId, conv);
      return;
    }

    // Generic agent (conversational + function calling)
    await this.respondWithGenericAgent(phone, senderName, text, services, phoneNumberId, conv);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 1 → Phase 2 transition
  // ─────────────────────────────────────────────────────────────────────────
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
        userId, selection.serviceId, customerInfo
      );

      await WhatsAppConversationService.activateConversation(
        phone, result.issueKey, selection.serviceId
      );

      console.log(`📱 [WhatsApp] ${phone} → "${selection.serviceName}" → ticket ${result.issueKey}`);

      if (phoneNumberId) {
        const msg =
          confirmationText ||
          `✅ Te hemos conectado con *${selection.serviceName}*.\n\nUn agente te atenderá en breve. ¿En qué podemos ayudarte?`;
        await sendWhatsAppText(phoneNumberId, phone, msg);
      }

      const firstComment = `Usuario conectado al servicio: ${selection.serviceName}. Mensaje: ${text}`;
      await this.addMessageToTicket(
        phone, senderName, firstComment, result.issueKey, selection.serviceId, userId
      );
    } catch (err) {
      console.error('❌ WhatsApp: failed to create ticket:', err);
      if (phoneNumberId) {
        await sendWhatsAppText(
          phoneNumberId, phone,
          'No pudimos conectar con ese servicio. Por favor intenta de nuevo.'
        );
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 1: generic AI agent
  // Returns text + optionally triggers service switch via function calling.
  // After the agent text response, always sends the interactive services flow.
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
        console.warn('⚠️ WhatsApp: no OpenAI token. Sending interactive list.');
        if (phoneNumberId) {
          await sendWhatsAppInteractiveServices(phoneNumberId, phone, services);
        }
        return;
      }

      const result = await WhatsAppAgentService.processMessage(
        user.openaiToken, userId, phone, text,
        services.map((s) => ({ serviceId: s.serviceId, serviceName: s.serviceName })),
        conv.openai_thread_id
      );

      if (result.type === 'select_service') {
        // Agent detected intent → switch directly
        console.log(`📱 [WhatsApp] Agent triggered switch → ${result.serviceId}`);
        await this.switchToService(
          phone, senderName, text,
          { serviceId: result.serviceId, serviceName: result.serviceName },
          phoneNumberId, conv,
          result.text
        );
        return;
      }

      // Send agent's conversational reply
      if (result.text && phoneNumberId) {
        await sendWhatsAppText(phoneNumberId, phone, result.text);
      }

      // Always follow up with the interactive services menu
      if (phoneNumberId) {
        await sendWhatsAppInteractiveServices(
          phoneNumberId, phone, services,
          'Asistente Movonte',
          'Selecciona el servicio con el que deseas continuar:'
        );
      }
    } catch (err) {
      console.error('❌ WhatsApp: generic agent error:', err);
      if (phoneNumberId) {
        await sendWhatsAppInteractiveServices(phoneNumberId, phone, services).catch(() => {});
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 2: add customer message to Jira ticket
  // ─────────────────────────────────────────────────────────────────────────
  private async addMessageToTicket(
    phone: string,
    senderName: string,
    text: string,
    issueKey: string,
    serviceId: string,
    userId: number
  ): Promise<void> {
    const creds = await this.getJiraCredentials(userId, serviceId);
    if (!creds) {
      console.error('❌ WhatsApp: no Jira credentials for user/service.');
      return;
    }

    const userJiraService = new UserJiraService(userId, creds.token, creds.url, creds.email);
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
    return { email: user.email, token: user.jiraToken, url: (user as any).jiraUrl };
  }
}
