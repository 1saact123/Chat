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
  filterEnabled: boolean;
  filterCondition: string;
  filterValue: string;
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
    this.loadStatusBasedDisableConfig();
    this.loadWebhookConfig();
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
          // Filtrar configuraciones especiales que no son servicios reales
          if (dbConfig.serviceId.startsWith('disabled_ticket_') || 
              dbConfig.serviceId === 'status-based-disable') {
            continue;
          }
          
          console.log(`🔍 Procesando configuración de BD: ${dbConfig.serviceId} -> ${dbConfig.assistantName} (${dbConfig.assistantId})`);
          
          // SIEMPRE usar la configuración de BD si existe (excepto para configuraciones especiales)
          this.configurations.set(dbConfig.serviceId, {
            serviceId: dbConfig.serviceId,
            serviceName: dbConfig.serviceName,
            assistantId: dbConfig.assistantId,
            assistantName: dbConfig.assistantName,
            isActive: dbConfig.isActive,
            lastUpdated: dbConfig.lastUpdated || new Date()
          });
          
          console.log(`✅ Configuración actualizada desde BD: ${dbConfig.serviceName} -> ${dbConfig.assistantName} (Activo: ${dbConfig.isActive})`);
        }
        
        // Log del estado final de configuraciones
        console.log(`🔍 Estado final de configuraciones después de cargar BD:`);
        for (const [id, cfg] of this.configurations.entries()) {
          console.log(`  - ${id}: ${cfg.assistantName} (${cfg.assistantId}) - Activo: ${cfg.isActive}`);
        }
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
      console.log(`🔧 Actualizando configuración para servicio: ${serviceId}`);
      console.log(`📊 Asistente: ${assistantName} (${assistantId})`);
      
      const config = this.configurations.get(serviceId);
      if (config) {
        console.log(`📋 Configuración anterior: ${config.assistantName} (${config.assistantId})`);
        
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
        
        // Log de todas las configuraciones para debug
        console.log(`🔍 Estado actual de configuraciones:`);
        for (const [id, cfg] of this.configurations.entries()) {
          console.log(`  - ${id}: ${cfg.assistantName} (${cfg.assistantId}) - Activo: ${cfg.isActive}`);
        }
        
        // Verificar específicamente webhook-parallel después de actualizar landing-page
        if (serviceId === 'landing-page') {
          const webhookConfig = this.configurations.get('webhook-parallel');
          console.log(`🔍 Estado de webhook-parallel después de actualizar landing-page:`, webhookConfig);
          
          // Asegurar que webhook-parallel mantenga su configuración si está activo
          if (webhookConfig && webhookConfig.isActive && webhookConfig.assistantId !== process.env.OPENAI_ASSISTANT_ID) {
            console.log(`🔒 Manteniendo configuración webhook-parallel independiente: ${webhookConfig.assistantName}`);
          }
        }
        
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
  async setStatusBasedDisableConfig(isEnabled: boolean, triggerStatuses: string[]): Promise<void> {
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
    
    // Persistir en base de datos
    try {
      await this.dbService.createOrUpdateServiceConfig({
        serviceId: 'status-based-disable',
        serviceName: 'Status-Based Disable Config',
        assistantId: isEnabled ? 'ENABLED' : 'DISABLED',
        assistantName: `Trigger Statuses: ${triggerStatuses.join(', ')}`,
        isActive: true,
        lastUpdated: new Date()
      });
      console.log(`✅ Status-based disable config saved to database`);
    } catch (error) {
      console.error('❌ Error saving status-based disable config to database:', error);
    }
    
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

  // Cargar configuración de deshabilitación basada en estados desde la base de datos
  private async loadStatusBasedDisableConfig(): Promise<void> {
    try {
      const config = await this.dbService.getServiceConfig('status-based-disable');
      if (config) {
        const isEnabled = config.assistantId === 'ENABLED';
        const triggerStatuses = config.assistantName.includes('Trigger Statuses: ') 
          ? config.assistantName.replace('Trigger Statuses: ', '').split(', ').filter((s: string) => s.trim())
          : [];
        
        this.statusBasedDisableConfig = {
          isEnabled,
          triggerStatuses,
          lastUpdated: config.lastUpdated || new Date()
        };
        
        console.log(`✅ Status-based disable config loaded from database:`, this.statusBasedDisableConfig);
      }
    } catch (error) {
      console.error('❌ Error loading status-based disable config from database:', error);
    }
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

  // Cargar configuración del webhook desde la base de datos
  private async loadWebhookConfig(): Promise<void> {
    try {
      const config = await this.dbService.getWebhookConfig();
      if (config) {
        this.webhookConfig = {
          webhookUrl: config.webhookUrl || '',
          isEnabled: config.isEnabled,
          lastUpdated: config.lastUpdated,
          filterEnabled: config.filterEnabled,
          filterCondition: config.filterCondition,
          filterValue: config.filterValue
        };
        console.log(`✅ Webhook config loaded from database: ${config.webhookUrl ? 'URL set' : 'No URL'}, enabled: ${config.isEnabled}, filter: ${config.filterEnabled ? 'enabled' : 'disabled'}`);
      } else {
        console.log('⚠️ No webhook config found in database');
      }
    } catch (error) {
      console.error('❌ Error loading webhook config from database:', error);
    }
  }

  // Configurar webhook URL
  async setWebhookUrl(webhookUrl: string): Promise<void> {
    this.webhookConfig = {
      webhookUrl,
      isEnabled: true,
      lastUpdated: new Date(),
      filterEnabled: this.webhookConfig?.filterEnabled || false,
      filterCondition: this.webhookConfig?.filterCondition || 'response_value',
      filterValue: this.webhookConfig?.filterValue || 'Yes'
    };
    
    // Persistir en la base de datos
    await this.dbService.updateWebhookConfig(webhookUrl, true);
    console.log(`✅ Webhook URL configurada y persistida: ${webhookUrl}`);
  }

  // Obtener webhook URL
  getWebhookUrl(): string | null {
    return this.webhookConfig?.webhookUrl || null;
  }

  // Habilitar/deshabilitar webhook
  async setWebhookEnabled(isEnabled: boolean): Promise<void> {
    if (this.webhookConfig) {
      this.webhookConfig.isEnabled = isEnabled;
      this.webhookConfig.lastUpdated = new Date();
      
      // Persistir en la base de datos
      await this.dbService.updateWebhookConfig(this.webhookConfig.webhookUrl, isEnabled);
      console.log(`✅ Webhook ${isEnabled ? 'habilitado' : 'deshabilitado'} y persistido`);
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

  // Deshabilitar webhook (limpiar URL y deshabilitar)
  async disableWebhook(): Promise<void> {
    this.webhookConfig = {
      webhookUrl: '',
      isEnabled: false,
      lastUpdated: new Date(),
      filterEnabled: this.webhookConfig?.filterEnabled || false,
      filterCondition: this.webhookConfig?.filterCondition || 'response_value',
      filterValue: this.webhookConfig?.filterValue || 'Yes'
    };
    
    // Persistir en la base de datos
    await this.dbService.updateWebhookConfig(null, false);
    console.log(`✅ Webhook deshabilitado y persistido`);
  }

  // === WEBHOOK FILTER METHODS ===

  // Configurar filtro del webhook
  async setWebhookFilter(filterEnabled: boolean, filterCondition: string = 'response_value', filterValue: string = 'Yes'): Promise<void> {
    if (this.webhookConfig) {
      this.webhookConfig.filterEnabled = filterEnabled;
      this.webhookConfig.filterCondition = filterCondition;
      this.webhookConfig.filterValue = filterValue;
      this.webhookConfig.lastUpdated = new Date();
    }
    
    // Persistir en la base de datos
    await this.dbService.updateWebhookFilter(filterEnabled, filterCondition, filterValue);
    console.log(`✅ Webhook filter configurado y persistido: enabled=${filterEnabled}, condition=${filterCondition}, value=${filterValue}`);
  }

  // Verificar si el filtro está habilitado
  isWebhookFilterEnabled(): boolean {
    return this.webhookConfig?.filterEnabled || false;
  }

  // Obtener configuración del filtro
  getWebhookFilterConfig(): { filterEnabled: boolean; filterCondition: string; filterValue: string } | null {
    if (!this.webhookConfig) return null;
    
    return {
      filterEnabled: this.webhookConfig.filterEnabled,
      filterCondition: this.webhookConfig.filterCondition,
      filterValue: this.webhookConfig.filterValue
    };
  }

  // Verificar si la respuesta cumple con el filtro
  shouldSendWebhook(assistantResponse: any): boolean {
    console.log(`🔍 === WEBHOOK FILTER CHECK START ===`);
    console.log(`📋 Webhook config:`, {
      isEnabled: this.webhookConfig?.isEnabled,
      filterEnabled: this.webhookConfig?.filterEnabled,
      filterValue: this.webhookConfig?.filterValue
    });
    console.log(`📝 Assistant response:`, assistantResponse);

    if (!this.webhookConfig || !this.webhookConfig.isEnabled) {
      console.log(`❌ Webhook not enabled or not configured`);
      return false;
    }

    // Si el filtro está deshabilitado, enviar siempre
    if (!this.webhookConfig.filterEnabled) {
      console.log(`✅ Filter disabled, sending webhook`);
      return true;
    }

    // Extraer el valor del JSON de respuesta del asistente
    let responseValue = null;
    try {
      if (typeof assistantResponse === 'string') {
        const parsed = JSON.parse(assistantResponse);
        responseValue = parsed.value;
      } else if (typeof assistantResponse === 'object' && assistantResponse?.value) {
        responseValue = assistantResponse.value;
      }
    } catch (error) {
      console.log(`⚠️ Could not parse assistant response as JSON`);
    }

    console.log(`📝 Extracted response value: "${responseValue}"`);
    
    // LÓGICA: Solo enviar si el valor de la respuesta coincide con el filtro configurado
    const shouldSend = responseValue === this.webhookConfig.filterValue;
    
    console.log(`🔍 Filter logic: responseValue="${responseValue}", filterValue="${this.webhookConfig.filterValue}", shouldSend=${shouldSend}`);
    console.log(`🔍 === WEBHOOK FILTER CHECK END ===`);
    
    return shouldSend;
  }

}
