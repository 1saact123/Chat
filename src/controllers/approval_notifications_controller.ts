import { Request, Response } from 'express';
import { sequelize } from '../config/database';

export class ApprovalNotificationsController {
  
  // Crear notificación de aprobación cuando un usuario crea un servicio
  async createApprovalNotification(userId: number, adminId: number, serviceId: string, serviceName: string, message?: string): Promise<void> {
    try {
      await sequelize.query(`
        INSERT INTO service_approval_notifications 
        (user_id, admin_id, service_id, service_name, status, message, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', ?, NOW(), NOW())
      `, {
        replacements: [userId, adminId, serviceId, serviceName, message || `El usuario ha solicitado aprobación para el servicio '${serviceName}'`]
      });
      
      console.log(`📬 Notificación de aprobación creada para admin ${adminId} del servicio ${serviceName}`);
    } catch (error) {
      console.error('❌ Error creando notificación de aprobación:', error);
      throw error;
    }
  }

  // Obtener notificaciones pendientes para un admin
  async getPendingNotifications(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requieren permisos de administrador'
        });
        return;
      }

      const [notifications] = await sequelize.query(`
        SELECT 
          n.id,
          n.user_id,
          n.service_id,
          n.service_name,
          n.status,
          n.message,
          n.created_at,
          u.username as user_username,
          u.email as user_email
        FROM service_approval_notifications n
        JOIN users u ON n.user_id = u.id
        WHERE n.admin_id = ? AND n.status = 'pending'
        ORDER BY n.created_at DESC
      `, {
        replacements: [req.user.id]
      });

      res.json({
        success: true,
        data: {
          notifications: notifications,
          count: (notifications as any[]).length
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo notificaciones:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Aprobar servicio
  async approveService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requieren permisos de administrador'
        });
        return;
      }

      const { notificationId } = req.params;
      const { message } = req.body;

      // Actualizar notificación
      await sequelize.query(`
        UPDATE service_approval_notifications 
        SET status = 'approved', message = ?, updated_at = NOW()
        WHERE id = ? AND admin_id = ?
      `, {
        replacements: [message || 'Servicio aprobado', notificationId, req.user.id]
      });

      // Obtener información de la notificación
      const [notification] = await sequelize.query(`
        SELECT user_id, service_id, service_name 
        FROM service_approval_notifications 
        WHERE id = ? AND admin_id = ?
      `, {
        replacements: [notificationId, req.user.id]
      });

      if ((notification as any[]).length === 0) {
        res.status(404).json({
          success: false,
          error: 'Notificación no encontrada'
        });
        return;
      }

      const notif = (notification as any[])[0];

      // Activar el servicio en unified_configurations
      await sequelize.query(`
        UPDATE unified_configurations 
        SET is_active = TRUE, 
            configuration = JSON_SET(configuration, '$.adminApproved', TRUE, '$.adminApprovedAt', NOW())
        WHERE user_id = ? AND service_id = ?
      `, {
        replacements: [notif.user_id, notif.service_id]
      });

      res.json({
        success: true,
        message: `Servicio '${notif.service_name}' aprobado exitosamente`
      });

    } catch (error) {
      console.error('❌ Error aprobando servicio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Rechazar servicio
  async rejectService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requieren permisos de administrador'
        });
        return;
      }

      const { notificationId } = req.params;
      const { message } = req.body;

      // Actualizar notificación
      await sequelize.query(`
        UPDATE service_approval_notifications 
        SET status = 'rejected', message = ?, updated_at = NOW()
        WHERE id = ? AND admin_id = ?
      `, {
        replacements: [message || 'Servicio rechazado', notificationId, req.user.id]
      });

      // Obtener información de la notificación
      const [notification] = await sequelize.query(`
        SELECT user_id, service_id, service_name 
        FROM service_approval_notifications 
        WHERE id = ? AND admin_id = ?
      `, {
        replacements: [notificationId, req.user.id]
      });

      if ((notification as any[]).length === 0) {
        res.status(404).json({
          success: false,
          error: 'Notificación no encontrada'
        });
        return;
      }

      const notif = (notification as any[])[0];

      // Desactivar el servicio en unified_configurations
      await sequelize.query(`
        UPDATE unified_configurations 
        SET is_active = FALSE,
            configuration = JSON_SET(configuration, '$.adminApproved', FALSE, '$.adminRejectedAt', NOW())
        WHERE user_id = ? AND service_id = ?
      `, {
        replacements: [notif.user_id, notif.service_id]
      });

      res.json({
        success: true,
        message: `Servicio '${notif.service_name}' rechazado`
      });

    } catch (error) {
      console.error('❌ Error rechazando servicio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener historial de notificaciones para un admin
  async getNotificationHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requieren permisos de administrador'
        });
        return;
      }

      const [notifications] = await sequelize.query(`
        SELECT 
          n.id,
          n.user_id,
          n.service_id,
          n.service_name,
          n.status,
          n.message,
          n.created_at,
          n.updated_at,
          u.username as user_username,
          u.email as user_email
        FROM service_approval_notifications n
        JOIN users u ON n.user_id = u.id
        WHERE n.admin_id = ?
        ORDER BY n.updated_at DESC
        LIMIT 50
      `, {
        replacements: [req.user.id]
      });

      res.json({
        success: true,
        data: {
          notifications: notifications,
          count: (notifications as any[]).length
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}
