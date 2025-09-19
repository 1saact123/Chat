import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'user';
  };
}

// Middleware to verify JWT token
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Get user from database to ensure they still exist and are active
    const user = await User.findByPk(decoded.userId);
    
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Add user info to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
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
};

// Middleware to check if user is admin
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
    return;
  }
  next();
};

// Middleware to check if user has specific role
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${roles.join(', ')}`
      });
      return;
    }
    next();
  };
};
