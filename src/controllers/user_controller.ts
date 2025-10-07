import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User, UserInstance, UserConfiguration, UserWebhook } from '../models';
import { UserConfigurationService } from '../services/user_configuration_service';

export class UserController {
  // Login de usuario
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: 'Username y password son requeridos'
        });
        return;
      }

      // Buscar usuario
      const user = await User.findOne({ where: { username } });
      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
        return;
      }

      // Verificar password (en producción debería estar hasheado)
      const isValidPassword = await bcrypt.compare(password, user.password) || password === user.password;
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
        return;
      }

      // Actualizar último login
      await user.update({ lastLogin: new Date() });

      // Generar token JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
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
            permissions: user.permissions
          }
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener perfil del usuario actual
  public async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
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
            permissions: user.permissions,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener instancias del usuario
  public async getUserInstances(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const userConfigService = UserConfigurationService.getInstance(req.user.id);
      const instances = await userConfigService.getUserInstances();

      res.json({
        success: true,
        data: {
          instances: instances.map(instance => ({
            id: instance.id,
            instanceName: instance.instanceName,
            instanceDescription: instance.instanceDescription,
            isActive: instance.isActive,
            settings: instance.settings,
            createdAt: instance.createdAt,
            updatedAt: instance.updatedAt
          }))
        }
      });
    } catch (error) {
      console.error('Error obteniendo instancias:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Crear nueva instancia
  public async createInstance(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { instanceName, instanceDescription, settings } = req.body;

      if (!instanceName) {
        res.status(400).json({
          success: false,
          error: 'Nombre de instancia es requerido'
        });
        return;
      }

      const userConfigService = UserConfigurationService.getInstance(req.user.id);
      const instance = await userConfigService.createInstance({
        instanceName,
        instanceDescription,
        isActive: true,
        settings
      });

      res.status(201).json({
        success: true,
        data: {
          instance: {
            id: instance.id,
            instanceName: instance.instanceName,
            instanceDescription: instance.instanceDescription,
            isActive: instance.isActive,
            settings: instance.settings,
            createdAt: instance.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Error creando instancia:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar instancia
  public async updateInstance(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { id } = req.params;
      const { instanceName, instanceDescription, isActive, settings } = req.body;

      const userConfigService = UserConfigurationService.getInstance(req.user.id);
      await userConfigService.updateInstance(parseInt(id), {
        instanceName,
        instanceDescription,
        isActive,
        settings
      });

      res.json({
        success: true,
        message: 'Instancia actualizada correctamente'
      });
    } catch (error) {
      console.error('Error actualizando instancia:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Eliminar instancia
  public async deleteInstance(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { id } = req.params;

      const userConfigService = UserConfigurationService.getInstance(req.user.id);
      await userConfigService.deleteInstance(parseInt(id));

      res.json({
        success: true,
        message: 'Instancia eliminada correctamente'
      });
    } catch (error) {
      console.error('Error eliminando instancia:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener configuraciones de servicios del usuario
  public async getUserServiceConfigurations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const userConfigService = UserConfigurationService.getInstance(req.user.id);
      const configurations = userConfigService.getAllServiceConfigurations();

      res.json({
        success: true,
        data: {
          configurations: configurations.map(config => ({
            serviceId: config.serviceId,
            serviceName: config.serviceName,
            assistantId: config.assistantId,
            assistantName: config.assistantName,
            isActive: config.isActive,
            configuration: config.configuration,
            lastUpdated: config.lastUpdated
          }))
        }
      });
    } catch (error) {
      console.error('Error obteniendo configuraciones:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Configurar servicio del usuario
  public async setUserServiceConfiguration(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { serviceId, serviceName, assistantId, assistantName, isActive, configuration } = req.body;

      if (!serviceId || !serviceName || !assistantId || !assistantName) {
        res.status(400).json({
          success: false,
          error: 'serviceId, serviceName, assistantId y assistantName son requeridos'
        });
        return;
      }

      const userConfigService = UserConfigurationService.getInstance(req.user.id);
      await userConfigService.setServiceConfiguration(
        serviceId,
        serviceName,
        assistantId,
        assistantName,
        isActive,
        configuration
      );

      res.json({
        success: true,
        message: 'Configuración de servicio actualizada correctamente'
      });
    } catch (error) {
      console.error('Error configurando servicio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener configuración de webhook del usuario
  public async getUserWebhookConfiguration(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const userConfigService = UserConfigurationService.getInstance(req.user.id);
      const webhookConfig = userConfigService.getWebhookConfiguration();

      res.json({
        success: true,
        data: {
          webhook: webhookConfig
        }
      });
    } catch (error) {
      console.error('Error obteniendo configuración de webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Configurar webhook del usuario
  public async setUserWebhookConfiguration(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { name, url, description, isEnabled, filterEnabled, filterCondition, filterValue } = req.body;

      if (!name || !url) {
        res.status(400).json({
          success: false,
          error: 'name y url son requeridos'
        });
        return;
      }

      const userConfigService = UserConfigurationService.getInstance(req.user.id);
      await userConfigService.setWebhookConfiguration({
        name,
        url,
        description,
        isEnabled: isEnabled !== false,
        filterEnabled: filterEnabled || false,
        filterCondition,
        filterValue
      });

      res.json({
        success: true,
        message: 'Configuración de webhook actualizada correctamente'
      });
    } catch (error) {
      console.error('Error configurando webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Configurar filtro de webhook del usuario
  public async setUserWebhookFilter(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { filterEnabled, filterCondition, filterValue } = req.body;

      const userConfigService = UserConfigurationService.getInstance(req.user.id);
      await userConfigService.setWebhookFilter(
        filterEnabled,
        filterCondition,
        filterValue
      );

      res.json({
        success: true,
        message: 'Filtro de webhook actualizado correctamente'
      });
    } catch (error) {
      console.error('Error configurando filtro de webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Registrar nuevo usuario (solo admin)
  public async registerUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Solo administradores pueden registrar usuarios'
        });
        return;
      }

      const { username, email, password, role, permissions } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          error: 'username, email y password son requeridos'
        });
        return;
      }

      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({
        where: { username }
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'El usuario ya existe'
        });
        return;
      }

      // Hash del password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear usuario
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role: role || 'user',
        isActive: true,
        permissions: permissions || {
          serviceManagement: false,
          automaticAIDisableRules: false,
          webhookConfiguration: false,
          ticketControl: false,
          aiEnabledProjects: false,
          remoteServerIntegration: false
        }
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            createdAt: user.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Error registrando usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}
