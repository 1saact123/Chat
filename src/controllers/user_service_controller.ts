import { Request, Response } from 'express';
import { User, UserConfiguration } from '../models';
import { UserOpenAIService } from '../services/user_openai_service';
import { UserJiraService } from '../services/user_jira_service';
import { DatabaseService } from '../services/database_service';
import { CorsService } from '../services/cors_service';
import '../middleware/auth'; // Importar para cargar las definiciones de tipos

export class UserServiceController {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

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
      const jiraService = new UserJiraService(user.id, user.jiraToken, (user as any).jiraUrl || '', user.email);

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

      const { serviceId, serviceName, assistantId, assistantName, projectKey } = req.body;

      if (!serviceId || !serviceName || !assistantId || !assistantName || !projectKey) {
        res.status(400).json({
          success: false,
          error: 'Se requieren serviceId, serviceName, assistantId, assistantName y projectKey'
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

      // Verificar que no hay otro servicio usando el mismo proyecto
      const { sequelize } = await import('../config/database');
      const [allActiveServices] = await sequelize.query(`
        SELECT * FROM unified_configurations 
        WHERE is_active = TRUE
      `);
      
      const existingProjectService = allActiveServices.find((service: any) => {
        let config = {};
        try {
          config = typeof service.configuration === 'string' 
            ? JSON.parse(service.configuration) 
            : service.configuration || {};
        } catch (e) {
          config = service.configuration || {};
        }
        return (config as any)?.projectKey === projectKey;
      });

      if (existingProjectService) {
        res.status(400).json({
          success: false,
          error: `El proyecto '${projectKey}' ya está siendo usado por el servicio '${(existingProjectService as any).service_id}'. Cada proyecto solo puede tener un servicio activo.`
        });
        return;
      }

      // Determinar si el usuario es admin (no necesita aprobación)
      const isAdmin = user.role === 'admin';
      
      // Crear servicio - activo inmediatamente si es admin, pendiente si es usuario regular
      await this.createUserServiceConfiguration(user.id, {
        serviceId,
        serviceName,
        assistantId,
        assistantName,
        isActive: isAdmin, // Activo inmediatamente si es admin
        configuration: {
          projectKey: projectKey,
          adminApproved: isAdmin, // Aprobado automáticamente si es admin
          adminApprovedAt: isAdmin ? new Date().toISOString() : undefined
        }
      });

      // Si es usuario regular, crear solicitud de validación automáticamente
      if (!isAdmin) {
        try {
          const { ServiceValidationService } = await import('../services/service_validation_service');
          const validationService = ServiceValidationService.getInstance();
          
          await validationService.createValidationRequest(user.id, {
            serviceName,
            serviceDescription: req.body.serviceDescription || `Servicio ${serviceName}`,
            websiteUrl: req.body.websiteUrl || `https://${req.body.requestedDomain || 'example.com'}`,
            requestedDomain: req.body.requestedDomain || new URL(req.body.websiteUrl || 'https://example.com').hostname,
            adminId: user.adminId // Asignar al administrador del usuario
          });
          
          console.log(`✅ Solicitud de validación creada automáticamente para servicio ${serviceName}`);
        } catch (validationError) {
          console.error('⚠️ Error creando solicitud de validación:', validationError);
          // No fallar la creación del servicio por este error
        }
      }

      // Si llegamos aquí, el servicio se creó exitosamente
      // Si es admin y se proporcionó un dominio, agregarlo automáticamente a CORS
      if (isAdmin && (req.body.requestedDomain || req.body.websiteUrl)) {
        try {
          const corsService = CorsService.getInstance();
          const domain = req.body.requestedDomain || new URL(req.body.websiteUrl).hostname;
          await corsService.addApprovedDomain(domain);
          console.log(`✅ Dominio ${domain} agregado automáticamente a CORS (Admin)`);
        } catch (corsError) {
          console.error('⚠️ Error agregando dominio a CORS:', corsError);
          // No fallar la creación del servicio por este error
        }
      }
      
      const message = isAdmin 
        ? `Servicio '${serviceName}' creado y activado exitosamente (Admin - Sin aprobación requerida)`
        : `Servicio '${serviceName}' creado exitosamente (Pendiente de aprobación de administrador)`;
      
      res.json({
        success: true,
        message: message,
        data: await this.getUserServiceConfiguration(user.id, serviceId),
        isAdmin: isAdmin
      });
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

      const serviceConfigs = await this.getUserServiceConfigurations(req.user.id);

      res.json({
        success: true,
        data: serviceConfigs.map(config => ({
          serviceId: config.serviceId,
          serviceName: config.serviceName,
          assistantId: config.assistantId,
          assistantName: config.assistantName,
          isActive: config.isActive,
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
        SET assistant_id = ?, assistant_name = ?, is_active = ?, last_updated = NOW(), updated_at = NOW()
        WHERE user_id = ? AND service_id = ?
      `, {
        replacements: [
          assistantId || existingConfig.assistant_id,
          assistantName || existingConfig.assistant_name,
          isActive !== undefined ? isActive : existingConfig.is_active,
          user.id,
          serviceId
        ]
      });

      console.log(`✅ Configuración actualizada en tabla unificada para ${serviceId}`);

      res.json({
        success: true,
        message: `Servicio '${serviceId}' actualizado y sincronizado exitosamente`,
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

      // Eliminar servicio de la tabla unificada
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

      const jiraService = new UserJiraService(user.id, user.jiraToken, (user as any).jiraUrl || '', user.email);
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
      
      const config = await UserConfiguration.findOne({
        where: { serviceId, isActive: true }
      });
      
      if (!config) {
        res.status(404).json({
          success: false,
          error: `Servicio '${serviceId}' no disponible`
        });
        return;
      }

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
    const [configurations] = await sequelize.query(`
      SELECT * FROM unified_configurations 
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY service_name
    `, {
      replacements: [userId]
    });
    
    // Mapear nombres de columnas de snake_case a camelCase para el frontend
    return (configurations as any[]).map((config: any) => ({
      serviceId: config.service_id,
      serviceName: config.service_name,
      assistantId: config.assistant_id,
      assistantName: config.assistant_name,
      isActive: Boolean(config.is_active),
      lastUpdated: config.last_updated,
      configuration: typeof config.configuration === 'string' 
        ? JSON.parse(config.configuration) 
        : config.configuration,
      createdAt: config.created_at,
      updatedAt: config.updated_at
    }));
  }

  private async getUserServiceConfiguration(userId: number, serviceId: string): Promise<any> {
    const { sequelize } = await import('../config/database');
    const [configurations] = await sequelize.query(`
      SELECT * FROM unified_configurations 
      WHERE user_id = ? AND service_id = ? AND is_active = TRUE
      LIMIT 1
    `, {
      replacements: [userId, serviceId]
    });
    
    if (configurations.length === 0) return null;
    
    const config: any = configurations[0];
    
    // Mapear nombres de columnas de snake_case a camelCase para el frontend
    return {
      serviceId: config.service_id,
      serviceName: config.service_name,
      assistantId: config.assistant_id,
      assistantName: config.assistant_name,
      isActive: Boolean(config.is_active),
      lastUpdated: config.last_updated,
      configuration: typeof config.configuration === 'string' 
        ? JSON.parse(config.configuration) 
        : config.configuration,
      createdAt: config.created_at,
      updatedAt: config.updated_at
    };
  }

  private async createUserServiceConfiguration(userId: number, config: any): Promise<void> {
    try {
      const { sequelize } = await import('../config/database');
      await sequelize.query(`
        INSERT INTO unified_configurations 
        (service_id, service_name, user_id, assistant_id, assistant_name, is_active, configuration, last_updated, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
      `, {
        replacements: [
          config.serviceId,
          config.serviceName,
          userId,
          config.assistantId,
          config.assistantName,
          config.isActive,
          JSON.stringify(config.configuration || {})
        ]
      });
    } catch (error: any) {
      console.error('Error creating user service configuration:', error);
      
      // Si es un error de duplicado de Sequelize, lanzar un error específico
      if (error.name === 'SequelizeUniqueConstraintError' && 
          error.original?.code === 'ER_DUP_ENTRY' && 
          error.original?.sqlMessage?.includes('unique_user_service')) {
        throw new Error(`Ya existe un servicio con el ID '${config.serviceId}'. Por favor, elige un ID diferente.`);
      }
      
      // Para otros errores, lanzar el error original
      throw error;
    }
  }
}
