import { DatabaseService } from './database_service';

interface ServiceConfiguration {
  serviceId: string;
  serviceName: string;
  assistantId: string;
  assistantName: string;
  isActive: boolean;
  lastUpdated: Date;
}

interface DisabledTicket {
  issueKey: string;
  reason: string;
  disabledAt: Date;
  disabledBy: string;
}

interface StatusBasedDisableConfig {
  isEnabled: boolean;
  triggerStatuses: string[];
  lastUpdated: Date;
}

interface WebhookConfiguration {
  webhookUrl: string;
  isEnabled: boolean;
  lastUpdated: Date;
}

export class ConfigurationService {
  private static instance: ConfigurationService;
  private configurations: Map<string, ServiceConfiguration> = new Map();
  private disabledTickets: Map<string, DisabledTicket> = new Map();
  private webhookConfig: WebhookConfiguration | null = null;
  private statusBasedDisableConfig: StatusBasedDisableConfig = {
    isEnabled: false,
    triggerStatuses: [],
    lastUpdated: new Date()
  };
  private readonly CONFIG_FILE = 'service-config.json';
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.loadConfigurations();
    this.loadConfigurationsFromDatabase();
  }

  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  // Cargar configuraciones desde archivo
  private loadConfigurations(): void {
    try {
      // Por ahora usamos configuraciones por defecto
      // En producción esto se cargaría desde una base de datos o archivo
      this.configurations.set('landing-page', {
        serviceId: 'landing-page',
        serviceName: 'Landing Page',
        assistantId: process.env.OPENAI_ASSISTANT_ID || '',
        assistantName: 'AI Assistant Chat',
        isActive: true,
        lastUpdated: new Date()
      });

      this.configurations.set('jira-integration', {
        serviceId: 'jira-integration',
        serviceName: 'Integración Jira',
        assistantId: process.env.OPENAI_ASSISTANT_ID || '',
        assistantName: 'AI Assistant Chat',
        isActive: false, // DISABLED - Only use landing-page assistant
        lastUpdated: new Date()
      });

      this.configurations.set('chat-general', {
        serviceId: 'chat-general',
        serviceName: 'Chat General',
        assistantId: process.env.OPENAI_ASSISTANT_ID || '',
        assistantName: 'AI Assistant Chat',
        isActive: false, // DISABLED - Only use landing-page assistant
        lastUpdated: new Date()
      });

      this.configurations.set('general-chat', {
        serviceId: 'general-chat',
        serviceName: 'Chat General',
        assistantId: process.env.OPENAI_ASSISTANT_ID || '',
        assistantName: ' AI Assistant Chat',
        isActive: false, // DISABLED - Only use landing-page assistant
        lastUpdated: new Date()
      });

      this.configurations.set('webhook-parallel', {
        serviceId: 'webhook-parallel',
        serviceName: 'Webhook Parallel Flow',
        assistantId: process.env.OPENAI_ASSISTANT_ID || '',
        assistantName: 'AI Assistant Chat',
        isActive: false, // DISABLED by default - needs to be configured
        lastUpdated: new Date()
      });

      console.log('✅ Configuraciones de servicio cargadas');
    } catch (error) {
      console.error('❌ Error cargando configuraciones:', error);
    }
  }

  // Cargar configuraciones desde base de datos
  private async loadConfigurationsFromDatabase(): Promise<void> {
    try {
      console.log('🔄 Cargando configuraciones desde base de datos...');
      const dbConfigs = await this.dbService.getAllServiceConfigs();
      
      if (dbConfigs.length > 0) {
        console.log(`📋 Encontradas ${dbConfigs.length} configuraciones en BD`);
        
        // Actualizar configuraciones con datos de BD
        for (const dbConfig of dbConfigs) {
          this.configurations.set(dbConfig.serviceId, {
            serviceId: dbConfig.serviceId,
            serviceName: dbConfig.serviceName,
            assistantId: dbConfig.assistantId,
            assistantName: dbConfig.assistantName,
            isActive: dbConfig.isActive,
            lastUpdated: dbConfig.lastUpdated || new Date()
          });
          console.log(`✅ Cargada configuración: ${dbConfig.serviceName} -> ${dbConfig.assistantName}`);
        }
        
        // Guardar configuraciones actualizadas en archivo
        // this.saveConfigurations(); // TODO: Implementar si es necesario
      } else {
        console.log('⚠️ No se encontraron configuraciones en BD, usando configuraciones por defecto');
      }
      
      // Cargar tickets deshabilitados
      await this.loadDisabledTicketsFromDatabase();
    } catch (error) {
      console.error('❌ Error cargando configuraciones desde BD:', error);
    }
  }

  // Cargar tickets deshabilitados desde base de datos
  private async loadDisabledTicketsFromDatabase(): Promise<void> {
    try {
      console.log('🔄 Cargando tickets deshabilitados desde base de datos...');
      const disabledTickets = await this.dbService.getAllDisabledTickets();
      
      if (disabledTickets.length > 0) {
        console.log(`📋 Encontrados ${disabledTickets.length} tickets deshabilitados en BD`);
        
        for (const ticket of disabledTickets) {
          this.disabledTickets.set(ticket.issueKey, ticket);
          console.log(`🚫 Ticket deshabilitado: ${ticket.issueKey} - ${ticket.reason}`);
        }
      } else {
        console.log('✅ No hay tickets deshabilitados en BD');
      }
    } catch (error) {
      console.error('❌ Error cargando tickets deshabilitados desde BD:', error);
    }
  }

  // Obtener configuración de un servicio específico
  getServiceConfiguration(serviceId: string): ServiceConfiguration | null {
    return this.configurations.get(serviceId) || null;
  }

  // Obtener todas las configuraciones (excluyendo servicios de chat global)
  getAllConfigurations(): ServiceConfiguration[] {
    const allConfigs = Array.from(this.configurations.values());
    
    // Filtrar servicios de chat global
    const filteredConfigs = allConfigs.filter(config => {
      const isChatGlobal = config.serviceId === 'chat-general' || 
                          config.serviceId === 'general-chat' ||
                          config.serviceName.toLowerCase().includes('chat general');
      
      return !isChatGlobal;
    });
    
    console.log('🔍 Filtered configurations (removed chat global):', filteredConfigs.length);
    return filteredConfigs;
  }

  // Actualizar configuración de un servicio
  async updateServiceConfiguration(serviceId: string, assistantId: string, assistantName: string): Promise<boolean> {
    try {
      const config = this.configurations.get(serviceId);
      if (config) {
        config.assistantId = assistantId;
        config.assistantName = assistantName;
        config.lastUpdated = new Date();
        this.configurations.set(serviceId, config);
        
        // Guardar en base de datos
        await this.dbService.createOrUpdateServiceConfig({
          serviceId: config.serviceId,
          serviceName: config.serviceName,
          assistantId: assistantId,
          assistantName: assistantName,
          isActive: config.isActive,
          lastUpdated: config.lastUpdated
        });
        
        console.log(`✅ Configuración actualizada para ${serviceId}: ${assistantName} - Guardado en BD`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error actualizando configuración:', error);
      return false;
    }
  }

  // Obtener asistente activo para un servicio
  getActiveAssistantForService(serviceId: string): string | null {
    const config = this.configurations.get(serviceId);
    return config && config.isActive ? config.assistantId : null;
  }

  // Activar/desactivar un servicio
  toggleService(serviceId: string, isActive: boolean): boolean {
    const config = this.configurations.get(serviceId);
    if (config) {
      config.isActive = isActive;
      config.lastUpdated = new Date();
      this.configurations.set(serviceId, config);
      return true;
    }
    return false;
  }

  // Verificar si un servicio está activo
  isServiceActive(serviceId: string): boolean {
    const config = this.configurations.get(serviceId);
    return config ? config.isActive : false;
  }

  // === STATUS-BASED DISABLE METHODS ===

  // Configurar deshabilitación basada en estados
  setStatusBasedDisableConfig(isEnabled: boolean, triggerStatuses: string[]): void {
    console.log(`🔧 Setting status-based disable config:`, {
      isEnabled,
      triggerStatuses,
      triggerStatusesType: typeof triggerStatuses,
      isArray: Array.isArray(triggerStatuses)
    });
    
    this.statusBasedDisableConfig = {
      isEnabled,
      triggerStatuses,
      lastUpdated: new Date()
    };
    console.log(`✅ Status-based disable config updated:`, {
      isEnabled,
      triggerStatuses,
      lastUpdated: this.statusBasedDisableConfig.lastUpdated
    });
  }

  // Obtener configuración de deshabilitación basada en estados
  getStatusBasedDisableConfig(): StatusBasedDisableConfig {
    console.log(`🔍 Getting status-based disable config:`, this.statusBasedDisableConfig);
    return this.statusBasedDisableConfig;
  }

  // Verificar si un estado debe deshabilitar la IA
  shouldDisableForStatus(status: string): boolean {
    if (!this.statusBasedDisableConfig.isEnabled) {
      return false;
    }
    return this.statusBasedDisableConfig.triggerStatuses.includes(status);
  }

  // Verificar si un ticket debe ser deshabilitado por cambio de estado
  async checkAndHandleStatusChange(issueKey: string, newStatus: string): Promise<boolean> {
    const wasDisabled = this.isTicketDisabled(issueKey);
    const shouldDisable = this.shouldDisableForStatus(newStatus);

    if (shouldDisable && !wasDisabled) {
      // Deshabilitar por cambio de estado
      await this.disableAssistantForTicket(
        issueKey, 
        `Auto-disabled: Status changed to "${newStatus}"`
      );
      console.log(`🚫 Auto-disabled AI for ticket ${issueKey} due to status change to "${newStatus}"`);
      return true;
    } else if (!shouldDisable && wasDisabled) {
      // Verificar si fue deshabilitado por cambio de estado
      const ticketInfo = this.getDisabledTicketInfo(issueKey);
      if (ticketInfo?.reason?.includes('Auto-disabled: Status changed to')) {
        // Reactivar automáticamente
        await this.enableAssistantForTicket(issueKey);
        console.log(`✅ Auto-re-enabled AI for ticket ${issueKey} due to status change from "${newStatus}"`);
        return true;
      }
    }

    return false;
  }

  // Agregar nuevo servicio
  addService(serviceId: string, serviceName: string, assistantId: string, assistantName: string): boolean {
    try {
      const newConfig: ServiceConfiguration = {
        serviceId,
        serviceName,
        assistantId,
        assistantName,
        isActive: true,
        lastUpdated: new Date()
      };
      
      this.configurations.set(serviceId, newConfig);
      console.log(`✅ Nuevo servicio agregado: ${serviceName}`);
      return true;
    } catch (error) {
      console.error('❌ Error agregando servicio:', error);
      return false;
    }
  }

  // Eliminar servicio
  removeService(serviceId: string): boolean {
    try {
      const removed = this.configurations.delete(serviceId);
      if (removed) {
        console.log(`✅ Servicio eliminado: ${serviceId}`);
      }
      return removed;
    } catch (error) {
      console.error('❌ Error eliminando servicio:', error);
      return false;
    }
  }

  // === TICKET CONTROL METHODS ===

  // Desactivar asistente para un ticket específico
  async disableAssistantForTicket(issueKey: string, reason: string = 'No reason provided'): Promise<void> {
    const disabledTicket: DisabledTicket = {
      issueKey,
      reason,
      disabledAt: new Date(),
      disabledBy: 'CEO Dashboard'
    };
    
    this.disabledTickets.set(issueKey, disabledTicket);
    
    // Persistir en base de datos
    try {
      await this.dbService.createOrUpdateDisabledTicket(disabledTicket);
      console.log(`🚫 AI Assistant disabled for ticket: ${issueKey} - Reason: ${reason} - Saved to DB`);
    } catch (error) {
      console.error('❌ Error saving disabled ticket to DB:', error);
    }
  }

  // Reactivar asistente para un ticket específico
  async enableAssistantForTicket(issueKey: string): Promise<void> {
    const removed = this.disabledTickets.delete(issueKey);
    if (removed) {
      // Remover de base de datos
      try {
        await this.dbService.removeDisabledTicket(issueKey);
        console.log(`✅ AI Assistant re-enabled for ticket: ${issueKey} - Removed from DB`);
      } catch (error) {
        console.error('❌ Error removing disabled ticket from DB:', error);
      }
    }
  }

  // Verificar si un ticket tiene el asistente desactivado
  isTicketDisabled(issueKey: string): boolean {
    return this.disabledTickets.has(issueKey);
  }

  // Obtener información de un ticket desactivado
  getDisabledTicketInfo(issueKey: string): DisabledTicket | null {
    return this.disabledTickets.get(issueKey) || null;
  }

  // Obtener lista de todos los tickets desactivados
  getDisabledTickets(): DisabledTicket[] {
    return Array.from(this.disabledTickets.values());
  }

  // Obtener estadísticas de tickets desactivados
  getDisabledTicketsStats(): { total: number; recent: number } {
    const total = this.disabledTickets.size;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = Array.from(this.disabledTickets.values())
      .filter(ticket => ticket.disabledAt > oneDayAgo).length;
    
    return { total, recent };
  }

  // === WEBHOOK CONFIGURATION METHODS ===

  // Configurar webhook URL
  setWebhookUrl(webhookUrl: string): void {
    this.webhookConfig = {
      webhookUrl,
      isEnabled: true,
      lastUpdated: new Date()
    };
    console.log(`✅ Webhook URL configurada: ${webhookUrl}`);
  }

  // Obtener webhook URL
  getWebhookUrl(): string | null {
    return this.webhookConfig?.webhookUrl || null;
  }

  // Habilitar/deshabilitar webhook
  setWebhookEnabled(isEnabled: boolean): void {
    if (this.webhookConfig) {
      this.webhookConfig.isEnabled = isEnabled;
      this.webhookConfig.lastUpdated = new Date();
      console.log(`✅ Webhook ${isEnabled ? 'habilitado' : 'deshabilitado'}`);
    }
  }

  // Verificar si webhook está habilitado
  isWebhookEnabled(): boolean {
    return this.webhookConfig?.isEnabled || false;
  }

  // Obtener configuración completa del webhook
  getWebhookConfiguration(): WebhookConfiguration | null {
    return this.webhookConfig;
  }
}
