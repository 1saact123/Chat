

import { ChatThread, ChatMessage, ServiceConfiguration, WebhookStats } from '../models';
import { ChatThreadAttributes, ChatMessageAttributes, ServiceConfigurationAttributes } from '../models';

export class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ===== CHAT THREADS =====
  
  async createOrUpdateThread(threadData: ChatThreadAttributes): Promise<ChatThread> {
    const [thread, created] = await ChatThread.upsert(threadData);
    console.log(`${created ? '✅ Created' : '🔄 Updated'} thread: ${thread.threadId}`);
    return thread;
  }

  async getThread(threadId: string): Promise<ChatThread | null> {
    return await ChatThread.findOne({ where: { threadId } });
  }

  async updateThreadActivity(threadId: string): Promise<void> {
    await ChatThread.update(
      { lastActivity: new Date() },
      { where: { threadId } }
    );
  }

  async getAllThreads(): Promise<ChatThread[]> {
    return await ChatThread.findAll({
      order: [['lastActivity', 'DESC']]
    });
  }

  async getParallelThreads(): Promise<ChatThread[]> {
    return await ChatThread.findAll({
      where: { isParallel: true },
      order: [['lastActivity', 'DESC']]
    });
  }

  // ===== CHAT MESSAGES =====
  
  async addMessage(messageData: ChatMessageAttributes): Promise<ChatMessage> {
    const message = await ChatMessage.create(messageData);
    console.log(`📝 Added message to thread: ${message.threadId}`);
    return message;
  }

  async getThreadMessages(threadId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await ChatMessage.findAll({
      where: { threadId },
      order: [['timestamp', 'ASC']],
      limit
    });
  }

  async getThreadMessagesCount(threadId: string): Promise<number> {
    return await ChatMessage.count({ where: { threadId } });
  }

  // ===== SERVICE CONFIGURATIONS =====
  
  async createOrUpdateServiceConfig(configData: ServiceConfigurationAttributes): Promise<ServiceConfiguration> {
    const [config, created] = await ServiceConfiguration.upsert(configData);
    console.log(`${created ? '✅ Created' : '🔄 Updated'} service config: ${config.serviceId}`);
    return config;
  }

  async getServiceConfig(serviceId: string): Promise<ServiceConfiguration | null> {
    return await ServiceConfiguration.findOne({ where: { serviceId } });
  }

  async getAllServiceConfigs(): Promise<ServiceConfiguration[]> {
    return await ServiceConfiguration.findAll({
      order: [['serviceName', 'ASC']]
    });
  }

  async updateServiceConfig(serviceId: string, updates: Partial<ServiceConfigurationAttributes>): Promise<void> {
    await ServiceConfiguration.update(
      { ...updates, lastUpdated: new Date() },
      { where: { serviceId } }
    );
  }

  // ===== WEBHOOK STATS =====
  
  async updateWebhookStats(date: Date, totalWebhooks: number, successfulResponses: number, failedResponses: number): Promise<void> {
    const [stats, created] = await WebhookStats.upsert({
      date,
      totalWebhooks,
      successfulResponses,
      failedResponses
    });
    
    console.log(`${created ? '✅ Created' : '🔄 Updated'} webhook stats for ${date.toISOString().split('T')[0]}`);
  }

  async getWebhookStats(date: Date): Promise<WebhookStats | null> {
    return await WebhookStats.findOne({ where: { date } });
  }

  async getWebhookStatsRange(startDate: Date, endDate: Date): Promise<WebhookStats[]> {
    return await WebhookStats.findAll({
      where: {
        date: {
          [require('sequelize').Op.between]: [startDate, endDate]
        }
      },
      order: [['date', 'ASC']]
    });
  }

  // ===== UTILITY METHODS =====
  
  async getThreadWithMessages(threadId: string): Promise<{ thread: ChatThread | null; messages: ChatMessage[] }> {
    const thread = await this.getThread(threadId);
    const messages = thread ? await this.getThreadMessages(threadId) : [];
    
    return { thread, messages };
  }

  async cleanupOldThreads(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const deletedCount = await ChatThread.destroy({
      where: {
        lastActivity: {
          [require('sequelize').Op.lt]: cutoffDate
        }
      }
    });
    
    console.log(`🧹 Cleaned up ${deletedCount} old threads`);
    return deletedCount;
  }

  async getDatabaseStats(): Promise<{
    totalThreads: number;
    totalMessages: number;
    totalServices: number;
    activeThreads: number;
  }> {
    const totalThreads = await ChatThread.count();
    const totalMessages = await ChatMessage.count();
    const totalServices = await ServiceConfiguration.count();
    
    const activeThreads = await ChatThread.count({
      where: {
        lastActivity: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });
    
    return {
      totalThreads,
      totalMessages,
      totalServices,
      activeThreads
    };
  }

  // ===== DISABLED TICKETS =====
  
  async createOrUpdateDisabledTicket(disabledTicket: { issueKey: string; reason: string; disabledAt: Date; disabledBy: string }): Promise<void> {
    // Por ahora usamos una tabla simple, en producción podrías crear una tabla específica
    // Por simplicidad, usamos la tabla de configuraciones con un prefijo especial
    const configId = `disabled_ticket_${disabledTicket.issueKey}`;
    
    await ServiceConfiguration.upsert({
      serviceId: configId,
      serviceName: `Disabled Ticket: ${disabledTicket.issueKey}`,
      assistantId: 'DISABLED',
      assistantName: `Disabled - ${disabledTicket.reason}`,
      isActive: false,
      lastUpdated: disabledTicket.disabledAt
    });
  }

  async removeDisabledTicket(issueKey: string): Promise<void> {
    const configId = `disabled_ticket_${issueKey}`;
    await ServiceConfiguration.destroy({
      where: { serviceId: configId }
    });
  }

  async getAllDisabledTickets(): Promise<Array<{ issueKey: string; reason: string; disabledAt: Date; disabledBy: string }>> {
    const disabledConfigs = await ServiceConfiguration.findAll({
      where: {
        serviceId: {
          [require('sequelize').Op.like]: 'disabled_ticket_%'
        }
      }
    });

    return disabledConfigs.map(config => ({
      issueKey: config.serviceId.replace('disabled_ticket_', ''),
      reason: config.assistantName.replace('Disabled - ', ''),
      disabledAt: config.lastUpdated || new Date(),
      disabledBy: 'CEO Dashboard'
    }));
  }
}
