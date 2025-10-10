import { JiraService } from './jira_service';
import { ConfigurationService } from './configuration_service';

interface ChatKitSession {
  id: string;
  client_secret: string;
  expires_at: number;
}

interface ChatKitMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatKitResponse {
  success: boolean;
  message?: string;
  error?: string;
  sessionId?: string;
}

export class ChatKitJiraService {
  private jiraService: JiraService;
  private configService: ConfigurationService;
  private activeSessions: Map<string, ChatKitSession> = new Map();

  constructor() {
    this.jiraService = JiraService.getInstance();
    this.configService = ConfigurationService.getInstance();
  }

  /**
   * Crear sesión de ChatKit para un ticket específico
   */
  async createSessionForTicket(issueKey: string, userInfo?: any): Promise<ChatKitSession> {
    try {
      console.log(`🔄 Creando sesión de ChatKit para ticket ${issueKey}`);

      const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'chatkit_beta=v1',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflow: {
            id: process.env.OPENAI_CHATKIT_WORKFLOW_ID
          },
          user: `jira_${issueKey}`
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error creando sesión ChatKit: ${error}`);
      }

      const session = await response.json() as ChatKitSession;
      this.activeSessions.set(issueKey, session);
      
      console.log(`✅ Sesión ChatKit creada para ${issueKey}: ${session.id}`);
      return session;

    } catch (error) {
      console.error(`❌ Error creando sesión ChatKit para ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Procesar mensaje del widget usando ChatKit
   */
  async processWidgetMessage(issueKey: string, message: string, customerInfo: any): Promise<ChatKitResponse> {
    try {
      console.log(`📤 Procesando mensaje del widget para ${issueKey}: ${message}`);

      // 1. Verificar si el ticket está deshabilitado
      if (this.configService.isTicketDisabled(issueKey)) {
        const disabledInfo = this.configService.getDisabledTicketInfo(issueKey);
        console.log(`🚫 AI Assistant deshabilitado para ticket ${issueKey}`);
        
        // Solo agregar mensaje a Jira sin procesar con IA
        await this.jiraService.addCommentToIssue(issueKey, message, {
          name: customerInfo.name,
          email: customerInfo.email,
          source: 'widget'
        });

        return {
          success: true,
          message: 'Mensaje enviado a Jira, pero IA deshabilitada para este ticket',
          error: 'AI_DISABLED'
        };
      }

      // 2. Agregar mensaje del widget a Jira
      await this.jiraService.addCommentToIssue(issueKey, message, {
        name: customerInfo.name,
        email: customerInfo.email,
        source: 'widget'
      });

      // 3. Obtener o crear sesión de ChatKit
      let session = this.activeSessions.get(issueKey);
      if (!session) {
        session = await this.createSessionForTicket(issueKey, customerInfo);
      }

      // 4. Para ChatKit, el procesamiento de mensajes se hace en el frontend
      // El backend solo proporciona la sesión y maneja la integración con Jira
      console.log(`✅ Sesión ChatKit disponible para ${issueKey}: ${session.id}`);

      return {
        success: true,
        message: 'Mensaje enviado a Jira. Usa la sesión ChatKit en el frontend para obtener respuesta de IA.',
        sessionId: session.id
      };

    } catch (error) {
      console.error(`❌ Error procesando mensaje del widget:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Procesar comentario de Jira usando ChatKit
   */
  async processJiraComment(issueKey: string, comment: string, authorInfo: any): Promise<ChatKitResponse> {
    try {
      console.log(`📥 Procesando comentario de Jira para ${issueKey}: ${comment}`);

      // 1. Obtener o crear sesión de ChatKit
      let session = this.activeSessions.get(issueKey);
      if (!session) {
        session = await this.createSessionForTicket(issueKey, authorInfo);
      }

      // 2. Para ChatKit, el procesamiento de mensajes se hace en el frontend
      // El backend solo proporciona la sesión y maneja la integración con Jira
      console.log(`✅ Sesión ChatKit disponible para ${issueKey}: ${session.id}`);

      return {
        success: true,
        message: 'Comentario de Jira recibido. Usa la sesión ChatKit en el frontend para obtener respuesta de IA.',
        sessionId: session.id
      };

    } catch (error) {
      console.error(`❌ Error procesando comentario de Jira:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * NOTA: El procesamiento de mensajes con ChatKit se hace en el frontend
   * usando el SDK de ChatKit y el client_secret proporcionado por este servicio.
   * Este método se mantiene para referencia futura si se necesita procesamiento
   * directo desde el backend.
   */

  /**
   * Crear mensaje enriquecido con contexto
   */
  private createEnrichedMessage(message: string, context: any): string {
    const contextInfo = [];
    
    if (context.issueKey) {
      contextInfo.push(`Ticket: ${context.issueKey}`);
    }
    
    if (context.customerInfo) {
      contextInfo.push(`Cliente: ${context.customerInfo.name} (${context.customerInfo.email})`);
    }
    
    if (context.authorInfo) {
      contextInfo.push(`Autor: ${context.authorInfo.displayName}`);
    }
    
    if (context.source) {
      contextInfo.push(`Fuente: ${context.source}`);
    }

    const contextString = contextInfo.length > 0 ? `\n\nContexto: ${contextInfo.join(', ')}` : '';
    
    return `${message}${contextString}`;
  }

  /**
   * Notificar respuesta via WebSocket
   */
  private notifyWebSocket(issueKey: string, message: string): void {
    try {
      const webSocketServer = (global as any).webSocketServer;
      if (webSocketServer) {
        webSocketServer.to(`ticket_${issueKey}`).emit('ai-response', {
          issueKey,
          message,
          timestamp: new Date().toISOString(),
          source: 'chatkit'
        });
        console.log(`📡 Respuesta de IA enviada via WebSocket para ${issueKey}`);
      }
    } catch (error) {
      console.error(`❌ Error enviando notificación WebSocket:`, error);
    }
  }

  /**
   * Verificar si hay una sesión activa para un ticket
   */
  hasActiveSession(issueKey: string): boolean {
    const session = this.activeSessions.get(issueKey);
    if (!session) {
      return false;
    }
    
    // Verificar si la sesión no ha expirado
    const now = Date.now() / 1000;
    return session.expires_at > now;
  }

  /**
   * Obtener sesión activa para un ticket
   */
  getActiveSession(issueKey: string): ChatKitSession | null {
    const session = this.activeSessions.get(issueKey);
    if (!session) {
      return null;
    }
    
    // Verificar si la sesión no ha expirado
    const now = Date.now() / 1000;
    if (session.expires_at <= now) {
      this.activeSessions.delete(issueKey);
      return null;
    }
    
    return session;
  }

  /**
   * Limpiar sesión expirada
   */
  async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now() / 1000;
    
    for (const [issueKey, session] of this.activeSessions.entries()) {
      if (session.expires_at < now) {
        console.log(`🧹 Limpiando sesión expirada para ${issueKey}`);
        this.activeSessions.delete(issueKey);
      }
    }
  }

  /**
   * Obtener sesión por ID (para el controlador)
   */
  getSessionById(sessionId: string): ChatKitSession | null {
    for (const [issueKey, session] of this.activeSessions) {
      if (session.id === sessionId) {
        const now = Date.now() / 1000;
        if (session.expires_at <= now) {
          this.activeSessions.delete(issueKey);
          return null;
        }
        return session;
      }
    }
    return null;
  }
}
