import OpenAI from 'openai';
import { ChatThread, ChatbotResponse, JiraWebhookPayload } from '../types';

export class OpenAIService {
  private openai: OpenAI;
  private assistantId: string;
  private threads: Map<string, ChatThread> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.assistantId = process.env.OPENAI_ASSISTANT_ID || '';
  }

  async processJiraComment(payload: JiraWebhookPayload): Promise<ChatbotResponse> {
    const { issue, comment } = payload;
    
    if (!comment) {
      throw new Error('Comment data is missing');
    }

    const threadKey = `jira_${issue.key}`;
    
    try {
      let thread = this.threads.get(threadKey);
      
      if (!thread) {
        const openaiThread = await this.openai.beta.threads.create({
          metadata: {
            jiraIssueKey: issue.key,
            jiraIssueId: issue.id,
          }
        });
        
        thread = {
          threadId: openaiThread.id,
          jiraIssueKey: issue.key,
          lastActivity: new Date(),
          messages: []
        };
        
        this.threads.set(threadKey, thread);
      }

      const userMessage = `From ${comment.author.displayName} on Jira issue ${issue.key}: ${comment.body}`;
      
      await this.openai.beta.threads.messages.create(thread.threadId, {
        role: 'user',
        content: userMessage
      });

      const run = await this.openai.beta.threads.runs.create(thread.threadId, {
        assistant_id: this.assistantId,
        additional_instructions: `You are helping with Jira issue ${issue.key}: "${issue.fields.summary}". Current status: ${issue.fields.status.name}. Provide helpful, concise responses.`
      });

      const completedRun = await this.waitForRunCompletion(thread.threadId, run.id);
      
      if (completedRun.status === 'completed') {
        const messages = await this.openai.beta.threads.messages.list(thread.threadId);
        const assistantMessage = messages.data.find(msg => 
          msg.role === 'assistant' && msg.run_id === run.id
        );

        if (assistantMessage && assistantMessage.content[0].type === 'text') {
          const response = assistantMessage.content[0].text.value;
          
          thread.messages.push(
            {
              role: 'user',
              content: userMessage,
              timestamp: new Date()
            },
            {
              role: 'assistant',
              content: response,
              timestamp: new Date()
            }
          );
          thread.lastActivity = new Date();

          return {
            success: true,
            threadId: thread.threadId,
            response: response
          };
        }
      }

      return {
        success: false,
        threadId: thread.threadId,
        error: 'Failed to get assistant response'
      };

    } catch (error) {
      console.error('Error processing Jira comment:', error);
      return {
        success: false,
        threadId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async processDirectChat(message: string, threadId?: string, context?: any): Promise<ChatbotResponse> {
    try {
      console.log('processDirectChat called with:', { message, threadId, context });
      
      // Usar Chat Completions directamente (no necesita asistente específico)
      return await this.processWithChatCompletions(message, threadId, context);

    } catch (error) {
      console.error('Error handling chat message:', error);
      return {
        success: false,
        threadId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async processJiraChatMessage(message: string, issueKey?: string, userInfo?: any): Promise<ChatbotResponse> {
    try {
      console.log(`Processing Jira chat message for issue ${issueKey}: ${message}`);
      
      // Thread específico para el chat
      const threadId = `jira_chat_${issueKey || 'general'}_${Date.now()}`;
      
      // Contexto específico para chat
      const context = {
        jiraIssueKey: issueKey,
        isChatMessage: true,
        chatWidget: 'jira-native',
        userInfo: userInfo,
        messageType: 'chat'
      };

      // Instrucciones específicas para chat
      const chatInstructions = `
        Eres un asistente de chat en Jira para Movonte. 
        Responde de manera conversacional y útil.
        Si hay un ticket asociado, proporciona información relevante.
        Mantén un tono profesional pero amigable.
        Sugiere acciones concretas cuando sea apropiado.
      `;

      const result = await this.processDirectChat(message, threadId, context);
      
      return result;

    } catch (error) {
      console.error('Error processing Jira chat message:', error);
      return {
        success: false,
        threadId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async processWithChatCompletions(message: string, threadId?: string, context?: any): Promise<ChatbotResponse> {
    console.log('Using Chat Completions API with dynamic instructions...');
    try {
      // Instrucciones dinámicas basadas en el contexto
      let systemPrompt = this.buildDynamicSystemPrompt(context);
      let userPrompt = message;
      
      // Agregar contexto de Jira si está disponible
      if (context?.jiraIssueKey) {
        userPrompt = `[Ticket Jira: ${context.jiraIssueKey}] ${message}`;
      }

      // Agregar contexto adicional si está disponible
      if (context?.additionalInfo) {
        userPrompt = `[Contexto adicional: ${context.additionalInfo}] ${userPrompt}`;
      }

      console.log('System Prompt:', systemPrompt);
      console.log('User Prompt:', userPrompt);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const assistantResponse = response.choices[0]?.message?.content;
      if (assistantResponse) {
        console.log('Chat Completions response:', assistantResponse);
        return {
          success: true,
          threadId: threadId || `chat_${Date.now()}`,
          response: assistantResponse
        };
      } else {
        throw new Error('No response from Chat Completions');
      }
    } catch (error) {
      console.log('OpenAI API failed, using fallback responses...');
      return this.getFallbackResponse(message, context);
    }
  }

  private buildDynamicSystemPrompt(context?: any): string {
    let basePrompt = `Eres un asistente de Movonte, una empresa de desarrollo de software especializada en soluciones tecnológicas innovadoras.

**Información de la empresa:**
- Empresa: Movonte
- Sector: Desarrollo de software
- Enfoque: Soluciones tecnológicas empresariales

**Capacidades principales:**
- Soporte técnico para proyectos de desarrollo
- Análisis y resolución de problemas técnicos
- Consultoría en arquitectura de software
- Gestión de proyectos y metodologías ágiles
- Integración con herramientas como Jira, Git, etc.

**Estilo de comunicación:**
- Profesional pero cercano
- Respuestas claras y concisas
- Uso de ejemplos prácticos cuando sea apropiado
- Siempre en español`;

    // Agregar contexto específico para Service Desk
    if (context?.serviceDesk) {
      basePrompt += `

**ESPECIALIZACIÓN EN SERVICE DESK:**
- Eres un asistente especializado en Jira Service Desk
- Ayudas con tickets, SLA, soporte técnico y atención al cliente
- Conoces los procesos de Movonte para resolución de problemas
- Proporcionas información sobre políticas de soporte y tiempos de respuesta

**Funciones específicas de Service Desk:**
- Creación y seguimiento de tickets
- Consultas sobre SLA y tiempos de respuesta
- Soporte técnico y resolución de problemas
- Información sobre procesos y políticas de la empresa
- Guía para usar el sistema de tickets
- Escalamiento de problemas cuando sea necesario`;
    }

    // Agregar contexto específico para chat de Jira
    if (context?.isChatMessage) {
      basePrompt += `

**ESPECIALIZACIÓN EN CHAT DE JIRA:**
- Eres un asistente de chat integrado en Jira para Movonte
- Responde de manera conversacional y útil
- Proporciona información específica sobre tickets y proyectos
- Mantén un tono profesional pero amigable
- Sugiere acciones concretas cuando sea apropiado

**Funciones específicas del chat:**
- Ayuda con consultas sobre tickets específicos
- Proporciona información sobre estados y progreso
- Sugiere próximos pasos y acciones
- Responde preguntas sobre procesos y políticas
- Ofrece soporte técnico contextual
- Mantiene conversaciones fluidas y útiles`;
    }

    // Agregar contexto específico de Jira si está disponible
    if (context?.jiraIssueKey) {
      basePrompt += `

**Contexto de Jira:**
- Estás trabajando con el ticket: ${context.jiraIssueKey}
- Puedes hacer referencia a este ticket en tus respuestas
- Si el usuario pregunta sobre el ticket, proporciona información relevante`;
    }

    // Agregar contexto de proyecto si está disponible
    if (context?.projectInfo) {
      basePrompt += `

**Información del proyecto:**
${context.projectInfo}`;
    }

    // Agregar instrucciones específicas si están disponibles
    if (context?.specificInstructions) {
      basePrompt += `

**Instrucciones específicas:**
${context.specificInstructions}`;
    }

    // Agregar contexto de usuario si está disponible
    if (context?.userRole) {
      basePrompt += `

**Rol del usuario:**
- El usuario es: ${context.userRole}
- Adapta tus respuestas según su nivel de experiencia técnica`;
    }

    basePrompt += `

**Recuerda:**
- Siempre ser útil y profesional
- Si no tienes suficiente información, pide más detalles
- Sugiere acciones concretas cuando sea apropiado
- Mantén un tono positivo y constructivo`;

    return basePrompt;
  }

  private getFallbackResponse(message: string, context?: any): ChatbotResponse {
    console.log('Using fallback response system...');
    
    const lowerMessage = message.toLowerCase();
    let response = '';

    if (lowerMessage.includes('hola') || lowerMessage.includes('hello')) {
      response = '¡Hola! Soy el asistente de Movonte. ¿En qué puedo ayudarte hoy?';
    } else if (lowerMessage.includes('jira') || context?.jiraIssueKey) {
      response = `Entiendo que estás trabajando con el ticket ${context?.jiraIssueKey || 'Jira'}. ¿Necesitas ayuda específica con este ticket?`;
    } else if (lowerMessage.includes('ayuda') || lowerMessage.includes('help')) {
      response = 'Puedo ayudarte con:\n• Consultas sobre tickets de Jira\n• Información sobre proyectos\n• Soporte técnico general\n¿Qué necesitas?';
    } else if (lowerMessage.includes('proyecto') || lowerMessage.includes('project')) {
      response = 'En Movonte trabajamos en diversos proyectos de desarrollo. ¿Te refieres a algún proyecto específico?';
    } else {
      response = 'Gracias por tu mensaje. Actualmente estoy en modo de respaldo debido a limitaciones de la API. ¿Puedo ayudarte con algo específico sobre Movonte o nuestros proyectos?';
    }

    return {
      success: true,
      threadId: `fallback_${Date.now()}`,
      response: response
    };
  }

  async getThreadHistory(threadId: string) {
    const messages = await this.openai.beta.threads.messages.list(threadId);
    
    return {
      success: true,
      threadId,
      messages: messages.data.map(msg => ({
        role: msg.role,
        content: msg.content[0].type === 'text' ? msg.content[0].text.value : '',
        timestamp: new Date(msg.created_at * 1000)
      }))
    };
  }

  getActiveThreads() {
    return Array.from(this.threads.entries()).map(([key, thread]) => ({
      key,
      threadId: thread.threadId,
      jiraIssueKey: thread.jiraIssueKey,
      lastActivity: thread.lastActivity,
      messageCount: thread.messages.length
    }));
  }

  private async waitForRunCompletion(threadId: string, runId: string, maxWaitTime = 30000): Promise<any> {
    const startTime = Date.now();
    let attempts = 0;
    
    while (Date.now() - startTime < maxWaitTime) {
      attempts++;
      console.log(`Checking run status (attempt ${attempts})...`);
      
      const run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
      console.log(`Run status: ${run.status}`);
      
      if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
        console.log(`Run finished with status: ${run.status}`);
        return run;
      }
      
      if (run.status === 'requires_action') {
        console.log('Run requires action, this might be a tool call');
        return run;
      }
      
      console.log('Waiting 1 second before next check...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Run timed out after', maxWaitTime, 'ms');
    throw new Error('Run timed out');
  }
}