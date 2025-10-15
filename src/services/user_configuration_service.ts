import { DatabaseService } from './database_service';
import { User, UserConfiguration, UserWebhook, UserInstance, UserDisabledTicket } from '../models';

interface UserServiceConfiguration {
  serviceId: string;
  serviceName: string;
  assistantId: string;
  assistantName: string;
  isActive: boolean;
  configuration?: any;
  lastUpdated: Date;
}

interface UserWebhookConfiguration {
  id?: number;
  name: string;
  url: string;
  description?: string;
  isEnabled: boolean;
  filterEnabled: boolean;
  filterCondition?: string;
  filterValue?: string;
  webhookUrl?: string;
  lastTest?: string;
}

interface UserInstanceConfiguration {
  id?: number;
  instanceName: string;
  instanceDescription?: string;
  isActive: boolean;
  settings?: any;
}

interface DisabledTicket {
  issueKey: string;
  reason: string;
  disabledAt: string;
  disabledBy: string;
}

export class UserConfigurationService {
  private static instances: Map<number, UserConfigurationService> = new Map();
  private userId: number;
  private configurations: Map<string, UserServiceConfiguration> = new Map();
  private webhookConfig: UserWebhookConfiguration | null = null;
  private dbService: DatabaseService;

  private constructor(userId: number) {
    this.userId = userId;
    this.dbService = DatabaseService.getInstance();
    this.loadUserConfigurations();
  }

  public static getInstance(userId: number): UserConfigurationService {
    if (!UserConfigurationService.instances.has(userId)) {
      UserConfigurationService.instances.set(userId, new UserConfigurationService(userId));
    }
    return UserConfigurationService.instances.get(userId)!;
  }

  private async loadUserConfigurations(): Promise<void> {
    try {
      console.log(`🔄 Loading configurations for user ${this.userId}...`);
      
      // Cargar configuraciones de servicios
      const serviceConfigs = await UserConfiguration.findAll({
        where: { userId: this.userId }
      });

      this.configurations.clear();
      serviceConfigs.forEach(config => {
        this.configurations.set(config.serviceId, {
          serviceId: config.serviceId,
          serviceName: config.serviceName,
          assistantId: config.assistantId,
          assistantName: config.assistantName,
          isActive: config.isActive,
          configuration: config.configuration,
          lastUpdated: config.lastUpdated || config.updatedAt
        });
      });

      // Cargar configuración de webhook
      const webhookConfig = await UserWebhook.findOne({
        where: { userId: this.userId, isEnabled: true }
      });

      if (webhookConfig) {
        this.webhookConfig = {
          id: webhookConfig.id,
          name: webhookConfig.name,
          url: webhookConfig.url,
          description: webhookConfig.description,
          isEnabled: webhookConfig.isEnabled,
          filterEnabled: webhookConfig.filterEnabled,
          filterCondition: webhookConfig.filterCondition,
          filterValue: webhookConfig.filterValue
        };
      }

      console.log(`✅ Loaded ${this.configurations.size} service configurations for user ${this.userId}`);
      if (this.webhookConfig) {
        console.log(`✅ Loaded webhook configuration for user ${this.userId}`);
      }
    } catch (error) {
      console.error(`❌ Error loading configurations for user ${this.userId}:`, error);
    }
  }

  // Métodos para configuraciones de servicios
  public async setServiceConfiguration(
    serviceId: string,
    serviceName: string,
    assistantId: string,
    assistantName: string,
    isActive: boolean = true,
    configuration?: any
  ): Promise<void> {
    try {
      const configData = {
        serviceId,
        serviceName,
        assistantId,
        assistantName,
        isActive,
        configuration,
        lastUpdated: new Date()
      };

      await UserConfiguration.upsert({
        userId: this.userId,
        ...configData
      });

      this.configurations.set(serviceId, configData);
      console.log(`✅ Service configuration updated for user ${this.userId}: ${serviceId}`);
    } catch (error) {
      console.error(`❌ Error setting service configuration for user ${this.userId}:`, error);
      throw error;
    }
  }

  public getServiceConfiguration(serviceId: string): UserServiceConfiguration | null {
    return this.configurations.get(serviceId) || null;
  }

  public getAllServiceConfigurations(): UserServiceConfiguration[] {
    return Array.from(this.configurations.values());
  }

  public async removeServiceConfiguration(serviceId: string): Promise<void> {
    try {
      await UserConfiguration.destroy({
        where: { userId: this.userId, serviceId }
      });
      this.configurations.delete(serviceId);
      console.log(`✅ Service configuration removed for user ${this.userId}: ${serviceId}`);
    } catch (error) {
      console.error(`❌ Error removing service configuration for user ${this.userId}:`, error);
      throw error;
    }
  }

  // Métodos para configuración de webhook
  public async setWebhookConfiguration(config: UserWebhookConfiguration): Promise<void> {
    try {
      const webhookData = {
        userId: this.userId,
        name: config.name,
        url: config.url,
        description: config.description,
        isEnabled: config.isEnabled,
        filterEnabled: config.filterEnabled,
        filterCondition: config.filterCondition,
        filterValue: config.filterValue
      };

      if (config.id) {
        await UserWebhook.update(webhookData, {
          where: { id: config.id, userId: this.userId }
        });
      } else {
        await UserWebhook.create(webhookData);
      }

      this.webhookConfig = { ...config };
      console.log(`✅ Webhook configuration updated for user ${this.userId}`);
    } catch (error) {
      console.error(`❌ Error setting webhook configuration for user ${this.userId}:`, error);
      throw error;
    }
  }

  public getWebhookConfiguration(): UserWebhookConfiguration | null {
    return this.webhookConfig;
  }

  public isWebhookEnabled(): boolean {
    return this.webhookConfig?.isEnabled || false;
  }

  public getWebhookUrl(): string | null {
    return this.webhookConfig?.url || null;
  }

  public async setWebhookFilter(
    filterEnabled: boolean,
    filterCondition?: string,
    filterValue?: string
  ): Promise<void> {
    try {
      if (!this.webhookConfig) {
        throw new Error('No webhook configuration found');
      }

      await UserWebhook.update({
        filterEnabled,
        filterCondition,
        filterValue
      }, {
        where: { userId: this.userId, isEnabled: true }
      });

      this.webhookConfig.filterEnabled = filterEnabled;
      this.webhookConfig.filterCondition = filterCondition;
      this.webhookConfig.filterValue = filterValue;

      console.log(`✅ Webhook filter updated for user ${this.userId}`);
    } catch (error) {
      console.error(`❌ Error setting webhook filter for user ${this.userId}:`, error);
      throw error;
    }
  }

  public shouldSendWebhook(assistantResponse: any): boolean {
    console.log(`🔍 === WEBHOOK FILTER CHECK START (User ${this.userId}) ===`);
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

  // Métodos para instancias
  public async createInstance(config: UserInstanceConfiguration): Promise<UserInstance> {
    try {
      const instance = await UserInstance.create({
        userId: this.userId,
        instanceName: config.instanceName,
        instanceDescription: config.instanceDescription,
        isActive: config.isActive,
        settings: config.settings
      });

      console.log(`✅ Instance created for user ${this.userId}: ${config.instanceName}`);
      return instance;
    } catch (error) {
      console.error(`❌ Error creating instance for user ${this.userId}:`, error);
      throw error;
    }
  }

  public async getUserInstances(): Promise<UserInstance[]> {
    try {
      return await UserInstance.findAll({
        where: { userId: this.userId },
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      console.error(`❌ Error getting instances for user ${this.userId}:`, error);
      throw error;
    }
  }

  public async updateInstance(instanceId: number, config: Partial<UserInstanceConfiguration>): Promise<void> {
    try {
      await UserInstance.update(config, {
        where: { id: instanceId, userId: this.userId }
      });
      console.log(`✅ Instance updated for user ${this.userId}: ${instanceId}`);
    } catch (error) {
      console.error(`❌ Error updating instance for user ${this.userId}:`, error);
      throw error;
    }
  }

  public async deleteInstance(instanceId: number): Promise<void> {
    try {
      await UserInstance.destroy({
        where: { id: instanceId, userId: this.userId }
      });
      console.log(`✅ Instance deleted for user ${this.userId}: ${instanceId}`);
    } catch (error) {
      console.error(`❌ Error deleting instance for user ${this.userId}:`, error);
      throw error;
    }
  }

  // Método para recargar configuraciones
  public async reloadConfigurations(): Promise<void> {
    await this.loadUserConfigurations();
  }

  // Método para limpiar instancia
  public static clearInstance(userId: number): void {
    UserConfigurationService.instances.delete(userId);
  }

  // Métodos para manejo de tickets deshabilitados
  public async disableAssistantForTicket(issueKey: string, reason: string): Promise<void> {
    try {
      await UserDisabledTicket.upsert({
        userId: this.userId,
        issueKey,
        reason,
        disabledAt: new Date(),
        disabledBy: `user_${this.userId}`
      });
      console.log(`✅ Ticket ${issueKey} disabled for user ${this.userId}`);
    } catch (error) {
      console.error(`❌ Error disabling ticket ${issueKey} for user ${this.userId}:`, error);
      throw error;
    }
  }

  public async enableAssistantForTicket(issueKey: string): Promise<void> {
    try {
      await UserDisabledTicket.destroy({
        where: { userId: this.userId, issueKey }
      });
      console.log(`✅ Ticket ${issueKey} enabled for user ${this.userId}`);
    } catch (error) {
      console.error(`❌ Error enabling ticket ${issueKey} for user ${this.userId}:`, error);
      throw error;
    }
  }

  public async isTicketDisabled(issueKey: string): Promise<boolean> {
    try {
      const ticket = await UserDisabledTicket.findOne({
        where: { userId: this.userId, issueKey }
      });
      return !!ticket;
    } catch (error) {
      console.error(`❌ Error checking if ticket ${issueKey} is disabled for user ${this.userId}:`, error);
      return false;
    }
  }

  public async getTicketInfo(issueKey: string): Promise<DisabledTicket | null> {
    try {
      const ticket = await UserDisabledTicket.findOne({
        where: { userId: this.userId, issueKey }
      });
      
      if (!ticket) return null;
      
      return {
        issueKey: ticket.issueKey,
        reason: ticket.reason || '',
        disabledAt: ticket.disabledAt?.toISOString() || new Date().toISOString(),
        disabledBy: ticket.disabledBy || `user_${this.userId}`
      };
    } catch (error) {
      console.error(`❌ Error getting ticket info for ${issueKey} and user ${this.userId}:`, error);
      return null;
    }
  }

  public async getDisabledTickets(): Promise<DisabledTicket[]> {
    try {
      const tickets = await UserDisabledTicket.findAll({
        where: { userId: this.userId },
        order: [['disabledAt', 'DESC']]
      });
      
      return tickets.map(ticket => ({
        issueKey: ticket.issueKey,
        reason: ticket.reason || '',
        disabledAt: ticket.disabledAt?.toISOString() || new Date().toISOString(),
        disabledBy: ticket.disabledBy || `user_${this.userId}`
      }));
    } catch (error) {
      console.error(`❌ Error getting disabled tickets for user ${this.userId}:`, error);
      return [];
    }
  }
}
