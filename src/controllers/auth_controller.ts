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

    // Configurar cookie con el token
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });

    // Para admins, siempre considerar que la configuración inicial está completa
    const isSetupComplete = user.role === 'admin' ? true : user.isInitialSetupComplete;

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
          lastLogin: user.lastLogin,
          isInitialSetupComplete: isSetupComplete
        },
        requiresInitialSetup: !isSetupComplete
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
    // Limpiar cookie de autenticación
    res.clearCookie('authToken');
    
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

    // Para admins, siempre considerar que la configuración inicial está completa
    const userData = {
      ...req.user,
      isInitialSetupComplete: req.user.role === 'admin' ? true : req.user.isInitialSetupComplete
    };

    res.json({
      success: true,
      data: {
        user: userData
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

// ===== ENDPOINTS DE ADMINISTRACIÓN DE USUARIOS (SOLO ADMIN) =====

// Obtener todos los usuarios (solo admin)
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren permisos de administrador'
      });
      return;
    }

    // Filtrar usuarios por admin_id - cada admin solo ve sus usuarios
    const users = await User.findAll({
      where: {
        adminId: req.user.id // Solo usuarios asignados a este admin
      },
      attributes: ['id', 'username', 'email', 'role', 'isActive', 'lastLogin', 'createdAt', 'adminId'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { users }
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Crear nuevo usuario (solo admin)
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren permisos de administrador'
      });
      return;
    }

    const { username, email, password, role = 'user' } = req.body;

    // Validaciones
    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Username, email y password son requeridos'
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
      return;
    }

    if (!['admin', 'user'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Rol inválido. Debe ser "admin" o "user"'
      });
      return;
    }

    // Verificar si el usuario o email ya existen
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'El username o email ya existe'
      });
      return;
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario con admin_id del admin que lo crea
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
      isActive: true,
      adminId: role === 'user' ? req.user.id : null // Solo usuarios regulares tienen admin_id
    });

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
      message: 'Usuario creado exitosamente'
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Actualizar usuario (solo admin)
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren permisos de administrador'
      });
      return;
    }

    const { id } = req.params;
    const { username, email, role, isActive } = req.body;

    // Buscar usuario
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    // Validaciones
    if (role && !['admin', 'user'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Rol inválido. Debe ser "admin" o "user"'
      });
      return;
    }

    // Verificar si el username o email ya existen (excluyendo el usuario actual)
    if (username || email) {
      const existingUser = await User.findOne({
        where: {
          [Op.and]: [
            { id: { [Op.ne]: id } }, // Excluir el usuario actual
            {
              [Op.or]: [
                ...(username ? [{ username }] : []),
                ...(email ? [{ email }] : [])
              ]
            }
          ]
        }
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'El username o email ya existe'
        });
        return;
      }
    }

    // Actualizar usuario
    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    await user.update(updateData);

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
      message: 'Usuario actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Cambiar contraseña de usuario (solo admin)
export const changeUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren permisos de administrador'
      });
      return;
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({
        success: false,
        error: 'New password es requerido'
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
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar password
    await user.update({ password: hashedPassword });

    res.json({
      success: true,
      message: 'Contraseña del usuario actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando password del usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Eliminar usuario (solo admin)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requieren permisos de administrador'
      });
      return;
    }

    const { id } = req.params;

    // No permitir eliminar el propio usuario
    if (parseInt(id) === req.user.id) {
      res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propio usuario'
      });
      return;
    }

    // Buscar usuario
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
      return;
    }

    // Eliminar usuario
    await user.destroy();

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};