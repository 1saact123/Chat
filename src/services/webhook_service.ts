import axios from 'axios';
import { ConfigurationService } from './configuration_service';

export interface WebhookPayload {
  issueKey: string;
  message: string;
  author: string;
  timestamp: string;
  source: 'jira-comment' | 'widget-message';
  threadId: string;
  assistantId?: string;
  assistantName?: string;
  response?: string;
  context?: any;
}

export class WebhookService {
  private static instance: WebhookService;
  private configService: ConfigurationService;

  private constructor() {
    this.configService = ConfigurationService.getInstance();
  }

  public static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  /**
   * Envía datos al webhook configurado
   */
  async sendToWebhook(payload: WebhookPayload): Promise<{ success: boolean; error?: string }> {
    try {
      const webhookUrl = this.configService.getWebhookUrl();
      
      if (!webhookUrl) {
        console.log('⚠️ No webhook URL configured, skipping webhook send');
        return { success: true };
      }

      console.log(`📡 Enviando datos al webhook: ${webhookUrl}`);
      console.log(`📦 Payload:`, {
        issueKey: payload.issueKey,
        message: payload.message.substring(0, 100) + '...',
        author: payload.author,
        source: payload.source,
        threadId: payload.threadId
      });

      // Determinar si es un webhook de Jira Automation
      const isJiraAutomation = webhookUrl.includes('api-private.atlassian.com/automation/webhooks');
      
      let requestPayload: any;
      let headers: any = {
        'Content-Type': 'application/json',
        'User-Agent': 'Movonte-Chat-System/1.0'
      };

      if (isJiraAutomation) {
        // Formato para Jira Automation webhook
        requestPayload = {
          issues: [payload.issueKey],
          // Datos adicionales que puede usar la automation
          webhookData: {
            message: payload.message,
            author: payload.author,
            timestamp: payload.timestamp,
            source: payload.source,
            threadId: payload.threadId,
            assistantId: payload.assistantId,
            assistantName: payload.assistantName,
            response: payload.response,
            context: payload.context,
            // Campos específicos para controlar el comportamiento
            originalIssueKey: payload.issueKey,
            shouldUpdateExisting: true,
            action: 'add_comment',
            instruction: 'Add this as a comment to the existing ticket, do not create a new ticket'
          }
        };
        
        // Agregar token de automation si está configurado
        const automationToken = process.env.JIRA_AUTOMATION_TOKEN;
        if (automationToken) {
          headers['X-Automation-Webhook-Token'] = automationToken;
        }
        
        console.log(`🤖 Enviando a Jira Automation webhook con formato especial`);
      } else {
        // Formato estándar para webhooks REST
        requestPayload = payload;
        console.log(`📡 Enviando a webhook REST estándar`);
      }

      const response = await axios.post(webhookUrl, requestPayload, {
        headers,
        timeout: 10000 // 10 segundos timeout
      });

      console.log(`✅ Webhook enviado exitosamente:`, {
        status: response.status,
        statusText: response.statusText,
        webhookType: isJiraAutomation ? 'Jira Automation' : 'REST'
      });

      return { success: true };

    } catch (error) {
      console.error('❌ Error enviando webhook:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('   Status:', error.response?.status);
        console.error('   Data:', error.response?.data);
        console.error('   Message:', error.message);
      }

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Envía datos de comentario de Jira al webhook
   */
  async sendJiraCommentToWebhook(
    issueKey: string, 
    message: string, 
    author: string, 
    timestamp: string,
    threadId: string,
    assistantId?: string,
    assistantName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const payload: WebhookPayload = {
      issueKey,
      message,
      author,
      timestamp,
      source: 'jira-comment',
      threadId,
      assistantId,
      assistantName
    };

    return await this.sendToWebhook(payload);
  }

  /**
   * Envía datos de mensaje del widget al webhook
   */
  async sendWidgetMessageToWebhook(
    issueKey: string,
    message: string,
    author: string,
    timestamp: string,
    threadId: string,
    response?: string,
    context?: any
  ): Promise<{ success: boolean; error?: string }> {
    const payload: WebhookPayload = {
      issueKey,
      message,
      author,
      timestamp,
      source: 'widget-message',
      threadId,
      response,
      context
    };

    return await this.sendToWebhook(payload);
  }

  /**
   * Envía respuesta de IA al webhook
   */
  async sendAIResponseToWebhook(
    issueKey: string,
    originalMessage: string,
    aiResponse: string,
    threadId: string,
    assistantId: string,
    assistantName: string,
    context?: any
  ): Promise<{ success: boolean; error?: string }> {
    const payload: WebhookPayload = {
      issueKey,
      message: originalMessage,
      author: 'AI Assistant',
      timestamp: new Date().toISOString(),
      source: 'jira-comment',
      threadId,
      assistantId,
      assistantName,
      response: aiResponse,
      context
    };

    return await this.sendToWebhook(payload);
  }
}
