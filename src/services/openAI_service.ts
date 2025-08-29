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

    // Verificar que no sea un comentario de la IA
    const commentText = comment.body.toLowerCase();
    if (commentText.includes('ai response') || 
        commentText.includes('asistente') ||
        commentText.includes('automático') ||
        comment.author.displayName.toLowerCase().includes('ai') ||
        comment.author.displayName.toLowerCase().includes('assistant')) {
      console.log(`Skipping AI-generated comment from ${comment.author.displayName}`);
      return {
        success: false,
        threadId: '',
        error: 'Skipped AI comment to prevent loops'
      };
    }

    console.log(`Processing Jira comment from ${comment.author.displayName} on issue ${issue.key}: ${comment.body}`);
    
    try {
      // Crear un threadId consistente para mantener el contexto de la conversación
      const threadId = `jira_${issue.key}`;
      
      // Construir el mensaje del usuario
      const userMessage = `From ${comment.author.displayName} on Jira issue ${issue.key}: ${comment.body}`;
      
      // Contexto específico para Jira
      const context = {
        jiraIssueKey: issue.key,
        issueSummary: issue.fields.summary,
        issueStatus: issue.fields.status.name,
        authorName: comment.author.displayName,
        isJiraComment: true,
        conversationType: 'jira-ticket'
      };

      console.log(`Processing Jira comment with context:`, context);
      console.log(`Thread ID: ${threadId}`);
      console.log(`User message: ${userMessage}`);

      // Usar el método que maneja el contexto y threads
      return await this.processWithChatCompletions(userMessage, threadId, context);
      
    } catch (error) {
      console.log('OpenAI API failed for Jira comment, using fallback response...');
      return this.getJiraFallbackResponse(comment, issue);
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
    console.log('Using Chat Completions API with conversation history...');
    try {
      // Instrucciones dinámicas basadas en el contexto
      let systemPrompt = this.buildDynamicSystemPrompt(context);
      
      // Obtener o crear el thread para mantener el historial
      let thread = this.threads.get(threadId || 'default');
      if (!thread) {
        thread = {
          threadId: threadId || `chat_${Date.now()}`,
          jiraIssueKey: context?.jiraIssueKey || 'general',
          lastActivity: new Date(),
          messages: []
        };
        this.threads.set(thread.threadId, thread);
        console.log(`Created new thread: ${thread.threadId}`);
      }

      // Construir el array de mensajes con el historial
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt }
      ];

      // Agregar mensajes del historial (últimos 10 para no exceder límites)
      const recentMessages = thread.messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      messages.push(...recentMessages);

      // Agregar el mensaje actual
      let userPrompt = message;
      
      // Agregar contexto de Jira si está disponible
      if (context?.jiraIssueKey) {
        userPrompt = `[Ticket Jira: ${context.jiraIssueKey}] ${message}`;
      }

      // Agregar contexto adicional si está disponible
      if (context?.additionalInfo) {
        userPrompt = `[Contexto adicional: ${context.additionalInfo}] ${userPrompt}`;
      }

      messages.push({ role: 'user', content: userPrompt });

      console.log(`Thread ID: ${thread.threadId}`);
      console.log(`Messages in conversation: ${messages.length}`);
      console.log(`System Prompt: ${systemPrompt.substring(0, 100)}...`);
      console.log(`User Prompt: ${userPrompt}`);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7
      });

      const assistantResponse = response.choices[0]?.message?.content;
      if (assistantResponse) {
        console.log('Chat Completions response:', assistantResponse);
        
        // Guardar el mensaje del usuario y la respuesta en el historial
        const now = new Date();
        thread.messages.push(
          { role: 'user', content: userPrompt, timestamp: now },
          { role: 'assistant', content: assistantResponse, timestamp: now }
        );
        thread.lastActivity = now;
        
        // Limpiar mensajes antiguos si hay demasiados (mantener últimos 20)
        if (thread.messages.length > 20) {
          thread.messages = thread.messages.slice(-20);
        }

        console.log(`Thread ${thread.threadId} updated with ${thread.messages.length} messages`);
        
        return {
          success: true,
          threadId: thread.threadId,
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

  private getJiraFallbackResponse(comment: any, issue: any): ChatbotResponse {
    console.log('Using Jira fallback response system...');
    
    const commentText = comment.body.toLowerCase();
    let response = '';

    if (commentText.includes('hola') || commentText.includes('hello')) {
      response = `¡Hola ${comment.author.displayName}! Soy el asistente de Movonte. Gracias por tu comentario en el ticket ${issue.key}. ¿En qué puedo ayudarte con este ticket?`;
    } else if (commentText.includes('ayuda') || commentText.includes('help')) {
      response = `Hola ${comment.author.displayName}, puedo ayudarte con:\n• Consultas sobre el ticket ${issue.key}\n• Información sobre el proyecto\n• Soporte técnico general\n• Seguimiento del progreso\n¿Qué necesitas específicamente?`;
    } else if (commentText.includes('estado') || commentText.includes('status')) {
      response = `Hola ${comment.author.displayName}, veo que el ticket ${issue.key} está en estado "${issue.fields.status.name}". ¿Necesitas información sobre el progreso o ayuda con algo específico?`;
    } else if (commentText.includes('proyecto') || commentText.includes('project')) {
      response = `Hola ${comment.author.displayName}, este ticket pertenece al proyecto ${issue.fields.project.name}. ¿Necesitas información específica sobre el proyecto o ayuda con este ticket?`;
    } else {
      response = `Hola ${comment.author.displayName}, gracias por tu comentario en el ticket ${issue.key}. Soy el asistente de Movonte y estoy aquí para ayudarte. Actualmente estoy en modo de respaldo, pero puedo asistirte con consultas sobre este ticket. ¿En qué puedo ayudarte específicamente?`;
    }

    return {
      success: true,
      threadId: `jira_fallback_${issue.key}_${Date.now()}`,
      response: response
    };
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