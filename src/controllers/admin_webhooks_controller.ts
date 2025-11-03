import { Request, Response } from 'express';
import { User } from '../models';

export class AdminWebhooksController {
  
  // Obtener todos los webhooks (admin)
  async getAllWebhooks(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requieren permisos de administrador.'
        });
        return;
      }

      const { sequelize } = await import('../config/database');
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
          uc.service_name as serviceName,
          u.email as userEmail
        FROM user_webhooks uw
        LEFT JOIN unified_configurations uc 
          ON CAST(uw.service_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(uc.service_id AS CHAR) COLLATE utf8mb4_unicode_ci
          AND uw.user_id = uc.user_id
        LEFT JOIN users u ON uw.user_id = u.id
        ORDER BY uw.created_at DESC
      `);

      res.json({
        success: true,
        data: {
          webhooks: webhooks
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo webhooks de admin:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Crear webhook como admin (se guarda en user_webhooks)
  async createWebhook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requieren permisos de administrador.'
        });
        return;
      }

      const {
        userId,
        name,
        url,
        description,
        serviceId,
        assistantId,
        token,
        filterEnabled,
        filterCondition,
        filterValue
      } = req.body;

      if (!userId || !name || !url) {
        res.status(400).json({
          success: false,
          error: 'userId, name y url son requeridos'
        });
        return;
      }

      // Verificar que el usuario existe
      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      // Verificar que el servicio existe si se especifica
      if (serviceId) {
        const { sequelize } = await import('../config/database');
        const [services] = await sequelize.query(`
          SELECT id FROM unified_configurations
          WHERE user_id = ? AND CAST(service_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(? AS CHAR) COLLATE utf8mb4_unicode_ci
          LIMIT 1
        `, {
          replacements: [userId, serviceId]
        });
        if ((services as any[]).length === 0) {
          res.status(400).json({ 
            success: false, 
            error: 'El servicio especificado no existe o no pertenece al usuario' 
          });
          return;
        }
      }

      // Crear webhook en user_webhooks
      const { UserWebhook } = await import('../models');
      const savedWebhook = await UserWebhook.create({
        userId: userId,
        serviceId: serviceId || null,
        assistantId: assistantId || null,
        token: token || null,
        name,
        url,
        description: description || null,
        isEnabled: true,
        filterEnabled: filterEnabled || false,
        filterCondition: filterCondition || null,
        filterValue: filterValue || null
      });

      console.log(`✅ Webhook de admin creado para usuario ${userId}:`, {
        id: savedWebhook.id,
        name,
        serviceId,
        token: token ? '***' : null
      });

      res.json({
        success: true,
        message: 'Webhook creado exitosamente',
        data: {
          id: savedWebhook.id,
          userId: savedWebhook.userId,
          serviceId: savedWebhook.serviceId,
          assistantId: savedWebhook.assistantId,
          token: savedWebhook.token,
          name: savedWebhook.name,
          url: savedWebhook.url,
          description: savedWebhook.description,
          isEnabled: savedWebhook.isEnabled,
          filterEnabled: savedWebhook.filterEnabled,
          filterCondition: savedWebhook.filterCondition,
          filterValue: savedWebhook.filterValue,
          createdAt: savedWebhook.createdAt,
          updatedAt: savedWebhook.updatedAt
        }
      });
    } catch (error) {
      console.error('❌ Error creando webhook de admin:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Actualizar webhook como admin
  async updateWebhook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requieren permisos de administrador.'
        });
        return;
      }

      const { id } = req.params;
      const {
        name, url, description, serviceId, assistantId, token,
        isEnabled, filterEnabled, filterCondition, filterValue
      } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID del webhook es requerido'
        });
        return;
      }

      // Verificar que el webhook existe
      const { UserWebhook } = await import('../models');
      const existingWebhook = await UserWebhook.findByPk(id);
      if (!existingWebhook) {
        res.status(404).json({
          success: false,
          error: 'Webhook no encontrado'
        });
        return;
      }

      // Verificar que el servicio existe si se especifica
      if (serviceId) {
        const { sequelize } = await import('../config/database');
        const [services] = await sequelize.query(`
          SELECT id FROM unified_configurations
          WHERE user_id = ? AND CAST(service_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(? AS CHAR) COLLATE utf8mb4_unicode_ci
          LIMIT 1
        `, {
          replacements: [existingWebhook.userId, serviceId]
        });
        if ((services as any[]).length === 0) {
          res.status(400).json({ 
            success: false, 
            error: 'El servicio especificado no existe o no pertenece al usuario' 
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
        assistantId: assistantId !== undefined ? (assistantId || null) : existingWebhook.assistantId,
        token: token !== undefined ? (token || null) : existingWebhook.token,
        isEnabled: isEnabled !== undefined ? isEnabled : existingWebhook.isEnabled,
        filterEnabled: filterEnabled !== undefined ? filterEnabled : existingWebhook.filterEnabled,
        filterCondition: filterCondition !== undefined ? (filterCondition || null) : existingWebhook.filterCondition,
        filterValue: filterValue !== undefined ? (filterValue || null) : existingWebhook.filterValue
      });

      res.json({
        success: true,
        message: 'Webhook actualizado exitosamente',
        data: {
          id: existingWebhook.id,
          userId: existingWebhook.userId,
          serviceId: existingWebhook.serviceId,
          assistantId: existingWebhook.assistantId,
          token: existingWebhook.token,
          name: existingWebhook.name,
          url: existingWebhook.url,
          description: existingWebhook.description,
          isEnabled: existingWebhook.isEnabled,
          filterEnabled: existingWebhook.filterEnabled,
          filterCondition: existingWebhook.filterCondition,
          filterValue: existingWebhook.filterValue,
          createdAt: existingWebhook.createdAt,
          updatedAt: existingWebhook.updatedAt
        }
      });
    } catch (error) {
      console.error('❌ Error actualizando webhook de admin:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Eliminar webhook como admin
  async deleteWebhook(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requieren permisos de administrador.'
        });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID del webhook es requerido'
        });
        return;
      }

      // Verificar que el webhook existe
      const { UserWebhook } = await import('../models');
      const existingWebhook = await UserWebhook.findByPk(id);
      if (!existingWebhook) {
        res.status(404).json({
          success: false,
          error: 'Webhook no encontrado'
        });
        return;
      }

      // Eliminar webhook
      await existingWebhook.destroy();

      res.json({
        success: true,
        message: 'Webhook eliminado exitosamente'
      });
    } catch (error) {
      console.error('❌ Error eliminando webhook de admin:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}


