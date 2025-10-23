import { ServiceValidation, User, UserConfiguration } from '../models';
import { DatabaseService } from './database_service';
import { UserConfigurationService } from './user_configuration_service';

export interface ServiceValidationRequest {
  serviceName: string;
  serviceDescription?: string;
  websiteUrl: string;
  requestedDomain: string;
  adminId?: number; // ID del administrador asignado
}

export interface ServiceValidationResponse {
  id: number;
  serviceName: string;
  serviceDescription?: string;
  websiteUrl: string;
  requestedDomain: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  validatedBy?: number;
  validatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

export class ServiceValidationService {
  private static instance: ServiceValidationService;
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  public static getInstance(): ServiceValidationService {
    if (!ServiceValidationService.instance) {
      ServiceValidationService.instance = new ServiceValidationService();
    }
    return ServiceValidationService.instance;
  }

  // Crear solicitud de validación de servicio
  public async createValidationRequest(
    userId: number, 
    request: ServiceValidationRequest
  ): Promise<ServiceValidationResponse> {
    try {
      // Validar que el usuario existe
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Validar que no existe una solicitud pendiente para el mismo dominio
      const existingRequest = await ServiceValidation.findOne({
        where: {
          userId,
          requestedDomain: request.requestedDomain,
          status: 'pending'
        }
      });

      if (existingRequest) {
        throw new Error('Ya existe una solicitud pendiente para este dominio');
      }

      // Crear la solicitud de validación
      const validation = await ServiceValidation.create({
        userId,
        serviceName: request.serviceName,
        serviceDescription: request.serviceDescription,
        websiteUrl: request.websiteUrl,
        requestedDomain: request.requestedDomain,
        status: 'pending',
        adminId: request.adminId // Asignar al administrador del usuario
      });

      console.log(`✅ Service validation request created for user ${userId}: ${request.serviceName}`);

      return {
        id: validation.id,
        serviceName: validation.serviceName,
        serviceDescription: validation.serviceDescription,
        websiteUrl: validation.websiteUrl,
        requestedDomain: validation.requestedDomain,
        status: validation.status,
        adminNotes: validation.adminNotes,
        validatedBy: validation.validatedBy,
        validatedAt: validation.validatedAt,
        createdAt: validation.createdAt,
        updatedAt: validation.updatedAt,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      };
    } catch (error) {
      console.error('❌ Error creating service validation request:', error);
      throw error;
    }
  }

  // Obtener solicitudes de validación para el admin
  public async getPendingValidations(): Promise<ServiceValidationResponse[]> {
    try {
      const validations = await ServiceValidation.findAll({
        where: { status: 'pending' },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }],
        order: [['created_at', 'ASC']]
      });

      return validations.map(validation => ({
        id: validation.id,
        serviceName: validation.serviceName,
        serviceDescription: validation.serviceDescription,
        websiteUrl: validation.websiteUrl,
        requestedDomain: validation.requestedDomain,
        status: validation.status,
        adminNotes: validation.adminNotes,
        validatedBy: validation.validatedBy,
        validatedAt: validation.validatedAt,
        createdAt: validation.createdAt,
        updatedAt: validation.updatedAt,
        user: (validation as any).user ? {
          id: (validation as any).user.id,
          username: (validation as any).user.username,
          email: (validation as any).user.email
        } : undefined
      }));
    } catch (error) {
      console.error('❌ Error getting pending validations:', error);
      throw error;
    }
  }

  // Obtener solicitudes pendientes asignadas a un administrador específico
  public async getPendingValidationsForAdmin(adminId: number): Promise<ServiceValidationResponse[]> {
    try {
      const validations = await ServiceValidation.findAll({
        where: { 
          status: 'pending',
          adminId: adminId
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }],
        order: [['created_at', 'ASC']]
      });

      return validations.map(validation => ({
        id: validation.id,
        serviceName: validation.serviceName,
        serviceDescription: validation.serviceDescription,
        websiteUrl: validation.websiteUrl,
        requestedDomain: validation.requestedDomain,
        status: validation.status,
        adminNotes: validation.adminNotes,
        validatedBy: validation.validatedBy,
        validatedAt: validation.validatedAt,
        createdAt: validation.createdAt,
        updatedAt: validation.updatedAt,
        user: (validation as any).user ? {
          id: (validation as any).user.id,
          username: (validation as any).user.username,
          email: (validation as any).user.email
        } : undefined
      }));
    } catch (error) {
      console.error('❌ Error getting pending validations for admin:', error);
      throw error;
    }
  }

  // Obtener solicitudes de validación de un usuario específico
  public async getUserValidations(userId: number): Promise<ServiceValidationResponse[]> {
    try {
      const validations = await ServiceValidation.findAll({
        where: { userId },
        order: [['created_at', 'DESC']]
      });

      return validations.map(validation => ({
        id: validation.id,
        serviceName: validation.serviceName,
        serviceDescription: validation.serviceDescription,
        websiteUrl: validation.websiteUrl,
        requestedDomain: validation.requestedDomain,
        status: validation.status,
        adminNotes: validation.adminNotes,
        validatedBy: validation.validatedBy,
        validatedAt: validation.validatedAt,
        createdAt: validation.createdAt,
        updatedAt: validation.updatedAt
      }));
    } catch (error) {
      console.error('❌ Error getting user validations:', error);
      throw error;
    }
  }

  // Aprobar solicitud de validación
  public async approveValidation(
    validationId: number, 
    adminId: number, 
    adminNotes?: string
  ): Promise<ServiceValidationResponse> {
    try {
      const validation = await ServiceValidation.findByPk(validationId);
      if (!validation) {
        throw new Error('Solicitud de validación no encontrada');
      }

      if (validation.status !== 'pending') {
        throw new Error('La solicitud ya ha sido procesada');
      }

      // Actualizar el estado a aprobado
      await validation.update({
        status: 'approved',
        validatedBy: adminId,
        validatedAt: new Date(),
        adminNotes: adminNotes || 'Aprobado por administrador'
      });

      // Buscar y activar el servicio del usuario correspondiente
      await this.activateUserService(validation.userId, validation.serviceName);

      // Aquí se aplicaría la configuración de CORS automáticamente
      await this.applyCorsConfiguration(validation.requestedDomain);

      console.log(`✅ Service validation approved: ${validation.serviceName} for domain ${validation.requestedDomain}`);

      return {
        id: validation.id,
        serviceName: validation.serviceName,
        serviceDescription: validation.serviceDescription,
        websiteUrl: validation.websiteUrl,
        requestedDomain: validation.requestedDomain,
        status: validation.status,
        adminNotes: validation.adminNotes,
        validatedBy: validation.validatedBy,
        validatedAt: validation.validatedAt,
        createdAt: validation.createdAt,
        updatedAt: validation.updatedAt
      };
    } catch (error) {
      console.error('❌ Error approving validation:', error);
      throw error;
    }
  }

  // Rechazar solicitud de validación
  public async rejectValidation(
    validationId: number, 
    adminId: number, 
    adminNotes: string
  ): Promise<ServiceValidationResponse> {
    try {
      const validation = await ServiceValidation.findByPk(validationId);
      if (!validation) {
        throw new Error('Solicitud de validación no encontrada');
      }

      if (validation.status !== 'pending') {
        throw new Error('La solicitud ya ha sido procesada');
      }

      // Actualizar el estado a rechazado
      await validation.update({
        status: 'rejected',
        validatedBy: adminId,
        validatedAt: new Date(),
        adminNotes: adminNotes
      });

      // Eliminar el servicio de unified_configurations ya que fue rechazado
      const { sequelize } = await import('../config/database');
      await sequelize.query(`
        DELETE FROM unified_configurations 
        WHERE user_id = ? AND service_name = ?
      `, {
        replacements: [validation.userId, validation.serviceName]
      });

      console.log(`❌ Service validation rejected and service deleted: ${validation.serviceName} for domain ${validation.requestedDomain}`);

      return {
        id: validation.id,
        serviceName: validation.serviceName,
        serviceDescription: validation.serviceDescription,
        websiteUrl: validation.websiteUrl,
        requestedDomain: validation.requestedDomain,
        status: validation.status,
        adminNotes: validation.adminNotes,
        validatedBy: validation.validatedBy,
        validatedAt: validation.validatedAt,
        createdAt: validation.createdAt,
        updatedAt: validation.updatedAt
      };
    } catch (error) {
      console.error('❌ Error rejecting validation:', error);
      throw error;
    }
  }

  // Activar el servicio del usuario cuando se aprueba la validación
  private async activateUserService(userId: number, serviceName: string): Promise<void> {
    try {
      // Buscar el servicio del usuario en unified_configurations
      const { sequelize } = await import('../config/database');
      const [services] = await sequelize.query(`
        SELECT * FROM unified_configurations 
        WHERE user_id = ? AND service_name = ?
        LIMIT 1
      `, {
        replacements: [userId, serviceName]
      });

      if (services.length > 0) {
        const service = services[0] as any;
        
        // Actualizar el servicio en unified_configurations
        const currentConfig = typeof service.configuration === 'string' 
          ? JSON.parse(service.configuration) 
          : service.configuration || {};

        await sequelize.query(`
          UPDATE unified_configurations 
          SET is_active = true, 
              configuration = ?,
              last_updated = NOW()
          WHERE id = ?
        `, {
          replacements: [
            JSON.stringify({
              ...currentConfig,
              adminApproved: true,
              adminApprovedAt: new Date().toISOString()
            }),
            service.id
          ]
        });

        console.log(`✅ User service activated: ${serviceName} for user ${userId}`);
      } else {
        console.log(`⚠️ User service not found: ${serviceName} for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error activating user service:', error);
      // No lanzar el error para no interrumpir el proceso de aprobación
    }
  }

  // Aplicar configuración de CORS (esto se ejecutaría automáticamente al aprobar)
  private async applyCorsConfiguration(domain: string): Promise<void> {
    try {
      console.log(`🔧 Applying CORS configuration for domain: ${domain}`);
      
      // Verificar que el dominio sea válido
      if (!domain || !this.isValidDomain(domain)) {
        throw new Error(`Dominio inválido: ${domain}`);
      }

      // Agregar el dominio a la lista de dominios aprobados en la base de datos
      await this.addApprovedDomain(domain);
      
      // Actualizar la configuración de CORS en tiempo real
      await this.updateCorsConfiguration(domain);
      
      console.log(`✅ CORS configuration applied successfully for domain: ${domain}`);
      
    } catch (error) {
      console.error('❌ Error applying CORS configuration:', error);
      throw error;
    }
  }

  // Validar que el dominio sea válido
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/;
    return domainRegex.test(domain);
  }

  // Agregar dominio aprobado a la base de datos
  private async addApprovedDomain(domain: string): Promise<void> {
    try {
      // Crear o actualizar registro de dominio aprobado
      await this.dbService.createOrUpdateServiceConfig({
        serviceId: `cors-domain-${domain}`,
        serviceName: `CORS Domain: ${domain}`,
        assistantId: 'CORS',
        assistantName: 'CORS Configuration',
        isActive: true,
        lastUpdated: new Date()
      });
      
      console.log(`✅ Domain ${domain} added to approved domains database`);
    } catch (error) {
      console.error(`❌ Error adding domain ${domain} to database:`, error);
      throw error;
    }
  }

  // Actualizar configuración de CORS en tiempo real
  private async updateCorsConfiguration(domain: string): Promise<void> {
    try {
      // Obtener la lista actual de dominios permitidos
      const currentOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
      
      // Verificar si el dominio ya está en la lista
      const domainExists = currentOrigins.some(origin => 
        origin.trim() === domain || origin.trim() === `https://${domain}` || origin.trim() === `http://${domain}`
      );
      
      if (!domainExists) {
        // Agregar el dominio a la lista
        const newOrigins = [...currentOrigins, `https://${domain}`, `http://${domain}`];
        process.env.ALLOWED_ORIGINS = newOrigins.join(',');
        
        console.log(`✅ Domain ${domain} added to ALLOWED_ORIGINS environment variable`);
        console.log(`📋 Updated ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS}`);
      } else {
        console.log(`ℹ️ Domain ${domain} already exists in ALLOWED_ORIGINS`);
      }
      
    } catch (error) {
      console.error(`❌ Error updating CORS configuration for domain ${domain}:`, error);
      throw error;
    }
  }

  // Generar token protegido para el servicio (no expone el token real)
  public generateProtectedToken(serviceId: string, userId: number, expirationHours: number = 24): string {
    const jwt = require('jsonwebtoken');
    
    // Crear payload del token
    const payload = {
      serviceId,
      userId,
      type: 'protected',
      timestamp: Date.now()
    };
    
    // Generar token JWT con tiempo de expiración personalizable
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback-secret',
      { 
        expiresIn: `${expirationHours}h`,
        issuer: 'movonte-chatbot',
        audience: 'protected-service'
      }
    );
    
    return token;
  }

  // Validar token protegido
  public validateProtectedToken(protectedToken: string): { userId: number; serviceId: string; isValid: boolean } {
    try {
      const jwt = require('jsonwebtoken');
      
      // Verificar si es un token JWT
      if (protectedToken.startsWith('eyJ')) {
        const decoded = jwt.verify(protectedToken, process.env.JWT_SECRET || 'fallback-secret');
        
        if (decoded.type === 'protected' && decoded.serviceId && decoded.userId) {
          return { 
            userId: decoded.userId, 
            serviceId: decoded.serviceId, 
            isValid: true 
          };
        }
      }
      
      // Fallback para tokens antiguos (formato svc_)
      const parts = protectedToken.split('_');
      if (parts.length === 5 && parts[0] === 'svc') {
        const userId = parseInt(parts[1]);
        const serviceId = parts[2];
        return { userId, serviceId, isValid: true };
      }
      
      return { userId: 0, serviceId: '', isValid: false };
    } catch (error) {
      console.error('Error validating protected token:', error);
      return { userId: 0, serviceId: '', isValid: false };
    }
  }

  // Obtener el servicio de configuración del usuario
  public getUserConfigurationService(userId: number): UserConfigurationService {
    return UserConfigurationService.getInstance(userId);
  }

  // Obtener dominios aprobados desde la base de datos
  public async getApprovedDomains(): Promise<string[]> {
    try {
      const approvedDomains = await this.dbService.getAllServiceConfigs();
      
      // Filtrar solo los dominios CORS aprobados
      const corsDomains = approvedDomains
        .filter((config: any) => config.serviceId.startsWith('cors-domain-'))
        .map((config: any) => config.serviceId.replace('cors-domain-', ''));
      
      console.log(`📋 Found ${corsDomains.length} approved CORS domains:`, corsDomains);
      return corsDomains;
    } catch (error) {
      console.error('❌ Error getting approved domains:', error);
      return [];
    }
  }
}
