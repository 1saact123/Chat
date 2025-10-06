import { Request, Response } from 'express';
import { OpenAIService } from '../services/openAI_service';
import { EmailService } from '../services/email_service';
import { DatabaseService } from '../services/database_service';
import { ConfigurationService } from '../services/configuration_service';
import { WebhookService } from '../services/webhook_service';
import { JiraWebhookPayload } from '../types';

export class ChatbotController {
  private processedComments = new Set<string>();
  private lastResponseTime = new Map<string, number>(); // Para throttling por issue
  private conversationHistory = new Map<string, Array<{role: string, content: string, timestamp: Date}>>(); // Historial por issue
  private dbService: DatabaseService;
  private webhookStats = {
    totalReceived: 0,
    duplicatesSkipped: 0,
    aiCommentsSkipped: 0,
    successfulResponses: 0,
    errors: 0,
    throttledRequests: 0,
    lastReset: new Date()
  };
  private io: any = null; // Referencia al WebSocket server

  constructor(
    private openaiService: OpenAIService,
    private emailService: EmailService | null
  ) {
    this.dbService = DatabaseService.getInstance();
  }

  // Método para establecer la referencia del WebSocket
  setWebSocketServer(io: any): void {
    this.io = io;
  }

  // Obtener referencia del WebSocket global
  private getWebSocketServer(): any {
    if (this.io) return this.io;
    return (global as any).webSocketServer;
  }

  // Método privado para obtener estadísticas de webhooks
  private getWebhookStatsData() {
    return {
      ...this.webhookStats,
      processedCommentsCount: this.processedComments.size,
      uptime: Date.now() - this.webhookStats.lastReset.getTime()
    };
  }

  // Actualizar estadísticas de webhook en base de datos
  private async updateWebhookStats(success: boolean): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Obtener estadísticas actuales del día
      const existingStats = await this.dbService.getWebhookStats(today);
      
      const totalWebhooks = (existingStats?.totalWebhooks || 0) + 1;
      const successfulResponses = (existingStats?.successfulResponses || 0) + (success ? 1 : 0);
      const failedResponses = (existingStats?.failedResponses || 0) + (success ? 0 : 1);
      
      // Actualizar en base de datos
      await this.dbService.updateWebhookStats(today, totalWebhooks, successfulResponses, failedResponses);
      
      console.log(`📊 Webhook stats actualizadas: ${totalWebhooks} total, ${successfulResponses} exitosos, ${failedResponses} fallidos`);
    } catch (error) {
      console.error('❌ Error actualizando webhook stats:', error);
    }
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
    const authorEmail = comment.author.emailAddress?.toLowerCase() || '';
    const commentBody = comment.body.toLowerCase();
    const authorDisplayName = comment.author.displayName?.toLowerCase() || '';

    // Check if comment is from AI account (JIRA_EMAIL)
    const aiEmail = process.env.JIRA_EMAIL?.toLowerCase() || '';
    const isFromAIAccount = authorEmail === aiEmail;
    
    // Check by display name for AI assistant (more reliable)
    const isFromAIDisplayName = authorDisplayName.includes('ai assistant') ||
                                authorDisplayName.includes('contact service account') ||
                                authorDisplayName.includes('contact service');
    
    // Patrones en el contenido que indican comentarios de IA
    const aiContentPatterns = [
      'complete.', 'how can i assist you',
      '🎯 **chat session started**', 'chat widget connected',
      'as an atlassian solution partner', 'offers integration services',
      'estoy aquí para ayudarte', '¿sobre qué tema te gustaría saber',
      'basada en los documentos disponibles'
    ];
    
    // Detectar por contenido
    const isAIContent = aiContentPatterns.some(pattern => 
      commentBody.includes(pattern)
    );
    
    return isFromAIAccount || isFromAIDisplayName || isAIContent;
  }

  // Método para detectar comentarios del widget
  private isWidgetComment(comment: any): boolean {
    const authorEmail = comment.author.emailAddress?.toLowerCase() || '';
    const authorDisplayName = comment.author.displayName?.toLowerCase() || '';
    
    // Check if comment is from widget account (JIRA_WIDGET)
    const widgetEmail = process.env.JIRA_WIDGET?.toLowerCase() || '';
    const isFromWidgetAccount = authorEmail === widgetEmail;
    
    // Check if display name indicates widget (be more specific)
    const isWidgetDisplayName = authorDisplayName.includes('widget') || 
                               authorDisplayName.includes('chat widget') ||
                               authorDisplayName.includes('system');
    
    return isFromWidgetAccount || isWidgetDisplayName;
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
      
      // Procesar eventos de comentarios, creación de tickets y cambios de estado
      if (payload.webhookEvent === 'comment_created' && payload.comment) {
        // Obtener el issueKey al inicio
        const issueKey = payload.issue.key;
        
        // Verificar que el ticket pertenece al proyecto activo
        const { JiraService } = await import('../services/jira_service');
        const jiraService = JiraService.getInstance();
        const activeProject = jiraService.getActiveProject();
        
        console.log(`🔍 DEBUG - Validación de proyecto:`);
        console.log(`   IssueKey: ${issueKey}`);
        console.log(`   Proyecto activo: ${activeProject || 'NO CONFIGURADO'}`);
        
        if (activeProject) {
          // Extraer el prefijo del proyecto del issueKey (ej: TI-123 -> TI)
          const issueProjectKey = issueKey.split('-')[0];
          console.log(`   Proyecto del ticket: ${issueProjectKey}`);
          
          if (issueProjectKey !== activeProject) {
            console.log(`🚫 TICKET IGNORADO: ${issueKey} no pertenece al proyecto activo ${activeProject}`);
            console.log(`   Proyecto del ticket: ${issueProjectKey}`);
            console.log(`   Proyecto activo: ${activeProject}`);
            res.json({ 
              success: true, 
              message: `Ticket ${issueKey} ignored - not from active project ${activeProject}`,
              ignored: true,
              reason: 'wrong_project'
            });
            return;
          } else {
            console.log(`✅ TICKET ACEPTADO: ${issueKey} pertenece al proyecto activo ${activeProject}`);
          }
        } else {
          console.log(`⚠️  ADVERTENCIA: No hay proyecto activo configurado, procesando todos los tickets`);
        }
        
        // Crear un ID único para este comentario (más robusto)
        const commentId = `${issueKey}_${payload.comment.id}_${payload.comment.created}_${payload.comment.author.accountId}`;
        
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
        console.log(`🔍 DEBUG - Verificando si es comentario de IA...`);
        if (this.isAIComment(payload.comment)) {
          this.webhookStats.aiCommentsSkipped++;
          console.log(`🤖 COMENTARIO DE IA DETECTADO:`);
          console.log(`   Autor: ${payload.comment.author.displayName}`);
          console.log(`   Email: ${payload.comment.author.emailAddress || 'N/A'}`);
          console.log(`   Account ID: ${payload.comment.author.accountId}`);
          console.log(`   Contenido: ${payload.comment.body.substring(0, 150)}...`);
          console.log(`   Estadísticas: ${this.webhookStats.aiCommentsSkipped} comentarios de IA saltados`);
          
          // 🔌 ENVIAR COMENTARIO DE IA VIA WEBSOCKET
          const webSocketServer = this.getWebSocketServer();
          if (webSocketServer) {
            console.log(`📡 Enviando comentario de IA via WebSocket al ticket ${issueKey}...`);
            webSocketServer.to(`ticket_${issueKey}`).emit('jira-comment', {
              message: payload.comment.body,
              author: payload.comment.author.displayName,
              timestamp: payload.comment.created,
              source: 'jira-ai',
              issueKey: issueKey,
              isAI: true
            });
            console.log(`✅ Comentario de IA enviado via WebSocket al ticket ${issueKey}`);
          }
          
          res.json({ success: true, message: 'Skipped AI comment', aiComment: true });
          return;
        }
        
        // Verificar que no sea un comentario del widget (para evitar duplicación)
        console.log(`🔍 DEBUG - Verificando si es comentario del widget...`);
        if (this.isWidgetComment(payload.comment)) {
          this.webhookStats.aiCommentsSkipped++;
          console.log(`📱 COMENTARIO DEL WIDGET DETECTADO:`);
          console.log(`   Autor: ${payload.comment.author.displayName}`);
          console.log(`   Email: ${payload.comment.author.emailAddress || 'N/A'}`);
          console.log(`   Account ID: ${payload.comment.author.accountId}`);
          console.log(`   Contenido: ${payload.comment.body.substring(0, 150)}...`);
          console.log(`   Estadísticas: ${this.webhookStats.aiCommentsSkipped} comentarios del widget saltados`);
          res.json({ success: true, message: 'Skipped widget comment', widgetComment: true });
          return;
        }
        
        // Sistema de throttling para evitar respuestas muy rápidas
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
        console.log(`🔍 DEBUG - Autor: ${payload.comment.author.displayName}`);
        console.log(`🔍 DEBUG - Email: ${payload.comment.author.emailAddress}`);
        console.log(`🔍 DEBUG - Account ID: ${payload.comment.author.accountId}`);
        console.log(`🔍 DEBUG - Contenido: ${payload.comment.body.substring(0, 100)}...`);
        
        // 🔌 ENVIAR COMENTARIO DE AGENTE VIA WEBSOCKET (ANTES DE CUALQUIER VERIFICACIÓN)
        const webSocketServer = this.getWebSocketServer();
        if (webSocketServer) {
          console.log(`📡 Enviando comentario de agente via WebSocket al ticket ${issueKey}...`);
          webSocketServer.to(`ticket_${issueKey}`).emit('jira-comment', {
            message: payload.comment.body,
            author: payload.comment.author.displayName,
            timestamp: payload.comment.created,
            source: 'jira-agent',
            issueKey: issueKey,
            isAI: false
          });
          console.log(`✅ Comentario de agente enviado via WebSocket al ticket ${issueKey}`);
        }
        
        // Verificar si el asistente está desactivado para este ticket
        const configService = ConfigurationService.getInstance();
        if (configService.isTicketDisabled(issueKey)) {
          const ticketInfo = configService.getDisabledTicketInfo(issueKey);
          console.log(`🚫 ASISTENTE DESACTIVADO PARA TICKET ${issueKey}:`);
          console.log(`   Razón: ${ticketInfo?.reason || 'No reason provided'}`);
          console.log(`   Desactivado: ${ticketInfo?.disabledAt || 'Unknown'}`);
          res.json({ 
            success: true, 
            message: 'AI Assistant disabled for this ticket', 
            disabled: true,
            reason: ticketInfo?.reason
          });
          return;
        }
        
        // Agregar el comentario del usuario al historial
        this.addToConversationHistory(issueKey, 'user', payload.comment.body);
        console.log(`📝 Comentario agregado al historial para ${issueKey}`);
        
        // Obtener historial de conversación para contexto
        const conversationHistory = this.conversationHistory.get(issueKey) || [];
        console.log(`📋 Historial de conversación obtenido: ${conversationHistory.length} mensajes`);
        
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
        
        console.log(`🔧 Contexto enriquecido creado para ${issueKey}`);
        console.log(`📤 Llamando a processChatForService con mensaje: "${payload.comment.body}"`);
        
        // Obtener el asistente configurado para landing-page
        const landingPageConfig = configService.getServiceConfiguration('landing-page');
        console.log(`🔍 Landing Page Configuration:`, {
          serviceId: 'landing-page',
          assistantId: landingPageConfig?.assistantId,
          assistantName: landingPageConfig?.assistantName,
          isActive: landingPageConfig?.isActive,
          lastUpdated: landingPageConfig?.lastUpdated
        });
        
        // Usar el mismo asistente que el widget (landing-page) para mantener consistencia
        const response = await this.openaiService.processChatForService(
          payload.comment.body, 
          'landing-page', 
          `widget_${issueKey}`, // Usar el mismo thread que el widget
          enrichedContext
        );
        
        console.log(`🤖 RESPUESTA DEL FLUJO PRINCIPAL RECIBIDA:`, {
          success: response.success,
          hasResponse: !!response.response,
          assistantId: response.assistantId,
          assistantName: response.assistantName,
          serviceUsed: 'landing-page',
          threadId: `widget_${issueKey}`,
          responsePreview: response.response ? response.response.substring(0, 100) + '...' : 'No response',
          error: response.error
        });
        
        // Actualizar tiempo de última respuesta
        this.lastResponseTime.set(issueKey, nowTimestamp);
        
        // Actualizar estadísticas en base de datos
        await this.updateWebhookStats(true);
        
        // Si la IA respondió exitosamente, procesar normalmente
        if (response.success && response.response) {
          console.log(`✅ Respuesta exitosa recibida, procesando...`);
          
          try {
            // Importar JiraService dinámicamente para evitar dependencias circulares
            const { JiraService } = await import('../services/jira_service');
            const jiraService = JiraService.getInstance();
            
            console.log(`📤 Agregando comentario a Jira: "${response.response.substring(0, 50)}..."`);
            
            // Agregar comentario de la IA a Jira
            const jiraResponse = await jiraService.addCommentToIssue(payload.issue.key, response.response);
            this.webhookStats.successfulResponses++;
            
            console.log(`✅ Comentario agregado exitosamente a Jira`);
            
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
            
            // 🔌 RESPUESTA DE IA PROCESADA - SE ENVIARÁ VIA WEBHOOK DE JIRA
            console.log(`✅ Respuesta de IA procesada, se enviará via webhook de Jira`);
          } catch (jiraError) {
            console.error('❌ Error adding AI response to Jira:', jiraError);
            // No fallar el webhook si no se puede agregar el comentario
          }

          // 🚀 FLUJO PARALELO: ENVIAR DATOS AL WEBHOOK CONFIGURADO
          this.sendToWebhookInParallel(issueKey, payload.comment.body, payload.comment.author.displayName, payload.comment.created, response, enrichedContext);
        } else {
          console.log(`❌ Respuesta fallida o vacía:`, {
            success: response.success,
            hasResponse: !!response.response,
            error: response.error
          });
        }
        
        res.json(response);
      } else if (payload.webhookEvent === 'jira:issue_updated' && payload.changelog) {
        // Procesar cambios de estado
        await this.handleStatusChange(payload);
        res.json({ 
          success: true, 
          message: 'Status change processed'
        });
      } else if (payload.webhookEvent === 'jira:issue_created') {
        // Procesar evento de creación de ticket
        const issueKey = payload.issue.key;
        
        // Verificar que el ticket pertenece al proyecto activo
        const { JiraService } = await import('../services/jira_service');
        const jiraService = JiraService.getInstance();
        const activeProject = jiraService.getActiveProject();
        
        if (activeProject) {
          // Extraer el prefijo del proyecto del issueKey (ej: TI-123 -> TI)
          const issueProjectKey = issueKey.split('-')[0];
          
          if (issueProjectKey !== activeProject) {
            console.log(`🚫 TICKET CREADO IGNORADO: ${issueKey} no pertenece al proyecto activo ${activeProject}`);
            console.log(`   Proyecto del ticket: ${issueProjectKey}`);
            console.log(`   Proyecto activo: ${activeProject}`);
            res.json({ 
              success: true, 
              message: `Ticket ${issueKey} creation ignored - not from active project ${activeProject}`,
              ignored: true,
              reason: 'wrong_project'
            });
            return;
          }
        }
        
        console.log(`🎫 NUEVO TICKET CREADO:`);
        console.log(`   Issue: ${issueKey}`);
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
      
      console.log('🟢 handleServiceChat RESPUESTA COMPLETA:', { 
        success: result.success, 
        serviceId: serviceId,
        threadId: result.threadId, 
        assistantId: result.assistantId,
        assistantName: result.assistantName,
        responsePreview: result.response ? result.response.substring(0, 100) + '...' : 'No response',
        error: result.error
      });
      
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

  // 🚀 MÉTODO PARA ENVIAR DATOS AL WEBHOOK EN PARALELO
  private async sendToWebhookInParallel(
    issueKey: string, 
    originalMessage: string, 
    author: string, 
    timestamp: string, 
    aiResponse: any, 
    context: any
  ): Promise<void> {
    try {
      console.log(`🚀 Iniciando flujo paralelo de webhook para ${issueKey}...`);
      
      // Verificar si el webhook está configurado y habilitado
      const configService = ConfigurationService.getInstance();
      if (!configService.isWebhookEnabled() || !configService.getWebhookUrl()) {
        console.log(`⚠️ Webhook no configurado o deshabilitado, saltando envío paralelo`);
        return;
      }

      // El filtro se aplicará después de generar la respuesta del asistente paralelo

      // Crear thread separado para el webhook (usando asistente diferente si está configurado)
      const webhookThreadId = `webhook_${issueKey}_${Date.now()}`;
      
      // Obtener asistentes para ambos servicios
      const landingAssistantId = configService.getActiveAssistantForService('landing-page');
      const webhookAssistantId = configService.getActiveAssistantForService('webhook-parallel');
      
      console.log(`🧵 Thread separado para webhook: ${webhookThreadId}`);
      console.log(`🔍 Asistente landing-page: ${landingAssistantId || 'NO CONFIGURADO'}`);
      console.log(`🔍 Asistente webhook-parallel: ${webhookAssistantId || 'NO CONFIGURADO'}`);
      console.log(`🔍 Servicio webhook-parallel activo: ${configService.isServiceActive('webhook-parallel')}`);
      
      // Si no hay asistente específico para webhook, usar el de landing-page
      const finalWebhookAssistantId = webhookAssistantId || landingAssistantId;
      console.log(`🤖 Asistente final para webhook: ${finalWebhookAssistantId || 'default'}`);

      // Crear contexto específico para el webhook SIN historial compartido
      const webhookContext = {
        jiraIssueKey: issueKey,
        issueSummary: context.issueSummary,
        issueStatus: context.issueStatus,
        authorName: context.authorName,
        isJiraComment: true,
        conversationType: 'webhook-parallel',
        isWebhookFlow: true,
        originalIssueKey: issueKey,
        webhookThreadId: webhookThreadId,
        source: 'webhook-parallel',
        // NO incluir conversationHistory para evitar interferencia
        conversationHistory: [], // Historial vacío para webhook
        previousResponses: [] // Sin respuestas previas
      };

      // Procesar con asistente separado (si está configurado) o usar el mismo
      const webhookService = WebhookService.getInstance();
      
      if (finalWebhookAssistantId && finalWebhookAssistantId !== landingAssistantId) {
        // Usar asistente diferente para webhook
        console.log(`🔄 Procesando con asistente diferente para webhook...`);
        console.log(`🔍 Asistente principal: ${landingAssistantId}`);
        console.log(`🔍 Asistente webhook: ${finalWebhookAssistantId}`);
        console.log(`🔍 Thread principal: widget_${issueKey}`);
        console.log(`🔍 Thread webhook: ${webhookThreadId}`);
        
        const webhookResponse = await this.openaiService.processChatForService(
          originalMessage,
          'webhook-parallel', // Servicio específico para webhook
          webhookThreadId,
          webhookContext
        );

        if (webhookResponse.success && webhookResponse.response) {
          console.log(`🎯 RESPUESTA DEL FLUJO PARALELO (WEBHOOK) GENERADA:`, {
            success: webhookResponse.success,
            assistantId: webhookResponse.assistantId,
            assistantName: webhookResponse.assistantName,
            serviceUsed: 'webhook-parallel',
            threadId: webhookThreadId,
            responsePreview: webhookResponse.response.substring(0, 100) + '...',
            responseLength: webhookResponse.response.length
          });
          
          // Verificar filtro del webhook con la respuesta del asistente paralelo
          console.log(`🔍 === WEBHOOK FILTER CHECK IN PARALLEL FLOW ===`);
          console.log(`📝 Parallel AI Response for filter check:`, webhookResponse.response);
          const shouldSend = configService.shouldSendWebhook(webhookResponse.response);
          console.log(`🔍 Should send webhook:`, shouldSend);
          
          if (!shouldSend) {
            console.log(`🚫 Webhook filtrado: respuesta no cumple con los criterios del filtro`);
            console.log(`🔍 === WEBHOOK FILTER CHECK END (FILTERED) ===`);
            return;
          }
          console.log(`✅ Webhook filter passed, proceeding with webhook send`);
          console.log(`🔍 === WEBHOOK FILTER CHECK END (PASSED) ===`);
          
          // Enviar datos al webhook
          await webhookService.sendAIResponseToWebhook(
            issueKey,
            originalMessage,
            webhookResponse.response,
            webhookThreadId,
            webhookResponse.assistantId || finalWebhookAssistantId || 'default',
            webhookResponse.assistantName || 'Webhook Assistant',
            webhookContext
          );
        }
      } else {
        // Usar la misma respuesta de IA pero enviar al webhook
        console.log(`📡 REUTILIZANDO RESPUESTA DEL FLUJO PRINCIPAL PARA WEBHOOK:`, {
          reason: 'Mismo asistente para ambos flujos',
          assistantId: aiResponse.assistantId || finalWebhookAssistantId || 'default',
          assistantName: aiResponse.assistantName || 'AI Assistant',
          serviceUsed: 'landing-page (reutilizado)',
          threadId: webhookThreadId,
          responsePreview: aiResponse.response ? aiResponse.response.substring(0, 100) + '...' : 'No response'
        });
        
        // Verificar filtro del webhook con la respuesta reutilizada
        console.log(`🔍 === WEBHOOK FILTER CHECK IN PARALLEL FLOW (REUSED) ===`);
        console.log(`📝 Reused AI Response for filter check:`, aiResponse.response);
        const shouldSend = configService.shouldSendWebhook(aiResponse.response);
        console.log(`🔍 Should send webhook:`, shouldSend);
        
        if (!shouldSend) {
          console.log(`🚫 Webhook filtrado: respuesta no cumple con los criterios del filtro`);
          console.log(`🔍 === WEBHOOK FILTER CHECK END (FILTERED) ===`);
          return;
        }
        console.log(`✅ Webhook filter passed, proceeding with webhook send`);
        console.log(`🔍 === WEBHOOK FILTER CHECK END (PASSED) ===`);
        
        await webhookService.sendAIResponseToWebhook(
          issueKey,
          originalMessage,
          aiResponse.response,
          webhookThreadId,
          aiResponse.assistantId || finalWebhookAssistantId || 'default',
          aiResponse.assistantName || 'AI Assistant',
          webhookContext
        );
      }

      console.log(`✅ Flujo paralelo de webhook completado para ${issueKey}`);

    } catch (error) {
      console.error('❌ Error en flujo paralelo de webhook:', error);
      // No fallar el proceso principal si el webhook falla
    }
  }

  // 🔄 MÉTODO PARA MANEJAR CAMBIOS DE ESTADO
  private async handleStatusChange(payload: JiraWebhookPayload): Promise<void> {
    try {
      const issueKey = payload.issue.key;
      
      // Verificar que el ticket pertenece al proyecto activo
      const { JiraService } = await import('../services/jira_service');
      const jiraService = JiraService.getInstance();
      const activeProject = jiraService.getActiveProject();
      
      if (activeProject) {
        // Extraer el prefijo del proyecto del issueKey (ej: TI-123 -> TI)
        const issueProjectKey = issueKey.split('-')[0];
        
        if (issueProjectKey !== activeProject) {
          console.log(`🚫 CAMBIO DE ESTADO IGNORADO: ${issueKey} no pertenece al proyecto activo ${activeProject}`);
          console.log(`   Proyecto del ticket: ${issueProjectKey}`);
          console.log(`   Proyecto activo: ${activeProject}`);
          return;
        }
      }
      
      const configService = ConfigurationService.getInstance();
      
      console.log(`🔄 Procesando cambio de estado para ticket ${issueKey}`);
      
      // Buscar cambios de estado en el changelog
      if (payload.changelog && payload.changelog.items) {
        for (const item of payload.changelog.items) {
          if (item.field === 'status') {
            const oldStatus = item.fromString;
            const newStatus = item.toString;
            
            console.log(`📊 Cambio de estado detectado: ${oldStatus} → ${newStatus}`);
            
            // Verificar si debe deshabilitar/habilitar la IA
            const statusChanged = await configService.checkAndHandleStatusChange(issueKey, newStatus || '');
            
            if (statusChanged) {
              // Agregar comentario en Jira explicando el cambio
              const { JiraService } = await import('../services/jira_service');
              const jiraService = JiraService.getInstance();
              
              const isDisabled = configService.isTicketDisabled(issueKey);
              const commentText = isDisabled 
                ? `🤖 **AI Assistant Auto-Disabled**\n\nThe AI assistant has been automatically disabled because the ticket status changed to "${newStatus}".\n\nTo re-enable the assistant, change the status to a non-triggering state or use the CEO Dashboard.`
                : `🤖 **AI Assistant Auto-Enabled**\n\nThe AI assistant has been automatically re-enabled because the ticket status changed from a triggering state to "${newStatus}".`;
              
              await jiraService.addCommentToIssue(issueKey, commentText, {
                name: 'AI Status Manager',
                source: 'jira'
              });
              
              console.log(`✅ Comentario de cambio de estado agregado a ${issueKey}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error procesando cambio de estado:', error);
    }
  }
}