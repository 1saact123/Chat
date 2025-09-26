import { OpenAIService } from './openAI_service';
import { WebhookService, WebhookPayload } from './webhook_service';
import { DatabaseService } from './database_service';
import { ChatbotResponse } from '../types';

export interface ParallelFlowConfig {
  enabled: boolean;
  webhookUrl?: string;
  assistantId?: string; // Asistente diferente para el flujo paralelo
  threadPrefix?: string; // Prefijo para threads separados
  timeout?: number;
}

export interface ParallelFlowResult {
  success: boolean;
  webhookSent: boolean;
  threadId: string;
  response?: string;
  error?: string;
}

export class ParallelFlowService {
  private static instance: ParallelFlowService;
  private openaiService: OpenAIService;
  private webhookService: WebhookService;
  private dbService: DatabaseService;
  private config: ParallelFlowConfig;

  private constructor() {
    this.openaiService = new OpenAIService();
    this.webhookService = WebhookService.getInstance();
    this.dbService = DatabaseService.getInstance();
    this.config = {
      enabled: false,
      threadPrefix: 'parallel_'
    };
  }

  public static getInstance(): ParallelFlowService {
    if (!ParallelFlowService.instance) {
      ParallelFlowService.instance = new ParallelFlowService();
    }
    return ParallelFlowService.instance;
  }

  // Configurar el flujo paralelo
  public configure(config: ParallelFlowConfig): void {
    this.config = { ...this.config, ...config };
    
    // Configurar webhook si está disponible
    if (config.webhookUrl) {
      this.webhookService.setWebhookConfig({
        url: config.webhookUrl,
        enabled: true,
        timeout: config.timeout || 10000,
        retries: 2
      });
    }

    console.log('🔄 Flujo paralelo configurado:', this.config);
  }

  // Procesar mensaje en flujo paralelo
  public async processParallelFlow(
    message: string, 
    ticketId: string, 
    metadata?: any
  ): Promise<ParallelFlowResult> {
    
    if (!this.config.enabled) {
      console.log('⚠️ Flujo paralelo deshabilitado');
      return {
        success: false,
        webhookSent: false,
        threadId: '',
        error: 'Flujo paralelo deshabilitado'
      };
    }

    try {
      console.log(`🔄 Iniciando flujo paralelo para ticket: ${ticketId}`);
      
      // Crear thread separado para el flujo paralelo
      const parallelThreadId = `${this.config.threadPrefix}${ticketId}_${Date.now()}`;
      
      // Contexto específico para el flujo paralelo
      const parallelContext = {
        ...metadata,
        isParallelFlow: true,
        originalTicketId: ticketId,
        threadType: 'parallel',
        assistantId: this.config.assistantId
      };

      // Procesar con IA usando thread separado
      const aiResponse = await this.openaiService.processDirectChat(
        message, 
        parallelThreadId, 
        parallelContext
      );

      if (!aiResponse.success) {
        console.error('❌ Error en respuesta de IA para flujo paralelo:', aiResponse.error);
        return {
          success: false,
          webhookSent: false,
          threadId: parallelThreadId,
          error: aiResponse.error
        };
      }

      console.log('✅ Respuesta de IA generada para flujo paralelo');

      // Enviar al webhook si está configurado
      let webhookSent = false;
      if (this.config.webhookUrl) {
        try {
          const webhookPayload = this.webhookService.createPayloadFromResponse(
            aiResponse,
            message,
            ticketId,
            {
              ...metadata,
              assistantId: this.config.assistantId,
              parallelThreadId,
              originalTicketId: ticketId
            }
          );

          const webhookResult = await this.webhookService.sendToWebhook(webhookPayload);
          webhookSent = webhookResult.success;

          if (webhookSent) {
            console.log('✅ Datos enviados al webhook exitosamente');
          } else {
            console.error('❌ Error enviando al webhook:', webhookResult.error);
          }
        } catch (error) {
          console.error('❌ Error en proceso de webhook:', error);
        }
      }

      // Guardar thread en base de datos
      try {
        await this.dbService.saveThread({
          threadId: parallelThreadId,
          openaiThreadId: aiResponse.threadId,
          ticketId: ticketId,
          isParallel: true,
          createdAt: new Date(),
          lastActivity: new Date()
        });
        console.log('💾 Thread paralelo guardado en BD');
      } catch (error) {
        console.error('❌ Error guardando thread paralelo:', error);
      }

      return {
        success: true,
        webhookSent,
        threadId: parallelThreadId,
        response: aiResponse.response
      };

    } catch (error) {
      console.error('❌ Error en flujo paralelo:', error);
      return {
        success: false,
        webhookSent: false,
        threadId: '',
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Obtener configuración actual
  public getConfig(): ParallelFlowConfig {
    return { ...this.config };
  }

  // Habilitar/deshabilitar flujo paralelo
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`🔄 Flujo paralelo ${enabled ? 'habilitado' : 'deshabilitado'}`);
  }

  // Probar configuración del webhook
  public async testWebhook(): Promise<{ success: boolean; error?: string }> {
    if (!this.config.webhookUrl) {
      return { success: false, error: 'URL de webhook no configurada' };
    }

    return await this.webhookService.testWebhook();
  }

  // Obtener estadísticas del flujo paralelo
  public async getStats(): Promise<{
    enabled: boolean;
    webhookConfigured: boolean;
    totalThreads?: number;
  }> {
    try {
      const threads = await this.dbService.getParallelThreads();
      return {
        enabled: this.config.enabled,
        webhookConfigured: !!this.config.webhookUrl,
        totalThreads: threads?.length || 0
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        enabled: this.config.enabled,
        webhookConfigured: !!this.config.webhookUrl
      };
    }
  }
}
