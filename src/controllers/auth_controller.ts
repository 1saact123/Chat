import { Request, Response } from 'express';
import { User } from '../models';
import jwt from 'jsonwebtoken';

export class AuthController {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_EXPIRES_IN = '24h';

  // Login endpoint
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: 'Username and password are required'
        });
        return;
      }

      // Buscar usuario en la base de datos
      const user = await User.findOne({
        where: { 
          username: username,
          isActive: true 
        }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }

      // Verificar contraseña
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }

      // Actualizar último login
      await user.update({ lastLogin: new Date() });

      // Generar JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role 
        },
        this.JWT_SECRET,
        { expiresIn: this.JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin
          }
        },
        message: 'Login successful'
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Verificar token
  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'No token provided'
        });
        return;
      }

      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      // Buscar usuario actualizado
      const user = await User.findByPk(decoded.userId);
      
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          error: 'User not found or inactive'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin
          }
        }
      });

    } catch (error) {
      console.error('❌ Token verification error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  }

  // Logout (opcional, ya que JWT es stateless)
  async logout(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }

  // Crear usuario (solo para administradores)
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, role = 'user' } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          error: 'Username, email and password are required'
        });
        return;
      }

      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({
        where: { 
          [require('sequelize').Op.or]: [
            { username: username },
            { email: email }
          ]
        }
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'Username or email already exists'
        });
        return;
      }

      // Crear nuevo usuario
      const newUser = await User.create({
        username,
        email,
        password,
        role,
        isActive: true
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            isActive: newUser.isActive
          }
        },
        message: 'User created successfully'
      });

    } catch (error) {
      console.error('❌ Create user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Listar usuarios (solo para administradores)
  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await User.findAll({
        attributes: ['id', 'username', 'email', 'role', 'isActive', 'lastLogin', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      res.json({
        success: true,
        data: { users },
        count: users.length
      });

    } catch (error) {
      console.error('❌ List users error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
