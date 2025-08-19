import { Request, Response } from 'express';
import { OpenAIService } from '../services/openAI_service';
import { EmailService } from '../services/email_service';
import { JiraWebhookPayload } from '../types';

export class ChatbotController {
  constructor(
    private openaiService: OpenAIService,
    private emailService: EmailService
  ) {}

  async handleJiraWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload: JiraWebhookPayload = req.body;
      
      console.log(`Received Jira webhook: ${payload.webhookEvent} for issue ${payload.issue.key}`);
      
      // Solo procesar eventos de comentarios
      if (payload.webhookEvent === 'comment_created' && payload.comment) {
        const response = await this.openaiService.processJiraComment(payload);
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
}