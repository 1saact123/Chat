import { Request, Response } from 'express';
import { ChatKitJiraService } from '../services/chatkit_jira_service';

interface JiraWebhookPayload {
  issue: {
    key: string;
    fields: {
      summary: string;
      status: {
        name: string;
      };
    };
  };
  comment: {
    body: string;
    author: {
      displayName: string;
      emailAddress: string;
    };
  };
  webhookEvent: string;
}

export class ChatKitWebhookController {
  private chatkitJiraService: ChatKitJiraService;

  constructor() {
    this.chatkitJiraService = new ChatKitJiraService();
  }

  /**
   * Manejar webhook de Jira usando ChatKit
   */
  async handleJiraWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload: JiraWebhookPayload = req.body;

      console.log(`📥 Webhook de Jira recibido: ${payload.webhookEvent}`);

      // Solo procesar comentarios nuevos
      if (payload.webhookEvent !== 'comment_created') {
        console.log(`⚠️ Evento no procesado: ${payload.webhookEvent}`);
        res.json({ success: true, message: 'Evento no procesado' });
        return;
      }

      const issueKey = payload.issue.key;
      const commentBody = payload.comment.body;
      const authorInfo = {
        displayName: payload.comment.author.displayName,
        email: payload.comment.author.emailAddress
      };

      console.log(`💬 Comentario de ${authorInfo.displayName} en ${issueKey}: ${commentBody}`);

      // Filtrar comentarios del widget (para evitar loops)
      if (this.isWidgetComment(commentBody, authorInfo)) {
        console.log(`🚫 Comentario del widget filtrado`);
        res.json({ success: true, message: 'Comentario del widget filtrado' });
        return;
      }

      // Filtrar comentarios de IA (para evitar loops)
      if (this.isAIComment(commentBody, authorInfo)) {
        console.log(`🚫 Comentario de IA filtrado`);
        res.json({ success: true, message: 'Comentario de IA filtrado' });
        return;
      }

      // Procesar comentario usando ChatKit
      const result = await this.chatkitJiraService.processJiraComment(
        issueKey,
        commentBody,
        authorInfo
      );

      if (result.success) {
        console.log(`✅ Comentario procesado exitosamente para ${issueKey}`);
        res.json({
          success: true,
          message: 'Comentario procesado exitosamente',
          sessionId: result.sessionId
        });
      } else {
        console.error(`❌ Error procesando comentario para ${issueKey}: ${result.error}`);
        res.status(500).json({
          success: false,
          error: result.error || 'Error procesando comentario'
        });
      }

    } catch (error) {
      console.error('Error procesando webhook de Jira:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verificar si es un comentario del widget
   */
  private isWidgetComment(commentBody: string, authorInfo: any): boolean {
    // Filtrar por autor del widget
    if (authorInfo.displayName === 'Chat User' || 
        authorInfo.email?.includes('widget') ||
        authorInfo.displayName?.includes('Widget')) {
      return true;
    }

    // Filtrar por contenido específico del widget
    if (commentBody.includes('[Widget]') || 
        commentBody.includes('Source: widget')) {
      return true;
    }

    return false;
  }

  /**
   * Verificar si es un comentario de IA
   */
  private isAIComment(commentBody: string, authorInfo: any): boolean {
    // Filtrar por autor de IA
    if (authorInfo.displayName === 'AI Assistant' || 
        authorInfo.email === 'ai@movonte.com' ||
        authorInfo.displayName?.includes('AI')) {
      return true;
    }

    // Filtrar por contenido específico de IA
    if (commentBody.includes('[AI Response]') || 
        commentBody.includes('Source: chatkit')) {
      return true;
    }

    return false;
  }

  /**
   * Procesar mensaje directo del chat
   */
  async processDirectChat(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey, message, userInfo } = req.body;

      if (!issueKey || !message) {
        res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: issueKey y message'
        });
        return;
      }

      console.log(`💬 Procesando chat directo para ${issueKey}: ${message}`);

      // Procesar mensaje usando ChatKit
      const result = await this.chatkitJiraService.processJiraComment(
        issueKey,
        message,
        userInfo
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Mensaje procesado exitosamente',
          sessionId: result.sessionId,
          issueKey
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Error procesando mensaje'
        });
      }

    } catch (error) {
      console.error('Error procesando chat directo:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

