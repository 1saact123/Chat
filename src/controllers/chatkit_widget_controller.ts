import { Request, Response } from 'express';
import { ChatKitJiraService } from '../services/chatkit_jira_service';

export class ChatKitWidgetController {
  private chatkitJiraService: ChatKitJiraService;

  constructor() {
    this.chatkitJiraService = new ChatKitJiraService();
  }

  /**
   * Conectar widget a ticket de Jira
   */
  async connectToTicket(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.body;

      if (!issueKey) {
        res.status(400).json({
          success: false,
          error: 'issueKey es requerido'
        });
        return;
      }

      console.log(`🔗 Widget conectándose al ticket ${issueKey}`);

      // Crear sesión de ChatKit para el ticket
      const session = await this.chatkitJiraService.createSessionForTicket(issueKey);

      res.json({
        success: true,
        message: `Widget conectado al ticket ${issueKey}`,
        sessionId: session.id,
        issueKey
      });

    } catch (error) {
      console.error('Error conectando widget al ticket:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Enviar mensaje del widget usando ChatKit
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey, message, customerInfo } = req.body;

      if (!issueKey || !message || !customerInfo) {
        res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: issueKey, message, y customerInfo'
        });
        return;
      }

      console.log(`📤 Widget enviando mensaje a ticket ${issueKey}: ${message}`);

      // Procesar mensaje usando ChatKit
      const result = await this.chatkitJiraService.processWidgetMessage(
        issueKey, 
        message, 
        customerInfo
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
      console.error('Error enviando mensaje del widget:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Procesar comentario de Jira usando ChatKit
   */
  async processJiraComment(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey, comment, authorInfo } = req.body;

      if (!issueKey || !comment) {
        res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: issueKey y comment'
        });
        return;
      }

      console.log(`📥 Procesando comentario de Jira para ${issueKey}: ${comment}`);

      // Procesar comentario usando ChatKit
      const result = await this.chatkitJiraService.processJiraComment(
        issueKey, 
        comment, 
        authorInfo
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Comentario procesado exitosamente',
          sessionId: result.sessionId,
          issueKey
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Error procesando comentario'
        });
      }

    } catch (error) {
      console.error('Error procesando comentario de Jira:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estado de la sesión
   */
  async getSessionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;

      if (!issueKey) {
        res.status(400).json({
          success: false,
          error: 'issueKey es requerido'
        });
        return;
      }

      // Verificar si hay sesión activa
      const hasActiveSession = this.chatkitJiraService.hasActiveSession(issueKey);

      res.json({
        success: true,
        hasActiveSession,
        issueKey
      });

    } catch (error) {
      console.error('Error obteniendo estado de sesión:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}

