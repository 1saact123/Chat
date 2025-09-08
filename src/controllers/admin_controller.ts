import { Request, Response } from 'express';
import { OpenAIService } from '../services/openAI_service';
import { ConfigurationService } from '../services/configuration_service';
import { JiraService } from '../services/jira_service';

export class AdminController {
  private openaiService: OpenAIService;
  private configService: ConfigurationService;
  private jiraService: JiraService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.configService = new ConfigurationService();
    this.jiraService = new JiraService();
  }

  // Dashboard principal del CEO
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      // Obtener todos los asistentes disponibles
      const assistants = await this.openaiService.listAssistants();
      
      // Obtener todos los proyectos de Jira disponibles
      const projects = await this.jiraService.listProjects();
      
      // Obtener configuraciones actuales de servicios
      const serviceConfigs = this.configService.getAllConfigurations();
      
      // Obtener proyecto activo actual
      const activeProject = this.jiraService.getActiveProject();
      
      res.json({
        success: true,
        data: {
          assistants: assistants,
          projects: projects,
          serviceConfigurations: serviceConfigs,
          activeProject: activeProject,
          totalAssistants: assistants.length,
          totalProjects: projects.length,
          totalServices: serviceConfigs.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo dashboard:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener configuración de un servicio específico
  async getServiceConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      
      const config = this.configService.getServiceConfiguration(serviceId);
      
      if (!config) {
        res.status(404).json({
          success: false,
          error: `Servicio '${serviceId}' no encontrado`
        });
        return;
      }

      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo configuración del servicio:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Actualizar configuración de un servicio
  async updateServiceConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const { assistantId, assistantName } = req.body;

      if (!assistantId || !assistantName) {
        res.status(400).json({
          success: false,
          error: 'Se requiere assistantId y assistantName'
        });
        return;
      }

      // Verificar que el asistente existe
      const assistants = await this.openaiService.listAssistants();
      const assistantExists = assistants.some(a => a.id === assistantId);
      
      if (!assistantExists) {
        res.status(400).json({
          success: false,
          error: 'El asistente especificado no existe'
        });
        return;
      }

      // Actualizar configuración
      const success = this.configService.updateServiceConfiguration(serviceId, assistantId, assistantName);
      
      if (success) {
        res.json({
          success: true,
          message: `Configuración actualizada para ${serviceId}`,
          data: this.configService.getServiceConfiguration(serviceId),
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Servicio '${serviceId}' no encontrado`
        });
      }
    } catch (error) {
      console.error('❌ Error actualizando configuración del servicio:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Activar/desactivar un servicio
  async toggleService(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Se requiere isActive como boolean'
        });
        return;
      }

      const success = this.configService.toggleService(serviceId, isActive);
      
      if (success) {
        res.json({
          success: true,
          message: `Servicio ${serviceId} ${isActive ? 'activado' : 'desactivado'}`,
          data: this.configService.getServiceConfiguration(serviceId),
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Servicio '${serviceId}' no encontrado`
        });
      }
    } catch (error) {
      console.error('❌ Error cambiando estado del servicio:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Agregar nuevo servicio
  async addService(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId, serviceName, assistantId, assistantName } = req.body;

      if (!serviceId || !serviceName || !assistantId || !assistantName) {
        res.status(400).json({
          success: false,
          error: 'Se requieren serviceId, serviceName, assistantId y assistantName'
        });
        return;
      }

      // Verificar que el asistente existe
      const assistants = await this.openaiService.listAssistants();
      const assistantExists = assistants.some(a => a.id === assistantId);
      
      if (!assistantExists) {
        res.status(400).json({
          success: false,
          error: 'El asistente especificado no existe'
        });
        return;
      }

      // Verificar que el servicio no existe
      const existingConfig = this.configService.getServiceConfiguration(serviceId);
      if (existingConfig) {
        res.status(400).json({
          success: false,
          error: `El servicio '${serviceId}' ya existe`
        });
        return;
      }

      // Agregar servicio
      const success = this.configService.addService(serviceId, serviceName, assistantId, assistantName);
      
      if (success) {
        res.json({
          success: true,
          message: `Servicio '${serviceName}' agregado exitosamente`,
          data: this.configService.getServiceConfiguration(serviceId),
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Error interno al agregar servicio'
        });
      }
    } catch (error) {
      console.error('❌ Error agregando servicio:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Eliminar servicio
  async removeService(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;

      const success = this.configService.removeService(serviceId);
      
      if (success) {
        res.json({
          success: true,
          message: `Servicio '${serviceId}' eliminado exitosamente`,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Servicio '${serviceId}' no encontrado`
        });
      }
    } catch (error) {
      console.error('❌ Error eliminando servicio:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener asistente activo para un servicio (para uso público)
  async getActiveAssistantForService(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      
      const config = this.configService.getServiceConfiguration(serviceId);
      
      if (!config || !config.isActive) {
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
      console.error('❌ Error obteniendo asistente activo:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // === PROJECT MANAGEMENT METHODS ===

  // Listar todos los proyectos disponibles
  async listProjects(req: Request, res: Response): Promise<void> {
    try {
      console.log('📋 Solicitando lista de proyectos de Jira...');
      
      const projects = await this.jiraService.listProjects();
      
      res.json({
        success: true,
        projects,
        count: projects.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error al listar proyectos:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al listar proyectos'
      });
    }
  }

  // Cambiar el proyecto activo
  async setActiveProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectKey } = req.body;
      
      if (!projectKey) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el key del proyecto'
        });
        return;
      }

      console.log(`🔄 Cambiando proyecto activo a: ${projectKey}`);
      
      // Verificar que el proyecto existe
      const projects = await this.jiraService.listProjects();
      const projectExists = projects.some(p => p.key === projectKey);
      
      if (!projectExists) {
        res.status(400).json({
          success: false,
          error: 'El proyecto especificado no existe'
        });
        return;
      }
      
      this.jiraService.setActiveProject(projectKey);
      
      res.json({
        success: true,
        message: 'Proyecto activo cambiado exitosamente',
        activeProject: projectKey,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error al cambiar proyecto activo:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al cambiar proyecto'
      });
    }
  }

  // Obtener el proyecto activo actual
  async getActiveProject(req: Request, res: Response): Promise<void> {
    try {
      const activeProject = this.jiraService.getActiveProject();
      
      res.json({
        success: true,
        activeProject,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error al obtener proyecto activo:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al obtener proyecto activo'
      });
    }
  }

  // Obtener detalles de un proyecto específico
  async getProjectDetails(req: Request, res: Response): Promise<void> {
    try {
      const { projectKey } = req.params;
      
      if (!projectKey) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el key del proyecto'
        });
        return;
      }

      console.log(`🔍 Obteniendo detalles del proyecto: ${projectKey}`);
      
      const projectDetails = await this.jiraService.getProjectByKey(projectKey);
      
      res.json({
        success: true,
        project: projectDetails,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error al obtener detalles del proyecto:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al obtener detalles del proyecto'
      });
    }
  }

  // Probar conexión con Jira
  async testJiraConnection(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔗 Probando conexión con Jira...');
      
      const connectionTest = await this.jiraService.testConnection();
      
      res.json({
        success: true,
        message: 'Conexión con Jira exitosa',
        data: connectionTest,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error al probar conexión con Jira:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al probar conexión con Jira'
      });
    }
  }
}
