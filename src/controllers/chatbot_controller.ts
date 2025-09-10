import { Request, Response } from 'express';
import { OpenAIService } from '../services/openAI_service';
import { EmailService } from '../services/email_service';
import { JiraWebhookPayload } from '../types';

export class ChatbotController {
  private processedComments = new Set<string>();
  private lastResponseTime = new Map<string, number>(); // Para throttling por issue
  private conversationHistory = new Map<string, Array<{role: string, content: string, timestamp: Date}>>(); // Historial por issue
  private webhookStats = {
    totalReceived: 0,
    duplicatesSkipped: 0,
    aiCommentsSkipped: 0,
    successfulResponses: 0,
    errors: 0,
    throttledRequests: 0,
    lastReset: new Date()
  };

  constructor(
    private openaiService: OpenAIService,
    private emailService: EmailService | null
  ) {}

  // Método privado para obtener estadísticas de webhooks
  private getWebhookStatsData() {
    return {
      ...this.webhookStats,
      processedCommentsCount: this.processedComments.size,
      uptime: Date.now() - this.webhookStats.lastReset.getTime()
    };
  }

  // Método privado para limpiar estadísticas
  private resetWebhookStatsData() {
    this.webhookStats = {
      totalReceived: 0,
      duplicatesSkipped: 0,
      aiCommentsSkipped: 0,
      successfulResponses: 0,
      errors: 0,
      throttledRequests: 0,
      lastReset: new Date()
    };
    this.processedComments.clear();
    this.lastResponseTime.clear();
    this.conversationHistory.clear();
    console.log('🔄 Webhook stats reset');
  }

  // Método simplificado para detectar comentarios de IA
  private isAIComment(comment: any): boolean {
    const authorName = comment.author.displayName.toLowerCase();
    const authorEmail = comment.author.emailAddress?.toLowerCase() || '';
    const commentBody = comment.body.toLowerCase();

    // Patrones de autor que indican comentarios de IA
    const aiAuthorPatterns = [
      'ai', 'assistant', 'bot', 'automation', 'noreply',
      'system', 'automated', 'chatbot', 'contact service account'
    ];
    
    // Patrones en el contenido que indican comentarios de IA
    const aiContentPatterns = [
      '[jira] ai assistant:', '[widget chat]', 'sent via widget chat',
      'sent via jira', 'complete.', 'how can i assist you',
      '🎯 **chat session started**', 'chat widget connected'
    ];
    
    // Detectar por autor
    const isAIAuthor = aiAuthorPatterns.some(pattern => 
      authorName.includes(pattern) || authorEmail.includes(pattern)
    );
    
    // Detectar por contenido
    const isAIContent = aiContentPatterns.some(pattern => 
      commentBody.includes(pattern)
    );
    
    return isAIAuthor || isAIContent;
  }

  // Method to calculate similarity between texts
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // Method to add message to conversation history
  private addToConversationHistory(issueKey: string, role: string, content: string): void {
    if (!this.conversationHistory.has(issueKey)) {
      this.conversationHistory.set(issueKey, []);
    }
    
    const history = this.conversationHistory.get(issueKey)!;
    history.push({
      role,
      content,
      timestamp: new Date()
    });
    
          // Keep only the last 20 messages per issue
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }
  }

  async handleJiraWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log('\n🔍 === WEBHOOK DEBUG INFO ===');
      console.log('📋 Headers recibidos:', JSON.stringify(req.headers, null, 2));
      console.log('📦 Body recibido:', JSON.stringify(req.body, null, 2));
      console.log('🌐 URL:', req.url);
      console.log('📝 Method:', req.method);
      console.log('🔗 Origin:', req.get('origin') || 'No origin');
      console.log('👤 User-Agent:', req.get('user-agent') || 'No user-agent');
      
      const payload: JiraWebhookPayload = req.body;
      this.webhookStats.totalReceived++;
      
      console.log(`\n📥 WEBHOOK RECIBIDO #${this.webhookStats.totalReceived}`);
      console.log(`   Evento: ${payload.webhookEvent}`);
      console.log(`   Issue: ${payload.issue.key}`);
      console.log(`   Usuario: ${payload.comment?.author?.displayName || 'N/A'}`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);
      
      // Solo procesar eventos de comentarios y creación de tickets
      if (payload.webhookEvent === 'comment_created' && payload.comment) {
        // Crear un ID único para este comentario
        const commentId = `${payload.issue.key}_${payload.comment.id}_${payload.comment.created}`;
        
        // Verificar si ya procesamos este comentario
        if (this.processedComments.has(commentId)) {
          this.webhookStats.duplicatesSkipped++;
          console.log(`⚠️  DUPLICADO DETECTADO: ${commentId}`);
          console.log(`   Estadísticas: ${this.webhookStats.duplicatesSkipped} duplicados de ${this.webhookStats.totalReceived} total`);
          res.json({ success: true, message: 'Comment already processed', duplicate: true });
          return;
        }
        
        // Marcar como procesado
        this.processedComments.add(commentId);
        
        // Limpiar comentarios antiguos (mantener solo los últimos 100)
        if (this.processedComments.size > 100) {
          const commentsArray = Array.from(this.processedComments);
          this.processedComments.clear();
          commentsArray.slice(-50).forEach(id => this.processedComments.add(id));
          console.log(`🧹 Limpieza: ${this.processedComments.size} comentarios en memoria`);
        }
        
        // Verificar que no sea un comentario de la IA (detección mejorada)
        if (this.isAIComment(payload.comment)) {
          this.webhookStats.aiCommentsSkipped++;
          console.log(`🤖 COMENTARIO DE IA DETECTADO:`);
          console.log(`   Autor: ${payload.comment.author.displayName}`);
          console.log(`   Email: ${payload.comment.author.emailAddress || 'N/A'}`);
          console.log(`   Account ID: ${payload.comment.author.accountId}`);
          console.log(`   Contenido: ${payload.comment.body.substring(0, 150)}...`);
          console.log(`   Estadísticas: ${this.webhookStats.aiCommentsSkipped} comentarios de IA saltados`);
          res.json({ success: true, message: 'Skipped AI comment', aiComment: true });
          return;
        }
        
        // Sistema de throttling para evitar respuestas muy rápidas
        const issueKey = payload.issue.key;
        const nowTimestamp = Date.now();
        const lastResponse = this.lastResponseTime.get(issueKey) || 0;
        const timeSinceLastResponse = nowTimestamp - lastResponse;
        const THROTTLE_DELAY = 15000; // 15 segundos entre respuestas por issue
        
        if (timeSinceLastResponse < THROTTLE_DELAY) {
          this.webhookStats.throttledRequests++;
          const remainingTime = Math.ceil((THROTTLE_DELAY - timeSinceLastResponse) / 1000);
          console.log(`🚫 THROTTLING: Demasiado pronto para responder a ${issueKey}`);
          console.log(`   Tiempo desde última respuesta: ${Math.ceil(timeSinceLastResponse / 1000)}s`);
          console.log(`   Tiempo restante: ${remainingTime}s`);
          console.log(`   Estadísticas: ${this.webhookStats.throttledRequests} requests throttled`);
          res.json({ 
            success: true, 
            message: `Throttled - wait ${remainingTime}s`, 
            throttled: true,
            remainingTime 
          });
          return;
        }
        
        console.log(`✅ PROCESANDO COMENTARIO: ${commentId}`);
        
        // Agregar el comentario del usuario al historial
        this.addToConversationHistory(issueKey, 'user', payload.comment.body);
        
        // Obtener historial de conversación para contexto
        const conversationHistory = this.conversationHistory.get(issueKey) || [];
        
        // Crear contexto enriquecido con historial
        const enrichedContext = {
          jiraIssueKey: issueKey,
          issueSummary: payload.issue.fields.summary,
          issueStatus: payload.issue.fields.status.name,
          authorName: payload.comment.author.displayName,
          isJiraComment: true,
          conversationType: 'jira-ticket',
          conversationHistory: conversationHistory.slice(-6), // Últimos 6 mensajes
          previousResponses: conversationHistory
            .filter(msg => msg.role === 'assistant')
            .slice(-3)
            .map(msg => msg.content)
        };
        
        // Usar el asistente específico del servicio chat-general para mantener consistencia
        const response = await this.openaiService.processChatForService(
          payload.comment.body, 
          'chat-general', 
          `jira_chat_${issueKey}`, // Usar el mismo thread que el widget
          enrichedContext
        );
        
        // Actualizar tiempo de última respuesta
        this.lastResponseTime.set(issueKey, nowTimestamp);
        
        // Si la IA respondió exitosamente, agregar el comentario a Jira
        if (response.success && response.response) {
          try {
            // Importar JiraService dinámicamente para evitar dependencias circulares
            const { JiraService } = await import('../services/jira_service');
            const jiraService = JiraService.getInstance();
            
            // Agregar comentario de la IA a Jira
            const jiraResponse = await jiraService.addCommentToIssue(payload.issue.key, response.response);
            this.webhookStats.successfulResponses++;
            
            // Agregar la respuesta de la IA al historial
            this.addToConversationHistory(issueKey, 'assistant', response.response);
            
            // Guardar el account ID de la IA para futuras detecciones
            if (jiraResponse && jiraResponse.author && jiraResponse.author.accountId) {
              console.log(`📝 Account ID de la IA detectado: ${jiraResponse.author.accountId}`);
            }
            
            console.log(`🎯 RESPUESTA DE IA AGREGADA A JIRA:`);
            console.log(`   Issue: ${payload.issue.key}`);
            console.log(`   Respuesta: ${response.response.substring(0, 100)}...`);
            console.log(`   Estadísticas: ${this.webhookStats.successfulResponses} respuestas exitosas`);
          } catch (jiraError) {
            console.error('❌ Error adding AI response to Jira:', jiraError);
            // No fallar el webhook si no se puede agregar el comentario
          }
        }
        
        res.json(response);
      } else if (payload.webhookEvent === 'jira:issue_created') {
        // Procesar evento de creación de ticket
        console.log(`🎫 NUEVO TICKET CREADO:`);
        console.log(`   Issue: ${payload.issue.key}`);
        console.log(`   Summary: ${payload.issue.fields.summary}`);
        console.log(`   Status: ${payload.issue.fields.status.name}`);
        console.log(`   Creator: ${payload.issue.fields.creator?.displayName || 'N/A'}`);
        console.log(`   Labels: ${payload.issue.fields.labels?.join(', ') || 'Ninguno'}`);
        
        // Verificar si es un ticket de contacto web
        const isWebContact = payload.issue.fields.labels?.includes('contacto-web') || 
                           payload.issue.fields.labels?.includes('lead') ||
                           payload.issue.fields.summary?.toLowerCase().includes('web contact');
        
        if (isWebContact) {
          console.log(`🌐 TICKET DE CONTACTO WEB DETECTADO`);
          
          try {
            // Importar JiraService dinámicamente
            const { JiraService } = await import('../services/jira_service');
            const jiraService = JiraService.getInstance();
            
            console.log(`✅ TICKET DE CONTACTO WEB CREADO SIN MENSAJE DE BIENVENIDA:`);
            console.log(`   Issue: ${payload.issue.key}`);
            
          } catch (jiraError) {
            console.error('❌ Error adding welcome message to Jira:', jiraError);
          }
        }
        
        res.json({ 
          success: true, 
          message: 'Ticket creation processed', 
          ticketKey: payload.issue.key,
          isWebContact: isWebContact
        });
        
      } else {
        console.log(`ℹ️  Evento ignorado: ${payload.webhookEvent}`);
        res.json({ success: true, message: 'Event processed but no action taken' });
      }
    } catch (error) {
      this.webhookStats.errors++;
      console.error('❌ ERROR PROCESANDO WEBHOOK:', error);
      console.log(`   Estadísticas: ${this.webhookStats.errors} errores de ${this.webhookStats.totalReceived} total`);
      
      // Log detallado del error
      if (error instanceof Error) {
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process webhook',
        timestamp: new Date().toISOString(),
        errorDetails: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async handleDirectChat(req: Request, res: Response): Promise<void> {
    try {
      const { message, threadId, context } = req.body;
      
      console.log('🔵 handleDirectChat called:', { message: message.substring(0, 50), threadId, context });
      
      if (!message) {
        res.status(400).json({ success: false, error: 'Message is required' });
        return;
      }

      const response = await this.openaiService.processDirectChat(message, threadId, context);
      console.log('🔵 handleDirectChat response:', { success: response.success, threadId: response.threadId });
      res.json(response);

    } catch (error) {
      console.error('Error handling chat message:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async handleChatWithInstructions(req: Request, res: Response): Promise<void> {
    try {
      const { 
        message, 
        threadId, 
        context,
        instructions,
        userRole,
        projectInfo,
        specificInstructions 
      } = req.body;
      
      if (!message) {
        res.status(400).json({ 
          success: false, 
          error: 'Message is required' 
        });
        return;
      }

      // Construir contexto enriquecido
      const enrichedContext = {
        ...context,
        userRole,
        projectInfo,
        specificInstructions
      };

      console.log('Chat with instructions request received:', { 
        message, 
        threadId, 
        context: enrichedContext,
        instructions 
      });
      
      const result = await this.openaiService.processDirectChat(message, threadId, enrichedContext);
      
      res.json(result);
    } catch (error) {
      console.error('Error in chat with instructions endpoint:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  }

  async handleJiraChat(req: Request, res: Response): Promise<void> {
    try {
      const { 
        message, 
        issueKey, 
        userInfo,
        context 
      } = req.body;
      
      if (!message) {
        res.status(400).json({ 
          success: false, 
          error: 'Message is required' 
        });
        return;
      }

      console.log('Jira chat request received:', { 
        message, 
        issueKey, 
        userInfo,
        context 
      });
      
      const result = await this.openaiService.processJiraChatMessage(message, issueKey, userInfo);
      
      res.json(result);
    } catch (error) {
      console.error('Error in Jira chat endpoint:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  }

  async getThreadHistory(req: Request, res: Response): Promise<void> {
    try {
      const { threadId } = req.params;
      
      const result = await this.openaiService.getThreadHistory(threadId);
      res.json(result);
    } catch (error) {
      console.error('Error getting thread history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get thread history'
      });
    }
  }

  async listActiveThreads(req: Request, res: Response): Promise<void> {
    try {
      const threads = this.openaiService.getActiveThreads();

      res.json({
        success: true,
        threads,
        count: threads.length
      });
    } catch (error) {
      console.error('Error listing threads:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list threads'
      });
    }
  }

  // Endpoint para monitorear estadísticas de webhooks
  async getWebhookStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = this.getWebhookStatsData();
      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting webhook stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get webhook stats'
      });
    }
  }

  // Endpoint para resetear estadísticas de webhooks
  async resetWebhookStats(req: Request, res: Response): Promise<void> {
    try {
      this.resetWebhookStatsData();
      res.json({
        success: true,
        message: 'Webhook stats reset successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error resetting webhook stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset webhook stats'
      });
    }
  }

  // Endpoint para obtener reporte de conversación
  async getConversationReport(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;
      
      if (!issueKey) {
        res.status(400).json({
          success: false,
          error: 'Issue key is required'
        });
        return;
      }

      console.log(`📊 Generating conversation report for issue: ${issueKey}`);
      
      // Obtener historial de conversación
      const conversationHistory = this.conversationHistory.get(issueKey) || [];
      
      if (conversationHistory.length === 0) {
        res.json({
          success: true,
          data: {
            issueKey,
            report: 'No conversation history found for this issue.',
            messageCount: 0,
            participants: [],
            summary: 'No conversation to summarize.'
          }
        });
        return;
      }

      // Generar reporte usando el asistente
      const reportPrompt = `Analiza la siguiente conversación y genera un reporte detallado:

CONVERSACIÓN:
${conversationHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}

Por favor, genera un reporte que incluya:
1. Resumen de la conversación
2. Temas principales discutidos
3. Problemas identificados
4. Soluciones propuestas
5. Estado actual de la conversación
6. Recomendaciones para el agente de soporte

Formato el reporte de manera clara y profesional.`;

      // Usar el asistente para generar el reporte
      const reportResponse = await this.openaiService.processChatForService(
        reportPrompt,
        'chat-general',
        `report_${issueKey}_${Date.now()}`,
        { isReportGeneration: true, originalIssueKey: issueKey }
      );

      if (reportResponse.success) {
        // Extraer participantes únicos
        const participants = [...new Set(conversationHistory.map(msg => msg.role))];
        
        res.json({
          success: true,
          data: {
            issueKey,
            report: reportResponse.response,
            messageCount: conversationHistory.length,
            participants,
            conversationHistory: conversationHistory.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp
            })),
            generatedAt: new Date().toISOString()
          }
        });
      } else {
        throw new Error('Failed to generate report with AI');
      }

    } catch (error) {
      console.error('Error generating conversation report:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      });
    }
  }

  // Email functionality commented out for testing
  /*
  async sendEmailWithChatContext(req: Request, res: Response): Promise<void> {
    try {
      const { threadId, emailRequest } = req.body;
      
      if (!threadId || !emailRequest) {
        res.status(400).json({
          success: false,
          error: 'Missing threadId or emailRequest'
        });
        return;
      }

      // Obtener contexto del chat
      const threadHistory = await this.openaiService.getThreadHistory(threadId);
      
      if (!threadHistory.success) {
        res.status(400).json({
          success: false,
          error: 'Could not retrieve thread history'
        });
        return;
      }

      const chatContext = threadHistory.messages
        ?.map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n') || '';

      // Mejorar email con contexto del chat
      const enhancedEmailRequest = {
        ...emailRequest,
        template: emailRequest.template || 'chat_summary',
        templateData: {
          ...emailRequest.templateData,
          chatContext,
          threadId
        }
      };

      const result = await this.emailService.sendEmail(enhancedEmailRequest);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Error sending email with chat context:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  */

  // Endpoint para listar asistentes disponibles
  async listAssistants(req: Request, res: Response): Promise<void> {
    try {
      console.log('📋 Solicitando lista de asistentes...');
      
      const assistants = await this.openaiService.listAssistants();
      
      res.json({
        success: true,
        assistants,
        count: assistants.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error al listar asistentes:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al listar asistentes'
      });
    }
  }

  // Endpoint para cambiar el asistente activo
  async setActiveAssistant(req: Request, res: Response): Promise<void> {
    try {
      const { assistantId } = req.body;
      
      if (!assistantId) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el ID del asistente'
        });
        return;
      }

      console.log(`🔄 Cambiando asistente activo a: ${assistantId}`);
      
      this.openaiService.setActiveAssistant(assistantId);
      
      res.json({
        success: true,
        message: 'Asistente activo cambiado exitosamente',
        activeAssistant: assistantId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error al cambiar asistente activo:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al cambiar asistente'
      });
    }
  }

  // Endpoint para obtener el asistente activo actual
  async getActiveAssistant(req: Request, res: Response): Promise<void> {
    try {
      const activeAssistant = this.openaiService.getActiveAssistant();
      
      res.json({
        success: true,
        activeAssistant,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error al obtener asistente activo:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al obtener asistente activo'
      });
    }
  }

  // Endpoint para chat específico por servicio
  async handleServiceChat(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId } = req.params;
      const { message, threadId } = req.body;

      console.log('🟢 handleServiceChat called:', { serviceId, message: message?.substring(0, 50), threadId });

      if (!message) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el mensaje'
        });
        return;
      }

      console.log(`💬 Chat para servicio ${serviceId}: ${message}`);
      
      const result = await this.openaiService.processChatForService(message, serviceId, threadId);
      console.log('🟢 handleServiceChat response:', { success: result.success, threadId: result.threadId, assistantId: result.assistantId });
      
      if (result.success) {
        res.json({
          success: true,
          response: result.response,
          threadId: result.threadId,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Error en chat por servicio:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en chat por servicio'
      });
    }
  }
}