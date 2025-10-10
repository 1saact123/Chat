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

      // 4. Procesar mensaje con ChatKit
      const aiResponse = await this.processMessageWithChatKit(session, message, {
        issueKey,
        customerInfo,
        source: 'widget'
      });

      // 5. Agregar respuesta de IA a Jira
      if (aiResponse.success && aiResponse.message) {
        await this.jiraService.addCommentToIssue(issueKey, aiResponse.message, {
          name: 'AI Assistant',
          email: 'ai@movonte.com',
          source: 'jira'
        });

        // 6. Notificar via WebSocket
        this.notifyWebSocket(issueKey, aiResponse.message);
      }

      return {
        success: true,
        message: 'Mensaje procesado y respuesta enviada a Jira',
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

      // 2. Procesar mensaje con ChatKit
      const aiResponse = await this.processMessageWithChatKit(session, comment, {
        issueKey,
        authorInfo,
        source: 'jira-comment'
      });

      // 3. Agregar respuesta de IA a Jira
      if (aiResponse.success && aiResponse.message) {
        await this.jiraService.addCommentToIssue(issueKey, aiResponse.message, {
          name: 'AI Assistant',
          email: 'ai@movonte.com',
          source: 'jira'
        });

        // 4. Notificar via WebSocket
        this.notifyWebSocket(issueKey, aiResponse.message);
      }

      return {
        success: true,
        message: 'Comentario procesado y respuesta enviada',
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
   * Procesar mensaje con ChatKit usando el client_secret
   */
  private async processMessageWithChatKit(session: ChatKitSession, message: string, context: any): Promise<ChatKitResponse> {
    try {
      console.log(`🤖 Procesando mensaje con ChatKit: ${message}`);

      // Crear mensaje con contexto enriquecido
      const enrichedMessage = this.createEnrichedMessage(message, context);

      // Enviar mensaje a ChatKit usando el client_secret
      const response = await fetch(`https://api.openai.com/v1/chatkit/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.client_secret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: enrichedMessage,
          role: 'user',
          metadata: {
            context,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error enviando mensaje a ChatKit: ${error}`);
      }

      const result = await response.json() as any;
      console.log(`✅ Respuesta de ChatKit recibida`);

      // Extraer respuesta del asistente
      if (result.messages && result.messages.length > 0) {
        const assistantMessage = result.messages.find((msg: any) => msg.role === 'assistant');
        if (assistantMessage) {
          return {
            success: true,
            message: assistantMessage.content
          };
        }
      }

      return {
        success: false,
        error: 'No se recibió respuesta del asistente'
      };

    } catch (error) {
      console.error(`❌ Error procesando mensaje con ChatKit:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

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
}
