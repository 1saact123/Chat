import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

// Interfaces para las respuestas de la API de ChatKit
interface ChatKitSessionResponse {
  id: string;
  client_secret: string;
  expires_at: string;
}

interface ChatKitErrorResponse {
  error: {
    message: string;
    type: string;
  };
}

export class ChatKitController {
  constructor() {
    // No necesitamos instanciar OpenAI aquí para la integración recomendada
  }

  /**
   * Crear una nueva sesión de ChatKit (Integración Recomendada)
   * En esta integración, el backend de OpenAI maneja las sesiones
   * Nosotros solo generamos el client_secret
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

      // Para la integración recomendada, llamamos directamente a la API de OpenAI
      const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'chatkit_beta=v1'
        },
        body: JSON.stringify({
          workflow: {
            id: process.env.OPENAI_CHATKIT_WORKFLOW_ID
          },
          user: userId.toString()  // ChatKit espera user como string, no como objeto
        })
      });

      if (!response.ok) {
        const errorData = await response.json() as ChatKitErrorResponse;
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const session = await response.json() as ChatKitSessionResponse;
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

      // Refrescar sesión usando la API de OpenAI
      const response = await fetch('https://api.openai.com/v1/chatkit/sessions/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'chatkit_beta=v1'
        },
        body: JSON.stringify({
          client_secret: existingSecret
        })
      });

      if (!response.ok) {
        const errorData = await response.json() as ChatKitErrorResponse;
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const session = await response.json() as ChatKitSessionResponse;
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
   * Obtener información de una sesión (simplificado para integración recomendada)
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

      // Para la integración recomendada, la información de sesión se maneja en el frontend
      res.json({
        success: true,
        data: {
          id: sessionId,
          status: 'active',
          message: 'Sesión manejada por OpenAI backend'
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
   * Eliminar una sesión (simplificado para integración recomendada)
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

      // Para la integración recomendada, las sesiones se eliminan automáticamente
      console.log('✅ Sesión marcada para eliminación (manejada por OpenAI)');

      res.json({
        success: true,
        message: 'Sesión marcada para eliminación'
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
