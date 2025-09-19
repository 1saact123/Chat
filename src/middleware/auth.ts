import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export class AuthMiddleware {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  // Middleware para verificar autenticación
  async authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Access token required'
        });
        return;
      }

      // Verificar token
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      // Buscar usuario en la base de datos
      const user = await User.findByPk(decoded.userId);
      
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          error: 'User not found or inactive'
        });
        return;
      }

      // Agregar información del usuario al request
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      next();
    } catch (error) {
      console.error('❌ Authentication error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  }

  // Middleware para verificar rol de administrador
  async requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
      return;
    }

    next();
  }

  // Middleware opcional (no falla si no hay token)
  async optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (token) {
        const decoded = jwt.verify(token, this.JWT_SECRET) as any;
        const user = await User.findByPk(decoded.userId);
        
        if (user && user.isActive) {
          req.user = {
            id: user.id,
            username: user.username,
            role: user.role
          };
        }
      }

      next();
    } catch (error) {
      // En caso de error, continuar sin autenticación
      next();
    }
  }
}
