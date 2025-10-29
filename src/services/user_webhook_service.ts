import { sequelize } from '../config/database';

export interface UserWebhook {
  id: number;
  userId: number;
  serviceId?: string;
  serviceName?: string;
  assistantId?: string;
  token?: string;
  name: string;
  url: string;
  description?: string;
  isEnabled: boolean;
  filterEnabled: boolean;
  filterCondition?: string;
  filterValue?: string;
  createdAt: string;
  updatedAt?: string;
}

export class UserWebhookService {
  private static instance: UserWebhookService;

  public static getInstance(): UserWebhookService {
    if (!UserWebhookService.instance) {
      UserWebhookService.instance = new UserWebhookService();
    }
    return UserWebhookService.instance;
  }

  /**
   * Obtiene webhooks activos para un usuario específico
   * Filtra por serviceId y jiraProjectKey si se proporcionan
   */
  async getActiveWebhooksForUser(
    userId: number, 
    serviceId?: string
  ): Promise<UserWebhook[]> {
    try {
      console.log(`🔍 Buscando webhooks activos para usuario ${userId}, servicio: ${serviceId}`);
      
      let whereClause = 'uw.user_id = ? AND uw.is_enabled = true';
      const replacements: any[] = [userId];

      if (serviceId) {
        whereClause += ' AND (uw.service_id IS NULL OR CAST(uw.service_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(? AS CHAR) COLLATE utf8mb4_unicode_ci)';
        replacements.push(serviceId);
      }

      const [webhooks] = await sequelize.query(`
        SELECT 
          uw.id,
          uw.user_id as userId,
          uw.service_id as serviceId,
          uw.assistant_id as assistantId,
          uw.token,
          uw.name,
          uw.url,
          uw.description,
          uw.is_enabled as isEnabled,
          uw.filter_enabled as filterEnabled,
          uw.filter_condition as filterCondition,
          uw.filter_value as filterValue,
          uw.created_at as createdAt,
          uw.updated_at as updatedAt,
          uc.service_name as serviceName
        FROM user_webhooks uw
        LEFT JOIN unified_configurations uc 
          ON CAST(uw.service_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(uc.service_id AS CHAR) COLLATE utf8mb4_unicode_ci
          AND uw.user_id = uc.user_id
        WHERE ${whereClause}
        ORDER BY uw.created_at DESC
      `, {
        replacements
      });

      console.log(`✅ Encontrados ${(webhooks as any[]).length} webhooks activos`);
      return webhooks as UserWebhook[];
    } catch (error) {
      console.error('❌ Error obteniendo webhooks activos:', error);
      return [];
    }
  }

  /**
   * Verifica si un webhook debe ejecutarse basado en su filtro
   */
  shouldExecuteWebhook(webhook: UserWebhook, assistantResponse: any): boolean {
    console.log(`🔍 === WEBHOOK FILTER CHECK START (Webhook: ${webhook.name}) ===`);
    console.log(`📋 Webhook config:`, {
      isEnabled: webhook.isEnabled,
      filterEnabled: webhook.filterEnabled,
      filterValue: webhook.filterValue
    });
    console.log(`📝 Assistant response:`, assistantResponse);

    if (!webhook.isEnabled) {
      console.log(`❌ Webhook not enabled`);
      return false;
    }

    if (!webhook.filterEnabled) {
      console.log(`✅ Filter disabled, executing webhook`);
      return true;
    }

    // Extraer el valor del JSON de respuesta del asistente
    let responseValue = null;
    try {
      if (typeof assistantResponse === 'string') {
        const parsed = JSON.parse(assistantResponse);
        responseValue = parsed.value;
      } else if (typeof assistantResponse === 'object' && assistantResponse?.value) {
        responseValue = assistantResponse.value;
      }
    } catch (error) {
      console.log(`⚠️ Could not parse assistant response as JSON`);
    }

    console.log(`📝 Extracted response value: "${responseValue}"`);
    
    // LÓGICA: Solo ejecutar si el valor de la respuesta coincide con el filtro configurado
    const shouldExecute = responseValue === webhook.filterValue;
    
    console.log(`🔍 Filter logic: responseValue="${responseValue}", filterValue="${webhook.filterValue}", shouldExecute=${shouldExecute}`);
    console.log(`🔍 === WEBHOOK FILTER CHECK END ===`);
    
    return shouldExecute;
  }

  /**
   * Ejecuta un webhook específico
   */
  async executeWebhook(webhook: UserWebhook, payload: any): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    try {
      console.log(`🚀 Ejecutando webhook: ${webhook.name} (${webhook.url})`);
      
      const axios = await import('axios');
      const headers: any = {
        'Content-Type': 'application/json',
        'User-Agent': 'Movonte-User-Webhook/1.0',
        'X-Webhook-Name': webhook.name,
        'X-Webhook-Id': webhook.id.toString()
      };


      // Determinar si es un webhook de Jira Automation
      const isJiraAutomation = webhook.url.includes('api-private.atlassian.com/automation/webhooks');
      
      let webhookPayload: any;
      
      if (isJiraAutomation) {
        // Formato para Jira Automation webhook (que funcionaba antes)
        webhookPayload = {
          issues: [payload.issueKey],
          webhookData: {
            message: payload.originalMessage,
            author: payload.authorName,
            timestamp: payload.timestamp,
            source: 'jira-comment',
            threadId: `webhook_${payload.issueKey}_${Date.now()}`,
            assistantId: webhook.assistantId || 'default',
            assistantName: webhook.name,
            response: payload.assistantResponse || 'Webhook triggered by Movonte ChatBot',
            context: {
              isWebhookFlow: true,
              originalIssueKey: payload.issueKey,
              userId: payload.userId,
              serviceId: payload.serviceId,
              webhookId: webhook.id
            },
            originalIssueKey: payload.issueKey,
            shouldUpdateExisting: true,
            action: 'add_comment',
            instruction: 'Add this as a comment to the existing ticket, do not create a new ticket'
          }
        };
        
        // Agregar token de automation si está configurado
        if (webhook.token) {
          headers['X-Automation-Webhook-Token'] = webhook.token;
        }
        
        console.log(`🤖 Enviando a Jira Automation webhook con formato especial`);
      } else {
        // Formato estándar para webhooks REST
        webhookPayload = {
          event: 'comment_created',
          timestamp: new Date().toISOString(),
          issue: {
            key: payload.issueKey,
            summary: 'Ticket from Movonte ChatBot'
          },
          comment: {
            body: payload.originalMessage,
            author: {
              displayName: payload.authorName
            },
            created: payload.timestamp
          },
          movonte: {
            userId: payload.userId,
            serviceId: payload.serviceId,
            webhookId: webhook.id,
            webhookName: webhook.name
          }
        };
        
        // Agregar token de autenticación si está configurado
        if (webhook.token) {
          headers['Authorization'] = `Bearer ${webhook.token}`;
          headers['X-Webhook-Token'] = webhook.token;
        }
        
        console.log(`📡 Enviando a webhook REST estándar`);
      }

      const response = await axios.default.post(webhook.url, webhookPayload, {
        headers,
        timeout: 10000 // 10 segundos timeout
      });

      console.log(`✅ Webhook ejecutado exitosamente: ${webhook.name}`);
      console.log(`📊 Status: ${response.status}, Response:`, response.data);
      
      return { success: true };
    } catch (error) {
      console.error(`❌ Error ejecutando webhook ${webhook.name}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  /**
   * Ejecuta todos los webhooks activos para un usuario y contexto específico
   */
  async executeUserWebhooks(
    userId: number,
    serviceId: string,
    assistantResponse: any,
    payload: any
  ): Promise<void> {
    try {
      console.log(`🚀 Ejecutando webhooks paralelos para usuario ${userId}, servicio ${serviceId}`);
      
      // Obtener webhooks activos para este contexto
      const activeWebhooks = await this.getActiveWebhooksForUser(userId, serviceId);
      
      if (activeWebhooks.length === 0) {
        console.log(`⚠️ No hay webhooks activos para este contexto`);
        return;
      }

      console.log(`📋 Encontrados ${activeWebhooks.length} webhooks para ejecutar`);

      // Ejecutar cada webhook en paralelo
      const webhookPromises = activeWebhooks.map(async (webhook) => {
        // Verificar si debe ejecutarse según el filtro
        if (this.shouldExecuteWebhook(webhook, assistantResponse)) {
          console.log(`✅ Ejecutando webhook: ${webhook.name}`);
          return this.executeWebhook(webhook, payload);
        } else {
          console.log(`⏭️ Saltando webhook: ${webhook.name} (no cumple filtro)`);
          return { success: true, skipped: true };
        }
      });

      const results = await Promise.allSettled(webhookPromises);
      
      // Log de resultados
      results.forEach((result, index) => {
        const webhook = activeWebhooks[index];
        if (result.status === 'fulfilled') {
          if ('skipped' in result.value && result.value.skipped) {
            console.log(`⏭️ Webhook ${webhook.name} saltado`);
          } else {
            console.log(`✅ Webhook ${webhook.name} ejecutado: ${result.value.success ? 'éxito' : 'error'}`);
          }
        } else {
          console.error(`❌ Webhook ${webhook.name} falló:`, result.reason);
        }
      });

    } catch (error) {
      console.error('❌ Error ejecutando webhooks de usuario:', error);
    }
  }
}