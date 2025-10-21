import { Request, Response } from 'express';
import { OpenAIService } from '../services/openAI_service';
import { ConfigurationService } from '../services/configuration_service';
import { JiraService } from '../services/jira_service';
import { DatabaseService } from '../services/database_service';
import { User } from '../models';

export class AdminController {
  private openaiService: OpenAIService;
  private configService: ConfigurationService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.configService = ConfigurationService.getInstance();
  }

  // Dashboard principal del CEO
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      // Obtener todos los asistentes disponibles
      const assistants = await this.openaiService.listAssistants();
      
      // Obtener todos los proyectos de Jira disponibles
      const jiraService = JiraService.getInstance();
      const projects = await jiraService.listProjects();
      
      // Obtener configuraciones actuales de servicios
      const serviceConfigs = this.configService.getAllConfigurations();
      
      // Obtener proyecto activo actual
      const activeProject = jiraService.getActiveProject();
      
      // El asistente global es el del Landing Page Service
      const landingPageService = serviceConfigs.find(config => config.serviceId === 'landing-page');
      const globalAssistantId = landingPageService?.assistantId || '';
      
      // Determinar qué asistentes están siendo utilizados por servicios activos
      const activeAssistantIds = new Set<string>();
      serviceConfigs.forEach(config => {
        if (config.isActive && config.assistantId) {
          activeAssistantIds.add(config.assistantId);
        }
      });
      
      // Marcar asistentes como activos si están siendo utilizados por servicios
      const assistantsWithStatus = assistants.map(assistant => ({
        ...assistant,
        isActive: activeAssistantIds.has(assistant.id),
        isGlobalActive: assistant.id === globalAssistantId
      }));
      
      res.json({
        success: true,
        data: {
          assistants: assistantsWithStatus,
          projects: projects,
          serviceConfigurations: serviceConfigs,
          activeProject: activeProject,
          activeAssistant: globalAssistantId,
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
      const success = await this.configService.updateServiceConfiguration(serviceId, assistantId, assistantName);
      
      if (success) {
        // Sincronizar automáticamente con UserConfiguration
        try {
          const { syncSpecificService } = await import('../scripts/auto_sync_configurations');
          await syncSpecificService(serviceId);
          console.log(`✅ Configuración sincronizada automáticamente para ${serviceId}`);
        } catch (syncError) {
          console.error(`⚠️ Error en sincronización automática para ${serviceId}:`, syncError);
          // No fallar la operación principal por un error de sincronización
        }

        res.json({
          success: true,
          message: `Configuración actualizada y sincronizada para ${serviceId}`,
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
      
      const jiraService = JiraService.getInstance();
      const projects = await jiraService.listProjects();
      
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
      const jiraService = JiraService.getInstance();
      const projects = await jiraService.listProjects();
      const projectExists = projects.some(p => p.key === projectKey);
      
      if (!projectExists) {
        res.status(400).json({
          success: false,
          error: 'El proyecto especificado no existe'
        });
        return;
      }
      
      jiraService.setActiveProject(projectKey);
      
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
      const jiraService = JiraService.getInstance();
      const activeProject = jiraService.getActiveProject();
      
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
      
      const jiraService = JiraService.getInstance();
      const projectDetails = await jiraService.getProjectByKey(projectKey);
      
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
      
      const jiraService = JiraService.getInstance();
      const connectionTest = await jiraService.testConnection();
      
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

  // === TICKET CONTROL METHODS ===

  // Desactivar asistente en un ticket específico
  async disableAssistantForTicket(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;
      const { reason } = req.body;

      if (!issueKey) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el issueKey del ticket'
        });
        return;
      }

      console.log(`🚫 Desactivando asistente para ticket: ${issueKey}`);

      // Verificar que el ticket existe
      const jiraService = JiraService.getInstance();
      const issue = await jiraService.getIssueByKey(issueKey);
      
      if (!issue) {
        res.status(404).json({
          success: false,
          error: 'Ticket no encontrado'
        });
        return;
      }

      // Agregar comentario explicativo en Jira
      const commentText = `🤖 **AI Assistant Disabled**\n\n` +
        `The AI assistant has been disabled for this ticket by the CEO.\n` +
        `Reason: ${reason || 'No reason provided'}\n` +
        `Disabled at: ${new Date().toISOString()}\n\n` +
        `To re-enable the assistant, use the CEO Dashboard.`;

      await jiraService.addCommentToIssue(issueKey, commentText, {
        name: 'CEO Dashboard',
        source: 'jira'
      });

      // Agregar el ticket a la lista de tickets desactivados
      this.configService.disableAssistantForTicket(issueKey, reason);

      res.json({
        success: true,
        message: `AI Assistant disabled for ticket ${issueKey}`,
        data: {
          issueKey,
          issueSummary: issue.fields.summary,
          reason: reason || 'No reason provided',
          disabledAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error desactivando asistente para ticket:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Reactivar asistente en un ticket específico
  async enableAssistantForTicket(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;

      if (!issueKey) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el issueKey del ticket'
        });
        return;
      }

      console.log(`✅ Reactivando asistente para ticket: ${issueKey}`);

      // Verificar que el ticket existe
      const jiraService = JiraService.getInstance();
      const issue = await jiraService.getIssueByKey(issueKey);
      
      if (!issue) {
        res.status(404).json({
          success: false,
          error: 'Ticket no encontrado'
        });
        return;
      }

      // Agregar comentario explicativo en Jira
      const commentText = `🤖 **AI Assistant Re-enabled**\n\n` +
        `The AI assistant has been re-enabled for this ticket by the CEO.\n` +
        `Re-enabled at: ${new Date().toISOString()}\n\n` +
        `The assistant will now respond to new comments.`;

      await jiraService.addCommentToIssue(issueKey, commentText, {
        name: 'CEO Dashboard',
        source: 'jira'
      });

      // Remover el ticket de la lista de tickets desactivados
      this.configService.enableAssistantForTicket(issueKey);

      res.json({
        success: true,
        message: `AI Assistant re-enabled for ticket ${issueKey}`,
        data: {
          issueKey,
          issueSummary: issue.fields.summary,
          enabledAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error reactivando asistente para ticket:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener lista de tickets con asistente desactivado
  async getDisabledTickets(req: Request, res: Response): Promise<void> {
    try {
      const disabledTickets = this.configService.getDisabledTickets();

      res.json({
        success: true,
        data: {
          disabledTickets,
          count: disabledTickets.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo tickets desactivados:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Verificar si un ticket tiene el asistente desactivado
  async checkTicketAssistantStatus(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;

      if (!issueKey) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el issueKey del ticket'
        });
        return;
      }

      const isDisabled = this.configService.isTicketDisabled(issueKey);
      const ticketInfo = isDisabled ? this.configService.getDisabledTicketInfo(issueKey) : null;

      res.json({
        success: true,
        data: {
          issueKey,
          isDisabled,
          ticketInfo
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error verificando estado del ticket:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // === WEBHOOK CONFIGURATION METHODS ===

  // Configurar webhook
  async configureWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookUrl, assistantId } = req.body;

      if (!webhookUrl) {
        res.status(400).json({
          success: false,
          error: 'Se requiere la URL del webhook'
        });
        return;
      }

      console.log(`🔧 Configurando webhook: ${webhookUrl}`);

      // Configurar webhook URL
      await this.configService.setWebhookUrl(webhookUrl);
      await this.configService.setWebhookEnabled(true);

      // Si se especifica un asistente diferente para webhook, configurarlo
      if (assistantId) {
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

        // Configurar el asistente para el servicio webhook-parallel
        const assistant = assistants.find(a => a.id === assistantId);
        if (assistant) {
          await this.configService.updateServiceConfiguration(
            'webhook-parallel', 
            assistantId, 
            assistant.name || 'Webhook Assistant'
          );
          this.configService.toggleService('webhook-parallel', true);
          console.log(`✅ Asistente configurado para webhook: ${assistant.name}`);
          console.log(`✅ Servicio webhook-parallel activado`);
        }
      }

      res.json({
        success: true,
        message: 'Webhook configurado exitosamente',
        data: {
          webhookUrl,
          assistantId: assistantId || null,
          isEnabled: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error configurando webhook:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // === STATUS-BASED DISABLE METHODS ===

  // Configurar deshabilitación basada en estados
  async configureStatusBasedDisable(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔧 configureStatusBasedDisable called');
      console.log('📦 Request body:', req.body);
      console.log('📋 Request headers:', req.headers);
      
      const { isEnabled, triggerStatuses } = req.body;

      console.log('🔍 Parsed data:', { isEnabled, triggerStatuses });

      if (typeof isEnabled !== 'boolean') {
        console.error('❌ isEnabled is not boolean:', typeof isEnabled, isEnabled);
        res.status(400).json({
          success: false,
          error: 'isEnabled debe ser un booleano'
        });
        return;
      }

      if (!Array.isArray(triggerStatuses)) {
        console.error('❌ triggerStatuses is not array:', typeof triggerStatuses, triggerStatuses);
        res.status(400).json({
          success: false,
          error: 'triggerStatuses debe ser un array'
        });
        return;
      }

      console.log(`🔧 Configurando deshabilitación basada en estados:`, {
        isEnabled,
        triggerStatuses
      });

      await this.configService.setStatusBasedDisableConfig(isEnabled, triggerStatuses);

      const responseData = {
        isEnabled,
        triggerStatuses,
        lastUpdated: new Date().toISOString()
      };
      
      console.log('✅ Configuration saved, sending response:', responseData);
      
      res.json({
        success: true,
        message: 'Status-based disable configuration saved successfully',
        data: responseData
      });
    } catch (error) {
      console.error('Error configuring status-based disable:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener configuración de deshabilitación basada en estados
  async getStatusBasedDisableConfig(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 getStatusBasedDisableConfig called');
      const config = this.configService.getStatusBasedDisableConfig();
      console.log('📊 Current config:', config);
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('❌ Error getting status-based disable config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener estados disponibles de Jira
  async getAvailableStatuses(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 getAvailableStatuses called');
      const jiraService = JiraService.getInstance();
      const statuses = await jiraService.getAllPossibleStatuses();
      console.log('📋 Available statuses:', statuses);
      
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error('❌ Error getting available statuses:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Probar webhook
  async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log('🧪 Probando webhook...');

      const webhookUrl = this.configService.getWebhookUrl();
      if (!webhookUrl) {
        res.status(400).json({
          success: false,
          error: 'Webhook no configurado'
        });
        return;
      }

      // Importar WebhookService dinámicamente
      const { WebhookService } = await import('../services/webhook_service');
      const webhookService = WebhookService.getInstance();

      // Enviar mensaje de prueba
      const testResult = await webhookService.sendToWebhook({
        issueKey: 'TEST-1', // Usar TEST-1 como en tu ejemplo
        message: 'Test message from CEO Dashboard - Webhook Integration Test',
        author: 'CEO Dashboard',
        timestamp: new Date().toISOString(),
        source: 'jira-comment',
        threadId: 'test_webhook_' + Date.now(),
        assistantId: 'test',
        assistantName: 'Test Assistant',
        response: 'This is a test response from the webhook system. The parallel flow is working correctly.',
        context: { 
          isTest: true,
          testType: 'jira-automation-webhook',
          timestamp: new Date().toISOString()
        }
      });

      if (testResult.success) {
        res.json({
          success: true,
          message: 'Webhook test successful',
          data: {
            webhookUrl,
            testResult
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: `Webhook test failed: ${testResult.error}`,
          data: {
            webhookUrl,
            testResult
          }
        });
      }
    } catch (error) {
      console.error('❌ Error probando webhook:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Deshabilitar webhook
  async disableWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log('🚫 Deshabilitando webhook...');

      await this.configService.disableWebhook();

      res.json({
        success: true,
        message: 'Webhook deshabilitado exitosamente',
        data: {
          isEnabled: false
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error deshabilitando webhook:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener estado del webhook
  async getWebhookStatus(req: Request, res: Response): Promise<void> {
    try {
      const webhookConfig = this.configService.getWebhookConfiguration();
      const webhookService = this.configService.getServiceConfiguration('webhook-parallel');

      const filterConfig = this.configService.getWebhookFilterConfig();

      res.json({
        success: true,
        data: {
          webhookUrl: webhookConfig?.webhookUrl || null,
          isEnabled: this.configService.isWebhookEnabled(),
          assistantId: webhookService?.assistantId || null,
          assistantName: webhookService?.assistantName || null,
          lastUpdated: webhookConfig?.lastUpdated || null,
          filter: filterConfig || {
            filterEnabled: false,
            filterCondition: 'response_value',
            filterValue: 'Yes'
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo estado del webhook:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Configurar filtro del webhook
  async configureWebhookFilter(req: Request, res: Response): Promise<void> {
    try {
      const { filterEnabled, filterCondition, filterValue } = req.body;

      console.log(`🔧 === CONFIGURING WEBHOOK FILTER ===`);
      console.log(`📋 Input parameters:`, {
        filterEnabled,
        filterCondition,
        filterValue
      });

      await this.configService.setWebhookFilter(
        filterEnabled,
        filterCondition || 'response_value',
        filterValue || 'Yes'
      );

      // Obtener la configuración actual para verificar
      const currentConfig = this.configService.getWebhookFilterConfig();
      console.log(`📋 Current filter config:`, currentConfig);

      res.json({
        success: true,
        message: 'Filtro de webhook configurado exitosamente',
        data: {
          filterEnabled,
          filterCondition: filterCondition || 'response_value',
          filterValue: filterValue || 'Yes',
          lastUpdated: new Date().toISOString(),
          currentConfig
        }
      });
      
      console.log(`✅ === WEBHOOK FILTER CONFIGURED ===`);
    } catch (error) {
      console.error('❌ Error configurando filtro de webhook:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Probar el filtro de webhook con una respuesta de ejemplo
  async testWebhookFilter(req: Request, res: Response): Promise<void> {
    try {
      const { testResponse } = req.body;

      console.log(`🧪 === TESTING WEBHOOK FILTER ===`);
      console.log(`📝 Test response:`, testResponse);

      const shouldSend = this.configService.shouldSendWebhook(testResponse);
      const filterConfig = this.configService.getWebhookFilterConfig();

      console.log(`📊 Test result:`, {
        shouldSend,
        filterConfig,
        testResponse
      });

      res.json({
        success: true,
        data: {
          shouldSend,
          filterConfig,
          testResponse,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`✅ === WEBHOOK FILTER TEST COMPLETED ===`);
    } catch (error) {
      console.error('❌ Error testing webhook filter:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener webhooks guardados
  async getSavedWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const dbService = DatabaseService.getInstance();
      const savedWebhooks = await dbService.getAllSavedWebhooks();

      res.json({
        success: true,
        data: savedWebhooks,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo webhooks guardados:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Guardar nuevo webhook
  async saveWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { name, url, description } = req.body;

      if (!name || !url) {
        res.status(400).json({
          success: false,
          error: 'Name and URL are required'
        });
        return;
      }

      const dbService = DatabaseService.getInstance();
      const savedWebhook = await dbService.createSavedWebhook({
        name,
        url,
        description: description || null,
        isActive: true
      });

      res.json({
        success: true,
        message: 'Webhook saved successfully',
        data: savedWebhook,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error guardando webhook:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Eliminar webhook guardado
  async deleteSavedWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          success: false,
          error: 'Valid ID is required'
        });
        return;
      }

      const dbService = DatabaseService.getInstance();
      const deleted = await dbService.deleteSavedWebhook(Number(id));

      if (deleted) {
        res.json({
          success: true,
          message: 'Webhook deleted successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Webhook not found'
        });
      }
    } catch (error) {
      console.error('❌ Error eliminando webhook:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // === USER PERMISSIONS MANAGEMENT ===

  // Obtener permisos de un usuario
  async getUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          userId: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions || {
            serviceManagement: false,
            automaticAIDisableRules: false,
            webhookConfiguration: false,
            ticketControl: false,
            aiEnabledProjects: false,
            remoteServerIntegration: false
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo permisos de usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Actualizar permisos de un usuario
  async updateUserPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { permissions } = req.body;

      if (!permissions || typeof permissions !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Se requieren los permisos válidos'
        });
        return;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      // Validar que solo se actualicen permisos de usuarios con rol 'user'
      if (user.role === 'admin') {
        res.status(400).json({
          success: false,
          error: 'No se pueden modificar permisos de administradores'
        });
        return;
      }

      // Validar estructura de permisos
      const validPermissions = {
        serviceManagement: Boolean(permissions.serviceManagement),
        automaticAIDisableRules: Boolean(permissions.automaticAIDisableRules),
        webhookConfiguration: Boolean(permissions.webhookConfiguration),
        ticketControl: Boolean(permissions.ticketControl),
        aiEnabledProjects: Boolean(permissions.aiEnabledProjects),
        remoteServerIntegration: Boolean(permissions.remoteServerIntegration)
      };

      await user.update({ permissions: validPermissions });

      console.log(`✅ Permisos actualizados para usuario ${user.username}:`, validPermissions);

      res.json({
        success: true,
        data: {
          userId: user.id,
          username: user.username,
          permissions: validPermissions
        },
        message: 'Permisos actualizados exitosamente',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error actualizando permisos de usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Listar todos los usuarios con sus permisos (solo usuarios, no admins)
  async getUsersWithPermissions(req: Request, res: Response): Promise<void> {
    try {
      const users = await User.findAll({
        where: { role: 'user' },
        attributes: ['id', 'username', 'email', 'isActive', 'permissions', 'lastLogin'],
        order: [['username', 'ASC']]
      });

      const usersWithPermissions = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        permissions: user.permissions || {
          serviceManagement: false,
          automaticAIDisableRules: false,
          webhookConfiguration: false,
          ticketControl: false,
          aiEnabledProjects: false,
          remoteServerIntegration: false
        }
      }));

      res.json({
        success: true,
        data: usersWithPermissions,
        count: usersWithPermissions.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo usuarios con permisos:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}
