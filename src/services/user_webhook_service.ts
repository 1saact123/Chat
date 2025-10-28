import { sequelize } from '../config/database';

export interface UserWebhook {
  id: number;
  userId: number;
  serviceId?: string;
  serviceName?: string;
  jiraProjectKey?: string;
  assistantId?: string;
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
    serviceId?: string, 
    jiraProjectKey?: string
  ): Promise<UserWebhook[]> {
    try {
      console.log(`🔍 Buscando webhooks activos para usuario ${userId}, servicio: ${serviceId}, proyecto: ${jiraProjectKey}`);
      
      let whereClause = 'uw.user_id = ? AND uw.is_enabled = true';
      const replacements: any[] = [userId];

      if (serviceId) {
        whereClause += ' AND (uw.service_id IS NULL OR CAST(uw.service_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(? AS CHAR) COLLATE utf8mb4_unicode_ci)';
        replacements.push(serviceId);
      }

      if (jiraProjectKey) {
        whereClause += ' AND (uw.jira_project_key IS NULL OR uw.jira_project_key = ?)';
        replacements.push(jiraProjectKey);
      }

      const [webhooks] = await sequelize.query(`
        SELECT 
          uw.id,
          uw.user_id as userId,
          uw.service_id as serviceId,
          uw.jira_project_key as jiraProjectKey,
          uw.assistant_id as assistantId,
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
      const response = await axios.default.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Movonte-User-Webhook/1.0',
          'X-Webhook-Name': webhook.name,
          'X-Webhook-Id': webhook.id.toString()
        },
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
    jiraProjectKey: string,
    assistantResponse: any,
    payload: any
  ): Promise<void> {
    try {
      console.log(`🚀 Ejecutando webhooks paralelos para usuario ${userId}, servicio ${serviceId}, proyecto ${jiraProjectKey}`);
      
      // Obtener webhooks activos para este contexto
      const activeWebhooks = await this.getActiveWebhooksForUser(userId, serviceId, jiraProjectKey);
      
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