import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User } from '../models';

// Función para generar JWT
const generateToken = (userId: number): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '24h' }
  );
};

// Login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // Validar datos de entrada
    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username y password son requeridos'
      });
      return;
    }

    // Buscar usuario por username o email
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
      return;
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Usuario inactivo. Contacta al administrador'
      });
      return;
    }

    // Verificar password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
      return;
    }

    // Actualizar último login
    await user.update({ lastLogin: new Date() });

    // Generar token
    const token = generateToken(user.id);

    // Respuesta exitosa
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
      message: 'Login exitoso'
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Logout (opcional, ya que JWT es stateless)
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // En un sistema JWT stateless, el logout se maneja en el cliente
    // eliminando el token. Aquí solo confirmamos el logout.
    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Verificar token (para verificar si el usuario está autenticado)
export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Si llegamos aquí, el middleware de autenticación ya verificó el token
    res.json({
      success: true,
      data: {
        user: req.user
      },
      message: 'Token válido'
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Obtener perfil del usuario autenticado
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Cambiar password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Current password y new password son requeridos'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
      return;
    }

    // Buscar usuario
    const user = await User.findByPk(req.user.id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    // Verificar password actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Contraseña actual incorrecta'
      });
      return;
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar password
    await user.update({ password: hashedPassword });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando password:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
