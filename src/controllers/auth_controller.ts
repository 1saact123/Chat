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
      const { username, email, password, role = 'user', isActive = true } = req.body;

      // Validaciones de entrada
      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          error: 'Username, email and password are required'
        });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
        return;
      }

      // Validar longitud de contraseña
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long'
        });
        return;
      }

      // Validar rol
      if (role && !['admin', 'user'].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Role must be either "admin" or "user"'
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
        isActive
      });

      console.log(`✅ User created: ${username} (${email}) with role: ${role}`);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            isActive: newUser.isActive,
            createdAt: newUser.createdAt
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
      const { page = 1, limit = 10, role, isActive } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const whereClause: any = {};
      if (role) whereClause.role = role;
      if (isActive !== undefined) whereClause.isActive = isActive === 'true';

      const users = await User.findAndCountAll({
        attributes: ['id', 'username', 'email', 'role', 'isActive', 'lastLogin', 'createdAt'],
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset: offset
      });

      res.json({
        success: true,
        data: { 
          users: users.rows,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: users.count,
            pages: Math.ceil(users.count / Number(limit))
          }
        },
        count: users.count
      });

    } catch (error) {
      console.error('❌ List users error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Obtener usuario por ID (solo para administradores)
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id, {
        attributes: ['id', 'username', 'email', 'role', 'isActive', 'lastLogin', 'createdAt', 'updatedAt']
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { user }
      });

    } catch (error) {
      console.error('❌ Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Actualizar usuario (solo para administradores)
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { username, email, role, isActive, password } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Validar email si se proporciona
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          res.status(400).json({
            success: false,
            error: 'Invalid email format'
          });
          return;
        }

        // Verificar si el email ya existe en otro usuario
        const existingUser = await User.findOne({
          where: { 
            email: email,
            id: { [require('sequelize').Op.ne]: id }
          }
        });

        if (existingUser) {
          res.status(400).json({
            success: false,
            error: 'Email already exists'
          });
          return;
        }
      }

      // Validar username si se proporciona
      if (username) {
        const existingUser = await User.findOne({
          where: { 
            username: username,
            id: { [require('sequelize').Op.ne]: id }
          }
        });

        if (existingUser) {
          res.status(400).json({
            success: false,
            error: 'Username already exists'
          });
          return;
        }
      }

      // Validar rol si se proporciona
      if (role && !['admin', 'user'].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Role must be either "admin" or "user"'
        });
        return;
      }

      // Validar contraseña si se proporciona
      if (password && password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long'
        });
        return;
      }

      // Actualizar usuario
      const updateData: any = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (password) updateData.password = password;

      await user.update(updateData);

      console.log(`✅ User updated: ${user.username} (ID: ${id})`);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            updatedAt: user.updatedAt
          }
        },
        message: 'User updated successfully'
      });

    } catch (error) {
      console.error('❌ Update user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Eliminar usuario (solo para administradores)
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await User.findByPk(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // No permitir eliminar el último administrador
      if (user.role === 'admin') {
        const adminCount = await User.count({
          where: { role: 'admin' }
        });

        if (adminCount <= 1) {
          res.status(400).json({
            success: false,
            error: 'Cannot delete the last admin user'
          });
          return;
        }
      }

      await user.destroy();

      console.log(`✅ User deleted: ${user.username} (ID: ${id})`);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('❌ Delete user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Cambiar contraseña de usuario
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters long'
        });
        return;
      }

      const user = await User.findByPk(id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Verificar contraseña actual
      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
        return;
      }

      // Actualizar contraseña
      await user.update({ password: newPassword });

      console.log(`✅ Password changed for user: ${user.username} (ID: ${id})`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('❌ Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
