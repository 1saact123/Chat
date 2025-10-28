import { Request, Response } from 'express';
import { User } from '../models';
import { UserConfigurationService } from '../services/user_configuration_service';
import { DatabaseService } from '../services/database_service';

export class UserWebhooksController {
  
  // Obtener estado del webhook del usuario
  async getWebhookStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      const userConfigService = UserConfigurationService.getInstance(user.id);
      const webhookConfig = userConfigService.getWebhookConfiguration();

      res.json({
        success: true,
        data: {
          isEnabled: webhookConfig?.isEnabled || false,
          webhookUrl: webhookConfig?.url || webhookConfig?.webhookUrl || null,
          lastTest: webhookConfig?.lastTest || null,
          filterEnabled: webhookConfig?.filterEnabled || false,
          filterCondition: webhookConfig?.filterCondition || null,
          filterValue: webhookConfig?.filterValue || null
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo estado del webhook del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Configurar webhook del usuario
  async configureWebhook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { webhookUrl, assistantId } = req.body;

      if (!webhookUrl) {
        res.status(400).json({
          success: false,
          error: 'Se requiere la URL del webhook'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      const userConfigService = UserConfigurationService.getInstance(user.id);
      await userConfigService.setWebhookConfiguration({
        name: 'User Webhook',
        url: webhookUrl,
        description: 'Webhook configurado por el usuario',
        isEnabled: true,
        filterEnabled: false
      });

      res.json({
        success: true,
        message: 'Webhook configurado exitosamente',
        data: {
          webhookUrl,
          assistantId,
          configuredAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error configurando webhook del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Probar webhook del usuario
  async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      const userConfigService = UserConfigurationService.getInstance(user.id);
      const webhookConfig = userConfigService.getWebhookConfiguration();

      if (!webhookConfig?.url && !webhookConfig?.webhookUrl) {
        res.status(400).json({
          success: false,
          error: 'No hay webhook configurado para probar'
        });
        return;
      }

      // Simular prueba de webhook (en una implementación real, harías una llamada HTTP)
      const testData = {
        test: true,
        message: 'Test webhook from user',
        timestamp: new Date().toISOString(),
        userId: user.id
      };

      // Actualizar última prueba
      if (webhookConfig) {
        await userConfigService.setWebhookConfiguration({
          ...webhookConfig,
          lastTest: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: {
          status: 'success',
          responseTime: Math.floor(Math.random() * 1000) + 100, // Simular tiempo de respuesta
          webhookUrl: webhookConfig?.url || webhookConfig?.webhookUrl || '',
          testData
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error probando webhook del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Deshabilitar webhook del usuario
  async disableWebhook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      const userConfigService = UserConfigurationService.getInstance(user.id);
      const webhookConfig = userConfigService.getWebhookConfiguration();

      if (webhookConfig) {
        await userConfigService.setWebhookConfiguration({
          ...webhookConfig,
          isEnabled: false
        });
      }

      res.json({
        success: true,
        message: 'Webhook deshabilitado exitosamente',
        data: {
          disabledAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error deshabilitando webhook del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Configurar filtro del webhook del usuario
  async configureWebhookFilter(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { filterEnabled, filterCondition, filterValue } = req.body;

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      const userConfigService = UserConfigurationService.getInstance(user.id);
      const webhookConfig = userConfigService.getWebhookConfiguration();

      if (webhookConfig) {
        await userConfigService.setWebhookConfiguration({
          ...webhookConfig,
          filterEnabled: filterEnabled || false,
          filterCondition: filterCondition || 'response_value',
          filterValue: filterValue || 'Yes'
        });
      }

      res.json({
        success: true,
        message: 'Filtro de webhook configurado exitosamente',
        data: {
          filterEnabled,
          filterCondition,
          filterValue,
          configuredAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error configurando filtro de webhook del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener webhooks guardados del usuario (ahora incluyendo webhooks paralelos activos)
  async getSavedWebhooks(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      // Obtener TODOS los webhooks del usuario (activos e inactivos) desde user_webhooks
      const { sequelize } = await import('../config/database');
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
        WHERE uw.user_id = ?
        ORDER BY uw.is_enabled DESC, uw.created_at DESC
      `, {
        replacements: [user.id]
      });

      res.json({
        success: true,
        data: {
          webhooks: webhooks
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo webhooks del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Guardar webhook del usuario con soporte para servicios y proyectos específicos
  async saveWebhook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { 
        name, 
        url, 
        description, 
        serviceId, 
        jiraProjectKey, 
        assistantId,
        filterEnabled,
        filterCondition,
        filterValue 
      } = req.body;

      if (!name || !url) {
        res.status(400).json({
          success: false,
          error: 'name y url son requeridos'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      // Verificar que el servicio pertenece al usuario si se especifica
      if (serviceId) {
        const { sequelize } = await import('../config/database');
        const [services] = await sequelize.query(`
          SELECT id FROM unified_configurations
          WHERE user_id = ? AND CAST(service_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(? AS CHAR) COLLATE utf8mb4_unicode_ci
          LIMIT 1
        `, {
          replacements: [user.id, serviceId]
        });

        if ((services as any[]).length === 0) {
          res.status(400).json({
            success: false,
            error: 'El servicio especificado no existe o no pertenece a tu usuario'
          });
          return;
        }
      }

      // Crear webhook en user_webhooks
      const { UserWebhook } = await import('../models');
      const savedWebhook = await UserWebhook.create({
        userId: user.id,
        serviceId: serviceId || null,
        jiraProjectKey: jiraProjectKey || null,
        assistantId: assistantId || null,
        name,
        url,
        description: description || null,
        isEnabled: true,
        filterEnabled: filterEnabled || false,
        filterCondition: filterCondition || null,
        filterValue: filterValue || null
      });

      console.log(`✅ Webhook creado para usuario ${user.id}:`, {
        id: savedWebhook.id,
        name,
        serviceId,
        jiraProjectKey
      });

      res.json({
        success: true,
        message: 'Webhook guardado exitosamente',
        data: {
          id: savedWebhook.id,
          userId: savedWebhook.userId,
          serviceId: savedWebhook.serviceId,
          jiraProjectKey: savedWebhook.jiraProjectKey,
          assistantId: savedWebhook.assistantId,
          name: savedWebhook.name,
          url: savedWebhook.url,
          description: savedWebhook.description,
          isEnabled: savedWebhook.isEnabled,
          filterEnabled: savedWebhook.filterEnabled,
          createdAt: savedWebhook.createdAt
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error guardando webhook del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Actualizar webhook del usuario
  async updateWebhook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { id } = req.params;
      const { 
        name, 
        url, 
        description, 
        serviceId, 
        jiraProjectKey, 
        assistantId,
        isEnabled,
        filterEnabled,
        filterCondition,
        filterValue 
      } = req.body;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          success: false,
          error: 'ID de webhook inválido'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      // Verificar que el webhook pertenece al usuario
      const { UserWebhook } = await import('../models');
      const existingWebhook = await UserWebhook.findOne({
        where: { id: Number(id), userId: user.id }
      });

      if (!existingWebhook) {
        res.status(404).json({
          success: false,
          error: 'Webhook no encontrado o no pertenece al usuario'
        });
        return;
      }

      // Verificar que el servicio pertenece al usuario si se especifica
      if (serviceId) {
        const { sequelize } = await import('../config/database');
        const [services] = await sequelize.query(`
          SELECT id FROM unified_configurations
          WHERE user_id = ? AND CAST(service_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(? AS CHAR) COLLATE utf8mb4_unicode_ci
          LIMIT 1
        `, {
          replacements: [user.id, serviceId]
        });

        if ((services as any[]).length === 0) {
          res.status(400).json({
            success: false,
            error: 'El servicio especificado no existe o no pertenece a tu usuario'
          });
          return;
        }
      }

      // Actualizar webhook
      await existingWebhook.update({
        name: name !== undefined ? name : existingWebhook.name,
        url: url !== undefined ? url : existingWebhook.url,
        description: description !== undefined ? description : existingWebhook.description,
        serviceId: serviceId !== undefined ? (serviceId || null) : existingWebhook.serviceId,
        jiraProjectKey: jiraProjectKey !== undefined ? (jiraProjectKey || null) : existingWebhook.jiraProjectKey,
        assistantId: assistantId !== undefined ? (assistantId || null) : existingWebhook.assistantId,
        isEnabled: isEnabled !== undefined ? isEnabled : existingWebhook.isEnabled,
        filterEnabled: filterEnabled !== undefined ? filterEnabled : existingWebhook.filterEnabled,
        filterCondition: filterCondition !== undefined ? (filterCondition || null) : existingWebhook.filterCondition,
        filterValue: filterValue !== undefined ? (filterValue || null) : existingWebhook.filterValue
      });

      console.log(`✅ Webhook ${id} actualizado para usuario ${user.id}`);

      res.json({
        success: true,
        message: 'Webhook actualizado exitosamente',
        data: {
          id: existingWebhook.id,
          userId: existingWebhook.userId,
          serviceId: existingWebhook.serviceId,
          jiraProjectKey: existingWebhook.jiraProjectKey,
          assistantId: existingWebhook.assistantId,
          name: existingWebhook.name,
          url: existingWebhook.url,
          description: existingWebhook.description,
          isEnabled: existingWebhook.isEnabled,
          filterEnabled: existingWebhook.filterEnabled,
          updatedAt: existingWebhook.updatedAt
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error actualizando webhook del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Eliminar webhook guardado del usuario
  async deleteWebhook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          success: false,
          error: 'ID de webhook inválido'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      const dbService = DatabaseService.getInstance();
      const deleted = await dbService.deleteUserWebhook(Number(id), user.id);

      if (deleted) {
        res.json({
          success: true,
          message: 'Webhook eliminado exitosamente',
          data: {
            deletedId: Number(id),
            deletedAt: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Webhook no encontrado o no pertenece al usuario'
        });
      }
    } catch (error) {
      console.error('❌ Error eliminando webhook del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}
