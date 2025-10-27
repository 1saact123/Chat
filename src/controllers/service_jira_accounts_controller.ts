/**
 * Controller para gestionar cuentas de Jira alternativas por servicio
 */

import { Request, Response } from 'express';
import { Sequelize } from 'sequelize';
import { DatabaseService } from '../services/database_service';
import '../middleware/auth'; // Para tipos de Request.user

export class ServiceJiraAccountsController {
  private sequelize: Sequelize;

  constructor() {
    this.sequelize = DatabaseService.getInstance().getSequelize();
  }

  /**
   * Obtener cuentas de Jira para un servicio
   */
  public getServiceJiraAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      console.log('🔍 Obteniendo cuentas de Jira:', { userId, serviceId });

      const [accounts] = await this.sequelize.query(`
        SELECT 
          id,
          user_id,
          service_id,
          assistant_jira_email,
          assistant_jira_url,
          widget_jira_email,
          widget_jira_url,
          is_active,
          created_at,
          updated_at
        FROM service_jira_accounts
        WHERE user_id = :userId AND service_id = :serviceId
        LIMIT 1
      `, {
        replacements: { userId, serviceId }
      }) as any;

      if (accounts.length === 0) {
        res.json({
          success: true,
          data: null,
          message: 'No hay cuentas configuradas para este servicio'
        });
        return;
      }

      res.json({
        success: true,
        data: accounts[0]
      });

    } catch (error) {
      console.error('❌ Error al obtener cuentas de Jira:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener cuentas de Jira'
      });
    }
  };

  /**
   * Crear o actualizar cuentas de Jira para un servicio
   */
  public upsertServiceJiraAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceId } = req.params;
      const userId = req.user?.id;
      const {
        assistantJiraEmail,
        assistantJiraToken,
        assistantJiraUrl,
        widgetJiraEmail,
        widgetJiraToken,
        widgetJiraUrl,
        isActive
      } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      console.log('💾 Guardando cuentas de Jira:', {
        userId,
        serviceId,
        hasAssistantAccount: !!assistantJiraEmail,
        hasWidgetAccount: !!widgetJiraEmail
      });

      // Verificar que el usuario tiene acceso al servicio
      const [services] = await this.sequelize.query(`
        SELECT id FROM unified_configurations
        WHERE user_id = :userId AND service_id = :serviceId
        LIMIT 1
      `, {
        replacements: { userId, serviceId }
      }) as any;

      if (services.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Servicio no encontrado o sin acceso'
        });
        return;
      }

      // Verificar si ya existe una configuración
      const [existing] = await this.sequelize.query(`
        SELECT id FROM service_jira_accounts
        WHERE user_id = :userId AND service_id = :serviceId
        LIMIT 1
      `, {
        replacements: { userId, serviceId }
      }) as any;

      if (existing.length > 0) {
        // Actualizar
        await this.sequelize.query(`
          UPDATE service_jira_accounts
          SET 
            assistant_jira_email = :assistantJiraEmail,
            assistant_jira_token = :assistantJiraToken,
            assistant_jira_url = :assistantJiraUrl,
            widget_jira_email = :widgetJiraEmail,
            widget_jira_token = :widgetJiraToken,
            widget_jira_url = :widgetJiraUrl,
            is_active = :isActive,
            updated_at = NOW()
          WHERE user_id = :userId AND service_id = :serviceId
        `, {
          replacements: {
            userId,
            serviceId,
            assistantJiraEmail: assistantJiraEmail || null,
            assistantJiraToken: assistantJiraToken || null,
            assistantJiraUrl: assistantJiraUrl || null,
            widgetJiraEmail: widgetJiraEmail || null,
            widgetJiraToken: widgetJiraToken || null,
            widgetJiraUrl: widgetJiraUrl || null,
            isActive: isActive !== undefined ? isActive : true
          }
        });

        console.log('✅ Cuentas de Jira actualizadas');
      } else {
        // Insertar
        await this.sequelize.query(`
          INSERT INTO service_jira_accounts (
            user_id,
            service_id,
            assistant_jira_email,
            assistant_jira_token,
            assistant_jira_url,
            widget_jira_email,
            widget_jira_token,
            widget_jira_url,
            is_active
          ) VALUES (
            :userId,
            :serviceId,
            :assistantJiraEmail,
            :assistantJiraToken,
            :assistantJiraUrl,
            :widgetJiraEmail,
            :widgetJiraToken,
            :widgetJiraUrl,
            :isActive
          )
        `, {
          replacements: {
            userId,
            serviceId,
            assistantJiraEmail: assistantJiraEmail || null,
            assistantJiraToken: assistantJiraToken || null,
            assistantJiraUrl: assistantJiraUrl || null,
            widgetJiraEmail: widgetJiraEmail || null,
            widgetJiraToken: widgetJiraToken || null,
            widgetJiraUrl: widgetJiraUrl || null,
            isActive: isActive !== undefined ? isActive : true
          }
        });

        console.log('✅ Cuentas de Jira creadas');
      }

      // Obtener la configuración actualizada
      const [updated] = await this.sequelize.query(`
        SELECT 
          id,
          user_id,
          service_id,
          assistant_jira_email,
          assistant_jira_url,
          widget_jira_email,
          widget_jira_url,
          is_active,
          created_at,
          updated_at
        FROM service_jira_accounts
        WHERE user_id = :userId AND service_id = :serviceId
        LIMIT 1
      `, {
        replacements: { userId, serviceId }
      }) as any;

      res.json({
        success: true,
        data: updated[0],
        message: 'Cuentas de Jira guardadas exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al guardar cuentas de Jira:', error);
      res.status(500).json({
        success: false,
        error: 'Error al guardar cuentas de Jira'
      });
    }
  };

  /**
   * Eliminar cuentas de Jira para un servicio
   */
  public deleteServiceJiraAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { serviceId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      console.log('🗑️ Eliminando cuentas de Jira:', { userId, serviceId });

      await this.sequelize.query(`
        DELETE FROM service_jira_accounts
        WHERE user_id = :userId AND service_id = :serviceId
      `, {
        replacements: { userId, serviceId }
      });

      console.log('✅ Cuentas de Jira eliminadas');

      res.json({
        success: true,
        message: 'Cuentas de Jira eliminadas exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al eliminar cuentas de Jira:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar cuentas de Jira'
      });
    }
  };

  /**
   * Obtener cuenta de Jira para el asistente (uso interno)
   */
  public static async getAssistantJiraAccount(userId: number, serviceId: string): Promise<{
    email: string;
    token: string;
    url: string;
  } | null> {
    try {
      const sequelize = DatabaseService.getInstance().getSequelize();

      const [accounts] = await sequelize.query(`
        SELECT 
          assistant_jira_email,
          assistant_jira_token,
          assistant_jira_url
        FROM service_jira_accounts
        WHERE user_id = :userId 
          AND service_id = :serviceId 
          AND is_active = true
          AND assistant_jira_email IS NOT NULL
          AND assistant_jira_token IS NOT NULL
        LIMIT 1
      `, {
        replacements: { userId, serviceId }
      }) as any;

      if (accounts.length === 0) {
        return null;
      }

      return {
        email: accounts[0].assistant_jira_email,
        token: accounts[0].assistant_jira_token,
        url: accounts[0].assistant_jira_url
      };
    } catch (error) {
      console.error('❌ Error al obtener cuenta del asistente:', error);
      return null;
    }
  }

  /**
   * Obtener cuenta de Jira para el widget (uso interno)
   */
  public static async getWidgetJiraAccount(userId: number, serviceId: string): Promise<{
    email: string;
    token: string;
    url: string;
  } | null> {
    try {
      const sequelize = DatabaseService.getInstance().getSequelize();

      const [accounts] = await sequelize.query(`
        SELECT 
          widget_jira_email,
          widget_jira_token,
          widget_jira_url
        FROM service_jira_accounts
        WHERE user_id = :userId 
          AND service_id = :serviceId 
          AND is_active = true
          AND widget_jira_email IS NOT NULL
          AND widget_jira_token IS NOT NULL
        LIMIT 1
      `, {
        replacements: { userId, serviceId }
      }) as any;

      if (accounts.length === 0) {
        return null;
      }

      return {
        email: accounts[0].widget_jira_email,
        token: accounts[0].widget_jira_token,
        url: accounts[0].widget_jira_url
      };
    } catch (error) {
      console.error('❌ Error al obtener cuenta del widget:', error);
      return null;
    }
  }
}

