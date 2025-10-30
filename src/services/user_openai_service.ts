import OpenAI from 'openai';
import { ChatThread, ChatbotResponse } from '../types';
import { User, UserConfiguration } from '../models';

export class UserOpenAIService {
  private openai: OpenAI;
  private userId: number;
  private threads: Map<string, ChatThread> = new Map();

  constructor(userId: number, openaiApiKey: string) {
    this.userId = userId;
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
  }

  // Listar asistentes del usuario
  async listAssistants(): Promise<any[]> {
    try {
      const assistants = await this.openai.beta.assistants.list();
      return assistants.data.map(assistant => ({
        id: assistant.id,
        name: assistant.name,
        instructions: assistant.instructions,
        model: assistant.model,
        createdAt: assistant.created_at
      }));
    } catch (error) {
      console.error(`Error listing assistants for user ${this.userId}:`, error);
      throw error;
    }
  }

  // Procesar chat con servicio específico del usuario
  async processChatForService(message: string, serviceId: string, threadId?: string, context?: any): Promise<ChatbotResponse> {
    try {
      console.log(`🔄 User ${this.userId} processing chat for service ${serviceId}`);

      // Obtener configuración del servicio del usuario
      const serviceConfig = await this.getUserServiceConfiguration(serviceId);
      if (!serviceConfig || !serviceConfig.isActive) {
        return {
          success: false,
          threadId: '',
          error: `Service '${serviceId}' not found or inactive for user ${this.userId}`
        };
      }

      // Per-service ignore checks: specific disabled tickets OR tickets with disabled status in configured project
      try {
        const issueKeyFromContext = context?.jiraIssueKey || threadId?.match(/([A-Z]+-\d+)/)?.[1];
        if (issueKeyFromContext && serviceConfig.configuration) {
          const cfg = serviceConfig.configuration;
          
          // Check 1: Is this specific ticket in the disabled_tickets list?
          const disabledTickets: string[] = Array.isArray(cfg?.disabled_tickets) ? cfg.disabled_tickets : [];
          if (disabledTickets.includes(issueKeyFromContext)) {
            console.log(`🚫 Omitting AI response for ${issueKeyFromContext} - ticket is in disabled_tickets list (service ${serviceId}, user ${this.userId})`);
            return {
              success: true,
              response: '',
              threadId: threadId || `user_${this.userId}_${Date.now()}`,
              assistantId: serviceConfig.assistantId,
              assistantName: serviceConfig.assistantName
            };
          }

          // Check 2: Is this ticket's status in the disable_tickets_state list for the configured project?
          const disableStates: string[] = Array.isArray(cfg?.disable_tickets_state) ? cfg.disable_tickets_state : [];
          const cfgProjectKey: string | undefined = cfg?.projectKey;

          if (disableStates.length > 0 && cfgProjectKey && issueKeyFromContext) {
            const user = await User.findByPk(this.userId);
            if (user && user.jiraToken && (user as any).jiraUrl) {
              const { UserJiraService } = await import('./user_jira_service');
              const jira = new UserJiraService(this.userId, user.jiraToken, (user as any).jiraUrl, user.email);
              try {
                const issue = await jira.getIssueByKey(issueKeyFromContext);
                const issueStatus: string | undefined = issue?.fields?.status?.name;
                const issueProjectKey: string | undefined = issue?.fields?.project?.key;

                if (issueStatus && issueProjectKey && issueProjectKey === cfgProjectKey && disableStates.includes(issueStatus)) {
                  console.log(`🚫 Omitting AI response for ${issueKeyFromContext} due to status "${issueStatus}" in project ${cfgProjectKey} (service ${serviceId}, user ${this.userId})`);
                  return {
                    success: true,
                    response: '',
                    threadId: threadId || `user_${this.userId}_${Date.now()}`,
                    assistantId: serviceConfig.assistantId,
                    assistantName: serviceConfig.assistantName
                  };
                }
              } catch (jiraErr) {
                console.warn('⚠️ Failed to check issue status for ignore check:', jiraErr);
              }
            }
          }
        }
      } catch (ignoreErr) {
        console.warn('⚠️ Per-service ignore check failed, continuing normally:', ignoreErr);
      }

      // Usar el asistente del usuario
      const assistant = await this.openai.beta.assistants.retrieve(serviceConfig.assistantId);
      const systemPrompt = assistant.instructions || "You are a helpful assistant.";

      // Crear o usar thread existente
      let thread;
      if (threadId) {
        const existingThread = await this.getThread(threadId);
        if (existingThread) {
          thread = existingThread;
        }
      }

      if (!thread) {
        thread = await this.openai.beta.threads.create();
        await this.saveThread(threadId || `user_${this.userId}_${Date.now()}`, thread.id);
      }

      // Crear mensaje en el thread
      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: message
      });

      // Ejecutar asistente
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: serviceConfig.assistantId
      });

      // Esperar respuesta
      let runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
      while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      if (runStatus.status === 'completed') {
        const messages = await this.openai.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data[0];
        const response = (assistantMessage.content[0] as any).text.value;

        return {
          success: true,
          response: response,
          threadId: threadId || `user_${this.userId}_${Date.now()}`,
          assistantId: serviceConfig.assistantId,
          assistantName: serviceConfig.assistantName
        };
      } else {
        return {
          success: false,
          threadId: '',
          error: `Assistant run failed with status: ${runStatus.status}`
        };
      }
    } catch (error) {
      console.error(`Error processing chat for user ${this.userId}:`, error);
      return {
        success: false,
        threadId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async getUserServiceConfiguration(serviceId: string): Promise<any> {
    const { sequelize } = await import('../config/database');
    const [configurations] = await sequelize.query(`
      SELECT * FROM unified_configurations 
      WHERE user_id = ? AND service_id = ? AND is_active = TRUE
      LIMIT 1
    `, {
      replacements: [this.userId, serviceId]
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
      lastUpdated: config.last_updated,
      configuration: typeof config.configuration === 'string' 
        ? JSON.parse(config.configuration) 
        : config.configuration
    };
  }

  private async getThread(threadId: string): Promise<any> {
    // Implementar lógica para obtener thread existente
    return null;
  }

  private async saveThread(threadId: string, openaiThreadId: string): Promise<void> {
    // Implementar lógica para guardar thread
  }
}
