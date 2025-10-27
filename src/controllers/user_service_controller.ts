import { Request, Response } from 'express';
import { User, UserConfiguration } from '../models';
import { UserOpenAIService } from '../services/user_openai_service';
import { UserJiraService } from '../services/user_jira_service';
import '../middleware/auth'; // Importar para cargar las definiciones de tipos

export class UserServiceController {

  // Dashboard del usuario con sus propios datos
  async getUserDashboard(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user || !user.openaiToken || !user.jiraToken) {
        res.status(400).json({
          success: false,
          error: 'Usuario no tiene tokens configurados. Complete la configuración inicial.'
        });
        return;
      }

      // Crear servicios con tokens del usuario
      const openaiService = new UserOpenAIService(user.id, user.openaiToken);
      const jiraService = new UserJiraService(user.id, user.jiraToken, user.jiraUrl || '', user.email);

      // Obtener datos del usuario
      const assistants = await openaiService.listAssistants();
      const projects = await jiraService.listProjects();
      const serviceConfigs = await this.getUserServiceConfigurations(user.id);

      res.json({
        success: true,
        data: {
          assistants: assistants,
          projects: projects,
          serviceConfigurations: serviceConfigs,
          totalAssistants: assistants.length,
          totalProjects: projects.length,
          totalServices: serviceConfigs.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error obteniendo dashboard del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Crear servicio para el usuario
  async createUserService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { serviceId, serviceName, assistantId, assistantName } = req.body;

      if (!serviceId || !serviceName || !assistantId || !assistantName) {
        res.status(400).json({
          success: false,
          error: 'Se requieren serviceId, serviceName, assistantId y assistantName'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user || !user.openaiToken) {
        res.status(400).json({
          success: false,
          error: 'Usuario no tiene token de OpenAI configurado'
        });
        return;
      }

      // Verificar que el asistente existe en la cuenta del usuario
      const openaiService = new UserOpenAIService(user.id, user.openaiToken);
      const assistants = await openaiService.listAssistants();
      const assistantExists = assistants.some(a => a.id === assistantId);
      
      if (!assistantExists) {
        res.status(400).json({
          success: false,
          error: 'El asistente especificado no existe en tu cuenta'
        });
        return;
      }

      // Verificar que el servicio no existe
      const existingConfig = await this.getUserServiceConfiguration(user.id, serviceId);
      if (existingConfig) {
        res.status(400).json({
          success: false,
          error: `El servicio '${serviceId}' ya existe`
        });
        return;
      }

      // Crear servicio en tabla unificada
      const success = await this.createUserServiceConfiguration(user.id, {
        serviceId,
        serviceName,
        assistantId,
        assistantName,
        isActive: true,
        configuration: {}
      });

      if (success) {
        const createdService = await this.getUserServiceConfiguration(user.id, serviceId);
        console.log(`✅ Servicio creado para usuario ${user.id}:`, createdService);
        
        res.json({
          success: true,
          message: `Servicio '${serviceName}' creado exitosamente`,
          data: createdService
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Error interno al crear servicio'
        });
      }
    } catch (error) {
      console.error('Error creando servicio del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener servicios del usuario
  async getUserServices(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      // Usar tabla unificada (unified_configurations) en lugar del modelo UserConfiguration
      const { sequelize } = await import('../config/database');
      const [serviceConfigs] = await sequelize.query(`
        SELECT 
          service_id as serviceId,
          service_name as serviceName,
          assistant_id as assistantId,
          assistant_name as assistantName,
          is_active as isActive,
          last_updated as lastUpdated,
          configuration
        FROM unified_configurations 
        WHERE user_id = ?
        ORDER BY service_name
      `, {
        replacements: [req.user.id]
      });

      console.log(`📊 Servicios encontrados para usuario ${req.user.id}:`, serviceConfigs);

      res.json({
        success: true,
        data: serviceConfigs.map((config: any) => ({
          serviceId: config.serviceId,
          serviceName: config.serviceName,
          assistantId: config.assistantId,
          assistantName: config.assistantName,
          isActive: Boolean(config.isActive),
          lastUpdated: config.lastUpdated,
          configuration: config.configuration
        }))
      });
    } catch (error) {
      console.error('Error obteniendo servicios del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Actualizar servicio del usuario
  async updateUserService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { serviceId } = req.params;
      const { assistantId, assistantName, isActive } = req.body;

      const user = await User.findByPk(req.user.id);
      if (!user || !user.openaiToken) {
        res.status(400).json({
          success: false,
          error: 'Usuario no tiene token de OpenAI configurado'
        });
        return;
      }

      // Verificar que el servicio existe
      const existingConfig = await this.getUserServiceConfiguration(user.id, serviceId);
      if (!existingConfig) {
        res.status(404).json({
          success: false,
          error: `Servicio '${serviceId}' no encontrado`
        });
        return;
      }

      // Si se está cambiando el asistente, verificar que existe
      if (assistantId && assistantId !== existingConfig.assistantId) {
        const openaiService = new UserOpenAIService(user.id, user.openaiToken);
        const assistants = await openaiService.listAssistants();
        const assistantExists = assistants.some(a => a.id === assistantId);
        
        if (!assistantExists) {
          res.status(400).json({
            success: false,
            error: 'El asistente especificado no existe en tu cuenta'
          });
          return;
        }
      }

      // Actualizar configuración en tabla unificada
      const { sequelize } = await import('../config/database');
      await sequelize.query(`
        UPDATE unified_configurations 
        SET 
          assistant_id = ?,
          assistant_name = ?,
          is_active = ?,
          last_updated = ?
        WHERE user_id = ? AND service_id = ?
      `, {
        replacements: [
          assistantId || existingConfig.assistantId,
          assistantName || existingConfig.assistantName,
          isActive !== undefined ? isActive : existingConfig.isActive,
          new Date(),
          user.id,
          serviceId
        ]
      });

      res.json({
        success: true,
        message: `Servicio '${serviceId}' actualizado exitosamente`,
        data: await this.getUserServiceConfiguration(user.id, serviceId)
      });
    } catch (error) {
      console.error('Error actualizando servicio del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Eliminar servicio del usuario
  async deleteUserService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { serviceId } = req.params;

      // Verificar que el servicio existe
      const existingConfig = await this.getUserServiceConfiguration(req.user.id, serviceId);
      if (!existingConfig) {
        res.status(404).json({
          success: false,
          error: `Servicio '${serviceId}' no encontrado`
        });
        return;
      }

      // Eliminar servicio de tabla unificada
      const { sequelize } = await import('../config/database');
      await sequelize.query(`
        DELETE FROM unified_configurations 
        WHERE user_id = ? AND service_id = ?
      `, {
        replacements: [req.user.id, serviceId]
      });

      res.json({
        success: true,
        message: `Servicio '${serviceId}' eliminado exitosamente`
      });
    } catch (error) {
      console.error('Error eliminando servicio del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Chat con servicio del usuario
  async chatWithUserService(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { serviceId } = req.params;
      const { message, threadId } = req.body;

      if (!message) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el mensaje'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user || !user.openaiToken) {
        res.status(400).json({
          success: false,
          error: 'Usuario no tiene token de OpenAI configurado'
        });
        return;
      }

      // Procesar chat con servicio del usuario
      const openaiService = new UserOpenAIService(user.id, user.openaiToken);
      const result = await openaiService.processChatForService(message, serviceId, threadId);

      if (result.success) {
        res.json({
          success: true,
          response: result.response,
          threadId: result.threadId,
          assistantId: result.assistantId,
          assistantName: result.assistantName
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error en chat del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Listar asistentes del usuario
  async getUserAssistants(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user || !user.openaiToken) {
        res.status(400).json({
          success: false,
          error: 'Usuario no tiene token de OpenAI configurado'
        });
        return;
      }

      const openaiService = new UserOpenAIService(user.id, user.openaiToken);
      const assistants = await openaiService.listAssistants();

      res.json({
        success: true,
        data: assistants
      });
    } catch (error) {
      console.error('Error obteniendo asistentes del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Listar proyectos Jira del usuario
  async getUserProjects(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user || !user.jiraToken) {
        res.status(400).json({
          success: false,
          error: 'Usuario no tiene token de Jira configurado'
        });
        return;
      }

      const jiraService = new UserJiraService(user.id, user.jiraToken, user.jiraUrl || '', user.email);
      const projects = await jiraService.listProjects();

      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      console.error('Error obteniendo proyectos del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener asistente activo para un servicio del usuario (para uso público)
  async getActiveAssistantForUserService(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      
      // Buscar en tabla unificada
      const { sequelize } = await import('../config/database');
      const [configs] = await sequelize.query(`
        SELECT 
          service_id as serviceId,
          service_name as serviceName,
          assistant_id as assistantId,
          assistant_name as assistantName,
          is_active as isActive
        FROM unified_configurations 
        WHERE service_id = ? AND is_active = TRUE
        LIMIT 1
      `, {
        replacements: [serviceId]
      });
      
      if (!configs || configs.length === 0) {
        res.status(404).json({
          success: false,
          error: `Servicio '${serviceId}' no disponible`
        });
        return;
      }

      const config: any = configs[0];

      // Solo devolver información básica del asistente activo
      res.json({
        success: true,
        data: {
          assistantId: config.assistantId,
          assistantName: config.assistantName,
          serviceName: config.serviceName
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error obteniendo asistente activo:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  private async getUserServiceConfigurations(userId: number): Promise<any[]> {
    const { sequelize } = await import('../config/database');
    const [configs] = await sequelize.query(`
      SELECT 
        service_id as serviceId,
        service_name as serviceName,
        assistant_id as assistantId,
        assistant_name as assistantName,
        is_active as isActive,
        last_updated as lastUpdated,
        configuration
      FROM unified_configurations 
      WHERE user_id = ?
      ORDER BY service_name
    `, {
      replacements: [userId]
    });
    return configs as any[];
  }

  private async getUserServiceConfiguration(userId: number, serviceId: string): Promise<any> {
    const { sequelize } = await import('../config/database');
    const [configs] = await sequelize.query(`
      SELECT 
        service_id as serviceId,
        service_name as serviceName,
        assistant_id as assistantId,
        assistant_name as assistantName,
        is_active as isActive,
        last_updated as lastUpdated,
        configuration
      FROM unified_configurations 
      WHERE user_id = ? AND service_id = ?
      LIMIT 1
    `, {
      replacements: [userId, serviceId]
    });
    return configs && configs.length > 0 ? configs[0] : null;
  }

  private async createUserServiceConfiguration(userId: number, config: any): Promise<boolean> {
    try {
      const { sequelize } = await import('../config/database');
      await sequelize.query(`
        INSERT INTO unified_configurations 
        (service_id, service_name, user_id, assistant_id, assistant_name, is_active, configuration, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, {
        replacements: [
          config.serviceId,
          config.serviceName,
          userId,
          config.assistantId,
          config.assistantName,
          config.isActive,
          JSON.stringify(config.configuration || {}),
          new Date()
        ]
      });
      return true;
    } catch (error) {
      console.error('Error creating user service configuration:', error);
      return false;
    }
  }
}
