import { Request, Response } from 'express';
import { OpenAIService } from '../services/openAI_service';
import { EmailService } from '../services/email_service';
import { JiraWebhookPayload } from '../types';

export class ChatbotController {
  private processedComments = new Set<string>();
  private lastResponseTime = new Map<string, number>(); // Para throttling por issue
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
    console.log('🔄 Webhook stats reset');
  }

  async handleJiraWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload: JiraWebhookPayload = req.body;
      this.webhookStats.totalReceived++;
      
      console.log(`\n📥 WEBHOOK RECIBIDO #${this.webhookStats.totalReceived}`);
      console.log(`   Evento: ${payload.webhookEvent}`);
      console.log(`   Issue: ${payload.issue.key}`);
      console.log(`   Usuario: ${payload.comment?.author?.displayName || 'N/A'}`);
      console.log(`   Timestamp: ${new Date().toISOString()}`);
      
      // Solo procesar eventos de comentarios
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
        const authorName = payload.comment.author.displayName.toLowerCase();
        const authorEmail = payload.comment.author.emailAddress?.toLowerCase() || '';
        const commentBody = payload.comment.body.toLowerCase();
        const authorAccountId = payload.comment.author.accountId;
        
        // Detectar por autor
        const isAIAuthor = authorName.includes('ai') || 
                          authorName.includes('assistant') || 
                          authorName.includes('bot') ||
                          authorName.includes('movonte') ||
                          authorName.includes('automation') ||
                          authorEmail.includes('bot') ||
                          authorEmail.includes('noreply') ||
                          authorEmail.includes('automation');
        
        // Detectar por contenido
        const isAIComment = commentBody.includes('ai response') || 
                           commentBody.includes('asistente') || 
                           commentBody.includes('automático') ||
                           commentBody.includes('soy un asistente') ||
                           commentBody.includes('como asistente') ||
                           commentBody.includes('movonte') ||
                           commentBody.includes('puedo ayudarte') ||
                           commentBody.includes('¿en qué puedo ayudarte?') ||
                           commentBody.includes('gracias por contactar') ||
                           commentBody.includes('respuesta automática');
        
        // Detectar por ID de cuenta específico (si sabemos cuál es)
        const knownBotAccountIds = [
          'bot-account-id', // Reemplazar con IDs reales si los conoces
          'automation-account-id'
        ];
        const isKnownBot = knownBotAccountIds.includes(authorAccountId);
        
        // Detectar comentarios muy recientes (posible loop)
        const commentCreated = new Date(payload.comment.created);
        const currentTime = new Date();
        const timeDiff = currentTime.getTime() - commentCreated.getTime();
        const isVeryRecent = timeDiff < 5000; // Menos de 5 segundos
        
        if (isAIAuthor || isAIComment || isKnownBot) {
          this.webhookStats.aiCommentsSkipped++;
          console.log(`🤖 COMENTARIO DE IA DETECTADO:`);
          console.log(`   Autor: ${payload.comment.author.displayName}`);
          console.log(`   Email: ${payload.comment.author.emailAddress || 'N/A'}`);
          console.log(`   Account ID: ${authorAccountId}`);
          console.log(`   Contenido: ${payload.comment.body.substring(0, 150)}...`);
          console.log(`   Razón: ${isAIAuthor ? 'Autor IA' : isAIComment ? 'Contenido IA' : 'Bot conocido'}`);
          console.log(`   Estadísticas: ${this.webhookStats.aiCommentsSkipped} comentarios de IA saltados`);
          res.json({ success: true, message: 'Skipped AI comment', aiComment: true });
          return;
        }
        
        // Advertencia si el comentario es muy reciente
        if (isVeryRecent) {
          console.log(`⚠️  ADVERTENCIA: Comentario muy reciente (${timeDiff}ms) - posible loop`);
        }
        
        // Sistema de throttling para evitar respuestas muy rápidas
        const issueKey = payload.issue.key;
        const nowTimestamp = Date.now();
        const lastResponse = this.lastResponseTime.get(issueKey) || 0;
        const timeSinceLastResponse = nowTimestamp - lastResponse;
        const THROTTLE_DELAY = 10000; // 10 segundos entre respuestas por issue
        
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
        const response = await this.openaiService.processJiraComment(payload);
        
        // Actualizar tiempo de última respuesta
        this.lastResponseTime.set(issueKey, nowTimestamp);
        
        // Si la IA respondió exitosamente, agregar el comentario a Jira
        if (response.success && response.response) {
          try {
            // Importar JiraService dinámicamente para evitar dependencias circulares
            const { JiraService } = await import('../services/jira_service');
            const jiraService = new JiraService();
            
            // Agregar comentario de la IA a Jira
            const jiraResponse = await jiraService.addCommentToIssue(payload.issue.key, response.response);
            this.webhookStats.successfulResponses++;
            
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
      } else {
        console.log(`ℹ️  Evento ignorado: ${payload.webhookEvent}`);
        res.json({ success: true, message: 'Event processed but no action taken' });
      }
    } catch (error) {
      this.webhookStats.errors++;
      console.error('❌ ERROR PROCESANDO WEBHOOK:', error);
      console.log(`   Estadísticas: ${this.webhookStats.errors} errores de ${this.webhookStats.totalReceived} total`);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process webhook' 
      });
    }
  }

  async handleDirectChat(req: Request, res: Response): Promise<void> {
    try {
      const { message, threadId, context } = req.body;
      
      if (!message) {
        res.status(400).json({ success: false, error: 'Message is required' });
        return;
      }

      const response = await this.openaiService.processDirectChat(message, threadId, context);
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
}