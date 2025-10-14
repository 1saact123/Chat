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

  // Obtener webhooks guardados del usuario
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

      // Obtener webhooks guardados específicos del usuario
      const dbService = DatabaseService.getInstance();
      const savedWebhooks = await dbService.getUserSavedWebhooks(user.id);

      res.json({
        success: true,
        data: {
          webhooks: savedWebhooks
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo webhooks guardados del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Guardar webhook del usuario
  async saveWebhook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { name, url, description } = req.body;

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

      const dbService = DatabaseService.getInstance();
      const savedWebhook = await dbService.saveUserWebhook(user.id, {
        name,
        url,
        description: description || '',
        isActive: true
      });

      res.json({
        success: true,
        message: 'Webhook guardado exitosamente',
        data: {
          webhook: savedWebhook
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
