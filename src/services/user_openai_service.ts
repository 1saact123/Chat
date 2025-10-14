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
          error: `Service '${serviceId}' not found or inactive for user ${this.userId}`
        };
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
        const response = assistantMessage.content[0].text.value;
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
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async getUserServiceConfiguration(serviceId: string): Promise<any> {
    const config = await UserConfiguration.findOne({
      where: { userId: this.userId, serviceId }
    });
    return config;
  }

  private async getThread(threadId: string): Promise<any> {
    // Implementar lógica para obtener thread existente
    return null;
  }

  private async saveThread(threadId: string, openaiThreadId: string): Promise<void> {
    // Implementar lógica para guardar thread
  }
}
