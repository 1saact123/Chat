import { ServiceValidation, User } from '../models';
import { DatabaseService } from './database_service';

export interface ServiceValidationRequest {
  serviceName: string;
  serviceDescription?: string;
  websiteUrl: string;
  requestedDomain: string;
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
        status: 'pending'
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

      console.log(`❌ Service validation rejected: ${validation.serviceName} for domain ${validation.requestedDomain}`);

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

  // Aplicar configuración de CORS (esto se ejecutaría automáticamente al aprobar)
  private async applyCorsConfiguration(domain: string): Promise<void> {
    try {
      // Aquí se implementaría la lógica para actualizar la configuración de CORS
      // Por ejemplo, actualizar nginx, agregar el dominio a la lista de dominios permitidos, etc.
      console.log(`🔧 Applying CORS configuration for domain: ${domain}`);
      
      // TODO: Implementar la lógica real de CORS
      // - Actualizar nginx configuration
      // - Agregar dominio a allowed origins
      // - Reiniciar servicios si es necesario
      
    } catch (error) {
      console.error('❌ Error applying CORS configuration:', error);
      throw error;
    }
  }

  // Generar token protegido para el servicio (no expone el token real)
  public generateProtectedToken(serviceId: string, userId: number): string {
    // Generar un token que no exponga el token real de la API
    // Este token se usaría para identificar el servicio sin exponer credenciales
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `svc_${userId}_${serviceId}_${timestamp}_${randomPart}`;
  }

  // Validar token protegido
  public validateProtectedToken(protectedToken: string): { userId: number; serviceId: string; isValid: boolean } {
    try {
      const parts = protectedToken.split('_');
      if (parts.length !== 5 || parts[0] !== 'svc') {
        return { userId: 0, serviceId: '', isValid: false };
      }

      const userId = parseInt(parts[1]);
      const serviceId = parts[2];
      
      return {
        userId,
        serviceId,
        isValid: !isNaN(userId) && serviceId.length > 0
      };
    } catch (error) {
      return { userId: 0, serviceId: '', isValid: false };
    }
  }
}
