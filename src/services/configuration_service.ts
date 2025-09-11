import { DatabaseService } from './database_service';

interface ServiceConfiguration {
  serviceId: string;
  serviceName: string;
  assistantId: string;
  assistantName: string;
  isActive: boolean;
  lastUpdated: Date;
}

export class ConfigurationService {
  private static instance: ConfigurationService;
  private configurations: Map<string, ServiceConfiguration> = new Map();
  private readonly CONFIG_FILE = 'service-config.json';
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.loadConfigurations();
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
        isActive: true,
        lastUpdated: new Date()
      });

      this.configurations.set('chat-general', {
        serviceId: 'chat-general',
        serviceName: 'Chat General',
        assistantId: process.env.OPENAI_ASSISTANT_ID || '',
        assistantName: 'AI Assistant Chat',
        isActive: true,
        lastUpdated: new Date()
      });

      this.configurations.set('general-chat', {
        serviceId: 'general-chat',
        serviceName: 'Chat General',
        assistantId: process.env.OPENAI_ASSISTANT_ID || '',
        assistantName: ' AI Assistant Chat',
        isActive: true,
        lastUpdated: new Date()
      });

      console.log('✅ Configuraciones de servicio cargadas');
    } catch (error) {
      console.error('❌ Error cargando configuraciones:', error);
    }
  }

  // Obtener configuración de un servicio específico
  getServiceConfiguration(serviceId: string): ServiceConfiguration | null {
    return this.configurations.get(serviceId) || null;
  }

  // Obtener todas las configuraciones
  getAllConfigurations(): ServiceConfiguration[] {
    return Array.from(this.configurations.values());
  }

  // Actualizar configuración de un servicio
  updateServiceConfiguration(serviceId: string, assistantId: string, assistantName: string): boolean {
    try {
      const config = this.configurations.get(serviceId);
      if (config) {
        config.assistantId = assistantId;
        config.assistantName = assistantName;
        config.lastUpdated = new Date();
        this.configurations.set(serviceId, config);
        
        console.log(`✅ Configuración actualizada para ${serviceId}: ${assistantName}`);
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
}
