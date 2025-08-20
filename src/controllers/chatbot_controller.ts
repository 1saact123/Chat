import { Request, Response } from 'express';
import { OpenAIService } from '../services/openAI_service';
import { EmailService } from '../services/email_service';
import { JiraWebhookPayload } from '../types';

export class ChatbotController {
  private processedComments = new Set<string>();

  constructor(
    private openaiService: OpenAIService,
    private emailService: EmailService | null
  ) {}

  async handleJiraWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload: JiraWebhookPayload = req.body;
      
      console.log(`Received Jira webhook: ${payload.webhookEvent} for issue ${payload.issue.key}`);
      
      // Solo procesar eventos de comentarios
      if (payload.webhookEvent === 'comment_created' && payload.comment) {
        // Crear un ID único para este comentario
        const commentId = `${payload.issue.key}_${payload.comment.id}_${payload.comment.created}`;
        
        // Verificar si ya procesamos este comentario
        if (this.processedComments.has(commentId)) {
          console.log(`Comment already processed: ${commentId}`);
          res.json({ success: true, message: 'Comment already processed' });
          return;
        }
        
        // Marcar como procesado
        this.processedComments.add(commentId);
        
        // Limpiar comentarios antiguos (mantener solo los últimos 100)
        if (this.processedComments.size > 100) {
          const commentsArray = Array.from(this.processedComments);
          this.processedComments.clear();
          commentsArray.slice(-50).forEach(id => this.processedComments.add(id));
        }
        
        // Verificar que no sea un comentario de la IA
        if (payload.comment.author.displayName.toLowerCase().includes('ai') || 
            payload.comment.author.displayName.toLowerCase().includes('assistant') ||
            payload.comment.body.toLowerCase().includes('ai response')) {
          console.log(`Skipping AI comment: ${commentId}`);
          res.json({ success: true, message: 'Skipped AI comment' });
          return;
        }
        
        const response = await this.openaiService.processJiraComment(payload);
        
        // Si la IA respondió exitosamente, agregar el comentario a Jira
        if (response.success && response.response) {
          try {
            // Importar JiraService dinámicamente para evitar dependencias circulares
            const { JiraService } = await import('../services/jira_service');
            const jiraService = new JiraService();
            
            // Agregar comentario de la IA a Jira
            await jiraService.addCommentToIssue(payload.issue.key, response.response);
            console.log(`AI response added as comment to ${payload.issue.key}`);
          } catch (jiraError) {
            console.error('Error adding AI response to Jira:', jiraError);
            // No fallar el webhook si no se puede agregar el comentario
          }
        }
        
        res.json(response);
      } else {
        res.json({ success: true, message: 'Event processed but no action taken' });
      }
    } catch (error) {
      console.error('Error processing Jira webhook:', error);
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