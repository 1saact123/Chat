import axios from 'axios';
import { ChatbotResponse } from '../types';

export interface WebhookPayload {
  ticketId: string;
  message: string;
  response: string;
  threadId: string;
  timestamp: Date;
  assistantId?: string;
  metadata?: {
    issueKey?: string;
    author?: string;
    source?: string;
  };
}

export interface WebhookConfig {
  url: string;
  enabled: boolean;
  timeout?: number;
  retries?: number;
}

export class WebhookService {
  private static instance: WebhookService;
  private config: WebhookConfig | null = null;

  private constructor() {}

  public static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  // Configurar webhook
  public setWebhookConfig(config: WebhookConfig): void {
    this.config = config;
    console.log(`🔗 Webhook configurado: ${config.url} (enabled: ${config.enabled})`);
  }

  // Obtener configuración actual
  public getWebhookConfig(): WebhookConfig | null {
    return this.config;
  }

  // Enviar datos al webhook
  public async sendToWebhook(payload: WebhookPayload): Promise<{ success: boolean; error?: string }> {
    if (!this.config || !this.config.enabled || !this.config.url) {
      console.log('⚠️ Webhook no configurado o deshabilitado');
      return { success: false, error: 'Webhook no configurado' };
    }

    try {
      console.log(`📤 Enviando datos al webhook: ${this.config.url}`);
      console.log('📦 Payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(this.config.url, payload, {
        timeout: this.config.timeout || 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Movonte-Chatbot-Webhook/1.0'
        }
      });

      console.log(`✅ Webhook enviado exitosamente: ${response.status}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error enviando webhook:', error);
      
      // Intentar reintentos si están configurados
      if (this.config.retries && this.config.retries > 0) {
        console.log(`🔄 Reintentando webhook (${this.config.retries} intentos restantes)...`);
        this.config.retries--;
        return await this.sendToWebhook(payload);
      }

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  // Crear payload desde respuesta de chatbot
  public createPayloadFromResponse(
    chatbotResponse: ChatbotResponse, 
    originalMessage: string, 
    ticketId: string,
    metadata?: any
  ): WebhookPayload {
    return {
      ticketId,
      message: originalMessage,
      response: chatbotResponse.response || '',
      threadId: chatbotResponse.threadId,
      timestamp: new Date(),
      assistantId: metadata?.assistantId,
      metadata: {
        issueKey: metadata?.issueKey,
        author: metadata?.author,
        source: metadata?.source || 'chatbot'
      }
    };
  }

  // Probar conexión al webhook
  public async testWebhook(): Promise<{ success: boolean; error?: string; response?: any }> {
    if (!this.config || !this.config.url) {
      return { success: false, error: 'Webhook no configurado' };
    }

    try {
      const testPayload: WebhookPayload = {
        ticketId: 'TEST-' + Date.now(),
        message: 'Mensaje de prueba',
        response: 'Respuesta de prueba del chatbot',
        threadId: 'test-thread',
        timestamp: new Date(),
        metadata: {
          source: 'test'
        }
      };

      const response = await axios.post(this.config.url, testPayload, {
        timeout: this.config.timeout || 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Movonte-Chatbot-Webhook/1.0'
        }
      });

      return { 
        success: true, 
        response: {
          status: response.status,
          data: response.data
        }
      };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }
}
