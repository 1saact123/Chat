import OpenAI from 'openai';
import { ChatThread, ChatbotResponse, JiraWebhookPayload } from '../types';
import { ConfigurationService } from './configuration_service';

export class OpenAIService {
  private openai: OpenAI;
  private assistantId: string;
  private threads: Map<string, ChatThread> = new Map();
  private configService: ConfigurationService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.assistantId = process.env.OPENAI_ASSISTANT_ID || '';
    this.configService = new ConfigurationService();
  }

  async processJiraComment(payload: JiraWebhookPayload, enrichedContext?: any): Promise<ChatbotResponse> {
    const { issue, comment } = payload;
    
    if (!comment) {
      throw new Error('Comment data is missing');
    }

    // Verificar que no sea un comentario de la IA (detección más específica)
    const commentText = comment.body.toLowerCase();
    const authorName = comment.author.displayName.toLowerCase();
    
    // Solo bloquear si es claramente un comentario de IA
    const isAIAuthor = authorName.includes('ai') || 
                      authorName.includes('assistant') || 
                      authorName.includes('bot') ||
                      authorName.includes('automation');
    
    // Detectar comentarios de IA de manera más específica
    const isAIComment = commentText.includes('ai response') || 
                       commentText.includes('respuesta automática') ||
                       commentText.includes('como asistente de movonte') ||
                       (commentText.includes('soy un asistente') && commentText.length < 50); // Solo si es muy corto
    
    if (isAIAuthor || isAIComment) {
      console.log(`Skipping AI-generated comment from ${comment.author.displayName}`);
      console.log(`Reason: ${isAIAuthor ? 'AI Author' : 'AI Content'}`);
      console.log(`Comment text: ${comment.body}`);
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
      
      // Contexto específico para Jira (usar el enriquecido si está disponible)
      const context = enrichedContext || {
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
      console.log(`🔗 Attempting to call OpenAI API...`);

      // Usar el método que maneja el contexto y threads
      const result = await this.processWithChatCompletions(userMessage, threadId, context);
      console.log(`✅ OpenAI API call completed:`, result.success ? 'SUCCESS' : 'FAILED');
      return result;
      
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
    console.log('🔗 Using Chat Completions API with conversation history...');
    console.log(`📝 Message: ${message}`);
    console.log(`🧵 Thread ID: ${threadId}`);
    console.log(`🔧 Context:`, context);
    
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

      // Usar historial de conversación del contexto si está disponible (más reciente)
      let conversationHistory = context?.conversationHistory || [];
      if (conversationHistory.length > 0) {
        console.log(`📋 Using enriched conversation history: ${conversationHistory.length} messages`);
        const enrichedMessages = conversationHistory.map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
        messages.push(...enrichedMessages);
      } else {
        // Usar historial del thread si no hay contexto enriquecido
        const recentMessages = thread.messages.slice(-8).map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        messages.push(...recentMessages);
      }

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

      // Agregar instrucciones específicas para evitar repeticiones
      if (context?.previousResponses && context.previousResponses.length > 0) {
        const previousResponses = context.previousResponses.join('\n');
        userPrompt = `${userPrompt}\n\n[IMPORTANTE: Evita repetir respuestas similares a estas anteriores: ${previousResponses}]`;
      }

      messages.push({ role: 'user', content: userPrompt });

      console.log(`Thread ID: ${thread.threadId}`);
      console.log(`Messages in conversation: ${messages.length}`);
      console.log(`Previous messages in thread: ${thread.messages.length}`);
      console.log(`System Prompt: ${systemPrompt.substring(0, 100)}...`);
      console.log(`User Prompt: ${userPrompt}`);
      
      // Mostrar el historial de mensajes para debugging
      if (thread.messages.length > 0) {
        console.log(`📋 Conversation history for ${thread.threadId}:`);
        thread.messages.slice(-4).forEach((msg, index) => {
          console.log(`   ${index + 1}. [${msg.role}]: ${msg.content.substring(0, 100)}...`);
        });
      }

      console.log(`🚀 Making OpenAI API call with ${messages.length} messages...`);
      console.log(`🔑 API Key configured: ${this.openai.apiKey ? 'YES' : 'NO'}`);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 800,
        temperature: 0.8, // Aumentar ligeramente para más variedad
        presence_penalty: 0.3, // Penalizar repetición de temas
        frequency_penalty: 0.5 // Penalizar repetición de palabras
      });

      let assistantResponse = response.choices[0]?.message?.content;
      if (assistantResponse) {
        console.log('Chat Completions response:', assistantResponse);
        
        // Verificar si la respuesta es muy similar a respuestas anteriores
        const isRepetitive = this.checkForRepetitiveResponse(assistantResponse, context?.previousResponses || []);
        if (isRepetitive) {
          console.log('⚠️ Detected repetitive response, regenerating...');
          // Intentar generar una respuesta diferente
          const alternativeResponse = await this.generateAlternativeResponse(messages, context);
          if (alternativeResponse) {
            console.log('✅ Generated alternative response');
            assistantResponse = alternativeResponse;
          }
        }
        
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
      console.log(`🎯 Final response from OpenAI: ${assistantResponse.substring(0, 100)}...`);
      
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
- Siempre en español

**IMPORTANTE - Manejo de conversación:**
- SIEMPRE revisa el historial de la conversación antes de responder
- NO te repitas si ya has respondido algo similar
- Mantén el contexto de la conversación anterior
- Si el usuario hace preguntas relacionadas, responde de manera coherente
- Evita respuestas genéricas si ya has proporcionado información específica
- Si detectas que tu respuesta es similar a una anterior, proporciona información nueva o diferente
- Varía tu vocabulario y estructura de frases para evitar repeticiones
- Enfócate en información específica y relevante al contexto actual`;

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

  // Método para verificar si una respuesta es repetitiva
  private checkForRepetitiveResponse(currentResponse: string, previousResponses: string[]): boolean {
    if (previousResponses.length === 0) return false;
    
    const currentLower = currentResponse.toLowerCase();
    
    for (const prevResponse of previousResponses) {
      const prevLower = prevResponse.toLowerCase();
      const similarity = this.calculateSimilarity(currentLower, prevLower);
      
      if (similarity > 0.7) { // 70% de similitud
        console.log(`⚠️ High similarity detected: ${similarity.toFixed(2)}`);
        return true;
      }
    }
    
    return false;
  }

  // Método para calcular similitud entre textos
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // Método para generar una respuesta alternativa
  private async generateAlternativeResponse(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, context?: any): Promise<string | null> {
    try {
      // Modificar el prompt para solicitar una respuesta diferente
      const lastUserMessage = messages[messages.length - 1];
      const alternativePrompt = `${lastUserMessage.content}\n\n[IMPORTANTE: Proporciona una respuesta completamente diferente y única. Evita frases genéricas y repeticiones.]`;
      
      const modifiedMessages = [...messages.slice(0, -1), { role: 'user' as const, content: alternativePrompt }];
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: modifiedMessages,
        max_tokens: 800,
        temperature: 0.9, // Mayor temperatura para más variedad
        presence_penalty: 0.6, // Mayor penalización para repetición
        frequency_penalty: 0.8 // Mayor penalización para frecuencia
      });

      return response.choices[0]?.message?.content || null;
    } catch (error) {
      console.error('Error generating alternative response:', error);
      return null;
    }
  }

  // Método para listar todos los asistentes disponibles
  async listAssistants(): Promise<Array<{id: string, name: string, description?: string, model: string, created_at: number}>> {
    try {
      console.log('🔍 Listando asistentes disponibles...');
      
      const assistants = await this.openai.beta.assistants.list();
      
      console.log(`✅ Encontrados ${assistants.data.length} asistente(s)`);
      
      return assistants.data.map(assistant => ({
        id: assistant.id,
        name: assistant.name || 'Sin nombre',
        description: assistant.description || undefined,
        model: assistant.model,
        created_at: assistant.created_at
      }));
    } catch (error) {
      console.error('❌ Error al listar asistentes:', error);
      throw new Error(`Error al listar asistentes: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Método para cambiar el asistente activo
  setActiveAssistant(assistantId: string): void {
    this.assistantId = assistantId;
    console.log(`🔄 Asistente activo cambiado a: ${assistantId}`);
  }

  // Método para obtener el asistente activo actual
  getActiveAssistant(): string {
    return this.assistantId;
  }

  // Método para obtener el asistente activo de un servicio específico
  getActiveAssistantForService(serviceId: string): string | null {
    return this.configService.getActiveAssistantForService(serviceId);
  }

  // Método para procesar chat con asistente específico de un servicio
  async processChatForService(message: string, serviceId: string, threadId?: string, context?: any): Promise<ChatbotResponse> {
    try {
      // Obtener el asistente configurado para este servicio
      const serviceAssistantId = this.configService.getActiveAssistantForService(serviceId);
      
      if (!serviceAssistantId) {
        return {
          success: false,
          threadId: '',
          error: `No hay asistente configurado para el servicio '${serviceId}'`
        };
      }

      // Usar el asistente del servicio en lugar del asistente global
      const originalAssistantId = this.assistantId;
      this.assistantId = serviceAssistantId;

      try {
        const result = await this.processWithChatCompletions(message, threadId, context);
        return result;
      } finally {
        // Restaurar el asistente original
        this.assistantId = originalAssistantId;
      }

    } catch (error) {
      console.error('Error processing chat for service:', error);
      return {
        success: false,
        threadId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}