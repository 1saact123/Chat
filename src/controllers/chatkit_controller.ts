import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import { authenticateToken } from '../middleware/auth';

export class ChatKitController {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Crear una nueva sesión de ChatKit
   */
  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { userId, username, email, role, userContext } = req.body;

      if (!userId || !username) {
        res.status(400).json({
          success: false,
          error: 'userId y username son requeridos'
        });
        return;
      }

      console.log('🔄 Creando sesión de ChatKit para usuario:', username);

      // Crear sesión de ChatKit con OpenAI
      const session = await this.openai.chatkit.sessions.create({
        workflow: {
          id: process.env.OPENAI_CHATKIT_WORKFLOW_ID || 'wf_default'
        },
        user: {
          id: userId.toString(),
          name: username,
          email: email || '',
          metadata: {
            role: role || 'user',
            ...userContext
          }
        },
        // Configuración adicional de la sesión
        settings: {
          // Personalizar comportamiento del chat
          systemMessage: `Eres un asistente de IA especializado en ayudar con tareas administrativas y de gestión. 
            El usuario ${username} está usando el sistema Movonte Dashboard. 
            Puedes ayudar con consultas sobre proyectos, usuarios, servicios, tickets y configuraciones del sistema.
            Responde de manera profesional y útil.`,
          // Configurar límites
          maxMessages: 100,
          // Configurar herramientas disponibles
          tools: ['search', 'file_upload', 'code_interpreter']
        }
      });

      console.log('✅ Sesión de ChatKit creada exitosamente:', session.id);

      res.json({
        success: true,
        data: {
          client_secret: session.client_secret,
          session_id: session.id,
          expires_at: session.expires_at
        }
      });

    } catch (error) {
      console.error('❌ Error creando sesión de ChatKit:', error);
      
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al crear sesión de ChatKit'
      });
    }
  }

  /**
   * Refrescar una sesión existente de ChatKit
   */
  async refreshSession(req: Request, res: Response): Promise<void> {
    try {
      const { existingSecret, userId } = req.body;

      if (!existingSecret || !userId) {
        res.status(400).json({
          success: false,
          error: 'existingSecret y userId son requeridos'
        });
        return;
      }

      console.log('🔄 Refrescando sesión de ChatKit para usuario:', userId);

      // Refrescar sesión de ChatKit
      const session = await this.openai.chatkit.sessions.refresh({
        client_secret: existingSecret
      });

      console.log('✅ Sesión de ChatKit refrescada exitosamente');

      res.json({
        success: true,
        data: {
          client_secret: session.client_secret,
          session_id: session.id,
          expires_at: session.expires_at
        }
      });

    } catch (error) {
      console.error('❌ Error refrescando sesión de ChatKit:', error);
      
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al refrescar sesión de ChatKit'
      });
    }
  }

  /**
   * Obtener información de una sesión
   */
  async getSessionInfo(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'sessionId es requerido'
        });
        return;
      }

      console.log('🔄 Obteniendo información de sesión:', sessionId);

      // Obtener información de la sesión
      const session = await this.openai.chatkit.sessions.retrieve(sessionId);

      res.json({
        success: true,
        data: {
          id: session.id,
          status: session.status,
          created_at: session.created_at,
          expires_at: session.expires_at,
          user: session.user
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo información de sesión:', error);
      
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al obtener información de sesión'
      });
    }
  }

  /**
   * Eliminar una sesión
   */
  async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'sessionId es requerido'
        });
        return;
      }

      console.log('🔄 Eliminando sesión:', sessionId);

      // Eliminar sesión
      await this.openai.chatkit.sessions.delete(sessionId);

      console.log('✅ Sesión eliminada exitosamente');

      res.json({
        success: true,
        message: 'Sesión eliminada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando sesión:', error);
      
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al eliminar sesión'
      });
    }
  }

  /**
   * Obtener estadísticas de uso de ChatKit
   */
  async getUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.query;

      console.log('🔄 Obteniendo estadísticas de uso para usuario:', userId);

      // Aquí podrías implementar lógica para obtener estadísticas
      // Por ahora, devolvemos datos de ejemplo
      const stats = {
        totalSessions: 0,
        totalMessages: 0,
        lastActivity: null,
        averageSessionDuration: 0
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor al obtener estadísticas'
      });
    }
  }
}
