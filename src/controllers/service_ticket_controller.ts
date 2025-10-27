import { Request, Response } from 'express';
import { JiraService } from '../services/jira_service';
import { DatabaseService } from '../services/database_service';
import { UserJiraService } from '../services/user_jira_service';
import { ServiceJiraAccountsController } from './service_jira_accounts_controller';
import '../middleware/auth'; // Importar para cargar las definiciones de tipos

interface CustomerInfo {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
}

interface ServiceTicketRequest {
  customerInfo: CustomerInfo;
  serviceId: string;
  userId?: number;
}

export class ServiceTicketController {
  private jiraService: JiraService;
  private dbService: DatabaseService;

  constructor() {
    this.jiraService = JiraService.getInstance();
    this.dbService = DatabaseService.getInstance();
  }

  /**
   * Crear ticket para un servicio específico del cliente
   */
  async createTicketForService(req: Request, res: Response): Promise<void> {
    try {
      const { customerInfo, serviceId } = req.body as ServiceTicketRequest;
      const userId = req.user?.id; // Obtener userId del usuario autenticado

      // Validar campos requeridos
      if (!customerInfo || !serviceId) {
        res.status(400).json({
          success: false,
          error: 'customerInfo and serviceId are required'
        });
        return;
      }

      if (!customerInfo.name || !customerInfo.email) {
        res.status(400).json({
          success: false,
          error: 'customerInfo.name and customerInfo.email are required'
        });
        return;
      }

      // Validar que el usuario esté autenticado
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      // Try to get assistant-specific Jira account first
      let jiraEmail = req.user?.email;
      let jiraToken = req.user?.jiraToken;
      let jiraUrl = req.user?.jiraUrl;

      // Look for service-specific assistant credentials
      const assistantAccount = await ServiceJiraAccountsController.getAssistantJiraAccount(userId, serviceId);
      if (assistantAccount) {
        console.log(`✅ Using assistant-specific Jira account for service ${serviceId}`);
        jiraEmail = assistantAccount.email;
        jiraToken = assistantAccount.token;
        jiraUrl = assistantAccount.url;
      }

      // Validar que tengamos credenciales de Jira (propias o configuradas)
      if (!jiraToken || !jiraEmail) {
        res.status(400).json({
          success: false,
          error: 'Jira credentials not configured. Please configure assistant Jira account in service settings or your profile.'
        });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerInfo.email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
        return;
      }

      console.log(`🎫 Creating ticket for service ${serviceId} for user ${userId}:`, {
        name: customerInfo.name,
        email: customerInfo.email,
        company: customerInfo.company || 'N/A',
        serviceId,
        userId
      });

      // Obtener configuración del servicio
      const serviceConfig = await this.getServiceConfiguration(serviceId, userId);
      if (!serviceConfig) {
        res.status(404).json({
          success: false,
          error: `Service '${serviceId}' not found or not configured for user ${userId}`
        });
        return;
      }

      // Verificar que el servicio esté activo
      if (!serviceConfig.isActive) {
        res.status(400).json({
          success: false,
          error: `Service '${serviceId}' is not active`
        });
        return;
      }

      // Obtener projectKey del servicio
      const projectKey = this.getProjectKeyFromConfig(serviceConfig);
      if (!projectKey) {
        res.status(400).json({
          success: false,
          error: `Service '${serviceId}' does not have a configured projectKey`
        });
        return;
      }

      // Preparar datos del formulario con información del servicio
      const formData = {
        name: customerInfo.name.trim(),
        email: customerInfo.email.trim().toLowerCase(),
        phone: customerInfo.phone ? customerInfo.phone.trim() : undefined,
        company: customerInfo.company ? customerInfo.company.trim() : undefined,
        message: customerInfo.message ? customerInfo.message.trim() : `Contact from service ${serviceId}`,
        source: `service-${serviceId}`,
        serviceId: serviceId,
        serviceName: serviceConfig.serviceName,
        projectKey: projectKey
      };

      console.log(`📋 Creating Jira ticket for service ${serviceId} in project ${projectKey} using user credentials`);

      // Crear instancia de UserJiraService con las credenciales correctas (propias o configuradas)
      const userJiraService = new UserJiraService(
        userId,
        jiraToken,
        jiraUrl || process.env.JIRA_BASE_URL || 'https://movonte.atlassian.net',
        jiraEmail
      );

      // Crear ticket en Jira usando las credenciales del usuario
      const jiraResponse = await this.createContactIssueForProjectWithUser(formData, projectKey, userJiraService);

      console.log(`✅ Ticket created successfully for service ${serviceId}:`, jiraResponse.key);

      const response = {
        success: true,
        issueKey: jiraResponse.key,
        jiraIssue: {
          id: jiraResponse.id,
          key: jiraResponse.key,
          url: `${jiraUrl || process.env.JIRA_BASE_URL}/browse/${jiraResponse.key}`
        },
        service: {
          serviceId: serviceId,
          serviceName: serviceConfig.serviceName,
          projectKey: projectKey
        },
        message: `Ticket created successfully for service ${serviceId}`
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Error creating ticket for service:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * Obtener configuración del servicio
   */
  private async getServiceConfiguration(serviceId: string, userId?: number): Promise<any> {
    try {
      const { sequelize } = await import('../config/database');
      
      let query: string;
      let replacements: any[];

      if (userId) {
        // Buscar configuración específica del usuario
        query = `
          SELECT * FROM unified_configurations 
          WHERE service_id = ? AND user_id = ? AND is_active = TRUE
          LIMIT 1
        `;
        replacements = [serviceId, userId];
      } else {
        // Buscar configuración global del servicio
        query = `
          SELECT * FROM unified_configurations 
          WHERE service_id = ? AND is_active = TRUE
          LIMIT 1
        `;
        replacements = [serviceId];
      }

      const [configurations] = await sequelize.query(query, {
        replacements
      });

      if (!configurations || (configurations as any[]).length === 0) {
        return null;
      }

      const config = (configurations as any[])[0];
      return {
        serviceId: config.service_id,
        serviceName: config.service_name,
        assistantId: config.assistant_id,
        assistantName: config.assistant_name,
        isActive: Boolean(config.is_active),
        configuration: typeof config.configuration === 'string' 
          ? JSON.parse(config.configuration) 
          : config.configuration,
        lastUpdated: config.last_updated
      };

    } catch (error) {
      console.error('Error getting service configuration:', error);
      return null;
    }
  }

  /**
   * Extraer projectKey de la configuración del servicio
   */
  private getProjectKeyFromConfig(serviceConfig: any): string | null {
    try {
      if (!serviceConfig.configuration) {
        return null;
      }

      const config = serviceConfig.configuration;
      return config.projectKey || null;

    } catch (error) {
      console.error('Error extracting projectKey from config:', error);
      return null;
    }
  }

  /**
   * Crear ticket de contacto para un proyecto específico usando credenciales del usuario
   */
  private async createContactIssueForProjectWithUser(formData: any, projectKey: string, userJiraService: UserJiraService): Promise<any> {
    try {
      // Usar el método del UserJiraService para crear el ticket
      const response = await userJiraService.createIssue({
        projectKey: projectKey,
        summary: `Service Contact: ${formData.name} - ${formData.company || 'No company'} (${formData.serviceName || formData.serviceId})`,
        description: this.formatServiceContactDescriptionADF(formData),
        issueType: 'Task',
        priority: 'Medium',
        labels: [
          'service-contact', 
          'widget-chat', 
          `service-${formData.serviceId}`,
          formData.source || 'unknown'
        ]
      });

      return response;

    } catch (error) {
      console.error('Error creating ticket with user credentials:', error);
      throw error;
    }
  }

  /**
   * Formatear descripción de contacto de servicio en ADF
   */
  private formatServiceContactDescriptionADF(formData: any): any {
    const lines = [
      `Contact from service: ${formData.serviceName || formData.serviceId}`,
      '',
      `Customer Information:`,
      `• Name: ${formData.name}`,
      `• Email: ${formData.email}`,
      formData.phone ? `• Phone: ${formData.phone}` : null,
      formData.company ? `• Company: ${formData.company}` : null,
      '',
      `Service Details:`,
      `• Service ID: ${formData.serviceId}`,
      `• Service Name: ${formData.serviceName || 'N/A'}`,
      `• Project Key: ${formData.projectKey}`,
      `• Source: ${formData.source || 'unknown'}`,
      '',
      formData.message ? `Message: ${formData.message}` : 'No additional message provided',
      '',
      `Created via widget integration for service ${formData.serviceId}`
    ].filter(Boolean);

    return {
      version: 1 as const,
      type: 'doc' as const,
      content: lines.map((text) => ({
        type: 'paragraph' as const,
        content: text
          ? [{ type: 'text' as const, text }]
          : undefined
      }))
    };
  }

  /**
   * Obtener información del servicio
   */
  async getServiceInfo(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const { userId } = req.query;

      if (!serviceId) {
        res.status(400).json({
          success: false,
          error: 'serviceId is required'
        });
        return;
      }

      const serviceConfig = await this.getServiceConfiguration(
        serviceId, 
        userId ? parseInt(userId as string) : undefined
      );

      if (!serviceConfig) {
        res.status(404).json({
          success: false,
          error: `Service '${serviceId}' not found`
        });
        return;
      }

      res.json({
        success: true,
        data: {
          serviceId: serviceConfig.serviceId,
          serviceName: serviceConfig.serviceName,
          assistantId: serviceConfig.assistantId,
          assistantName: serviceConfig.assistantName,
          isActive: serviceConfig.isActive,
          projectKey: this.getProjectKeyFromConfig(serviceConfig),
          lastUpdated: serviceConfig.lastUpdated
        }
      });

    } catch (error) {
      console.error('Error getting service info:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
