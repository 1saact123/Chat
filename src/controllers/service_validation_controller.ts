import { Request, Response } from 'express';
import { ServiceValidationService, ServiceValidationRequest } from '../services/service_validation_service';

export class ServiceValidationController {
  private validationService: ServiceValidationService;

  constructor() {
    this.validationService = ServiceValidationService.getInstance();
  }

  // Crear solicitud de validación de servicio
  public async createValidationRequest(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      const { serviceName, serviceDescription, websiteUrl, requestedDomain } = req.body;

      // Validaciones básicas
      if (!serviceName || !websiteUrl || !requestedDomain) {
        res.status(400).json({ 
          success: false, 
          error: 'Se requieren: serviceName, websiteUrl y requestedDomain' 
        });
        return;
      }

      // Validar formato de URL
      try {
        new URL(websiteUrl);
      } catch {
        res.status(400).json({ 
          success: false, 
          error: 'La URL del sitio web no es válida' 
        });
        return;
      }

      // Validar formato de dominio
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)*$/;
      if (!domainRegex.test(requestedDomain)) {
        res.status(400).json({ 
          success: false, 
          error: 'El dominio solicitado no tiene un formato válido' 
        });
        return;
      }

      // Obtener el adminId del usuario (su administrador asignado)
      const { User } = await import('../models');
      const user = await User.findByPk(req.user.id);
      
      if (!user) {
        res.status(404).json({ 
          success: false, 
          error: 'Usuario no encontrado' 
        });
        return;
      }

      const validationRequest: ServiceValidationRequest = {
        serviceName,
        serviceDescription,
        websiteUrl,
        requestedDomain,
        adminId: user.adminId // Asignar al administrador del usuario
      };

      const validation = await this.validationService.createValidationRequest(
        req.user.id, 
        validationRequest
      );

      res.status(201).json({
        success: true,
        message: 'Solicitud de validación creada exitosamente. Será revisada por un administrador.',
        data: validation
      });
    } catch (error) {
      console.error('❌ Error creating validation request:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      });
    }
  }

  // Obtener solicitudes de validación del usuario
  public async getUserValidations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      const validations = await this.validationService.getUserValidations(req.user.id);

      res.json({
        success: true,
        data: {
          validations,
          count: validations.length
        }
      });
    } catch (error) {
      console.error('❌ Error getting user validations:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      });
    }
  }

  // Obtener solicitudes pendientes (solo para admins) - Ahora desde unified_configurations
  public async getPendingValidations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      if (req.user.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Acceso denegado. Solo administradores.' });
        return;
      }

      // Obtener servicios pendientes directamente desde unified_configurations
      // Solo mostrar servicios de usuarios creados por este administrador
      const { sequelize } = await import('../config/database');
      const { User } = await import('../models');
      
      const [pendingServices] = await sequelize.query(`
        SELECT 
          uc.id,
          uc.service_id as serviceId,
          uc.service_name as serviceName,
          uc.user_id as userId,
          uc.assistant_id as assistantId,
          uc.assistant_name as assistantName,
          uc.is_active as isActive,
          uc.approval_status as approvalStatus,
          uc.configuration,
          uc.created_at as createdAt,
          uc.updated_at as updatedAt,
          u.username,
          u.email,
          u.admin_id as adminId
        FROM unified_configurations uc
        INNER JOIN users u ON uc.user_id = u.id
        WHERE uc.approval_status = 'pending'
          AND u.admin_id = ?
        ORDER BY uc.created_at ASC
      `, {
        replacements: [req.user.id]
      });

      const validations = await Promise.all(
        (pendingServices as any[]).map(async (service: any) => {
          // Parsear configuration
          let config = service.configuration;
          if (typeof config === 'string') {
            try {
              config = JSON.parse(config);
            } catch (e) {
              config = {};
            }
          }

          // Buscar información de validación si existe (opcional, para mantener compatibilidad)
          const validationRequest = await this.validationService.getUserValidations(service.userId);
          const matchingValidation = validationRequest.find(
            (v: any) => v.serviceName === service.serviceName
          );

          // Priorizar configuración del servicio, luego validación si existe
          return {
            id: service.id,
            serviceId: service.serviceId,
            serviceName: service.serviceName,
            serviceDescription: matchingValidation?.serviceDescription || config?.serviceDescription || '',
            websiteUrl: config?.websiteUrl || matchingValidation?.websiteUrl || '',
            requestedDomain: config?.requestedDomain || matchingValidation?.requestedDomain || '',
            status: 'pending' as const,
            approvalStatus: service.approvalStatus,
            createdAt: service.createdAt,
            updatedAt: service.updatedAt,
            user: {
              id: service.userId,
              username: service.username,
              email: service.email
            },
            configuration: config
          };
        })
      );

      res.json({
        success: true,
        data: {
          validations,
          count: validations.length
        }
      });
    } catch (error) {
      console.error('❌ Error getting pending validations:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      });
    }
  }

  // Aprobar solicitud de validación (solo para admins) - Ahora desde unified_configurations
  public async approveValidation(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      if (req.user.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Acceso denegado. Solo administradores.' });
        return;
      }

      const { id } = req.params;
      const { adminNotes } = req.body;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({ success: false, error: 'ID de servicio inválido' });
        return;
      }

      // Obtener el servicio desde unified_configurations con información del usuario
      const { sequelize } = await import('../config/database');
      const { User } = await import('../models');
      const [services] = await sequelize.query(`
        SELECT uc.*, u.admin_id as userAdminId
        FROM unified_configurations uc
        INNER JOIN users u ON uc.user_id = u.id
        WHERE uc.id = ?
      `, {
        replacements: [Number(id)]
      });

      if (!services || (services as any[]).length === 0) {
        res.status(404).json({ success: false, error: 'Servicio no encontrado' });
        return;
      }

      const service = (services as any[])[0];
      
      // Verificar que el usuario que creó el servicio pertenece a este administrador
      if (service.userAdminId !== req.user.id) {
        res.status(403).json({ 
          success: false, 
          error: 'No tienes permisos para aprobar este servicio. Solo puedes aprobar servicios de usuarios que creaste.' 
        });
        return;
      }
      
      if (service.approval_status !== 'pending') {
        res.status(400).json({ 
          success: false, 
          error: `El servicio ya ha sido ${service.approval_status === 'approved' ? 'aprobado' : 'rechazado'}` 
        });
        return;
      }

      // Parsear configuration
      let config = service.configuration;
      if (typeof config === 'string') {
        try {
          config = JSON.parse(config);
        } catch (e) {
          config = {};
        }
      }

      // Actualizar el servicio a aprobado en unified_configurations
      await sequelize.query(`
        UPDATE unified_configurations 
        SET 
          approval_status = 'approved',
          is_active = true,
          configuration = ?,
          last_updated = NOW()
        WHERE id = ?
      `, {
        replacements: [
          JSON.stringify({
            ...config,
            adminApproved: true,
            adminApprovedAt: new Date().toISOString(),
            adminNotes: adminNotes || 'Aprobado por administrador'
          }),
          Number(id)
        ]
      });

      // Aplicar configuración de CORS si hay dominio
      const requestedDomain = config?.requestedDomain;
      if (requestedDomain) {
        try {
          // Llamar al método privado a través del servicio
          const serviceValidationService = this.validationService as any;
          if (serviceValidationService.applyCorsConfiguration) {
            await serviceValidationService.applyCorsConfiguration(requestedDomain);
          }
        } catch (corsError) {
          console.warn('⚠️ Error applying CORS configuration (non-critical):', corsError);
        }
      }

      console.log(`✅ Service approved: ${service.service_name} for user ${service.user_id}`);

      res.json({
        success: true,
        message: `Servicio aprobado exitosamente${requestedDomain ? `. CORS configurado automáticamente para el dominio: ${requestedDomain}` : ''}`,
        data: {
          id: service.id,
          serviceId: service.service_id,
          serviceName: service.service_name,
          approvalStatus: 'approved',
          adminNotes: adminNotes || 'Aprobado por administrador'
        }
      });
    } catch (error) {
      console.error('❌ Error approving validation:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      });
    }
  }

  // Rechazar solicitud de validación (solo para admins) - Ahora desde unified_configurations
  public async rejectValidation(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      if (req.user.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Acceso denegado. Solo administradores.' });
        return;
      }

      const { id } = req.params;
      const { adminNotes } = req.body;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({ success: false, error: 'ID de servicio inválido' });
        return;
      }

      if (!adminNotes || adminNotes.trim().length === 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Se requieren notas del administrador para rechazar la solicitud' 
        });
        return;
      }

      // Obtener el servicio desde unified_configurations con información del usuario
      const { sequelize } = await import('../config/database');
      const { User } = await import('../models');
      const [services] = await sequelize.query(`
        SELECT uc.*, u.admin_id as userAdminId
        FROM unified_configurations uc
        INNER JOIN users u ON uc.user_id = u.id
        WHERE uc.id = ?
      `, {
        replacements: [Number(id)]
      });

      if (!services || (services as any[]).length === 0) {
        res.status(404).json({ success: false, error: 'Servicio no encontrado' });
        return;
      }

      const service = (services as any[])[0];
      
      // Verificar que el usuario que creó el servicio pertenece a este administrador
      if (service.userAdminId !== req.user.id) {
        res.status(403).json({ 
          success: false, 
          error: 'No tienes permisos para rechazar este servicio. Solo puedes rechazar servicios de usuarios que creaste.' 
        });
        return;
      }
      
      if (service.approval_status !== 'pending') {
        res.status(400).json({ 
          success: false, 
          error: `El servicio ya ha sido ${service.approval_status === 'approved' ? 'aprobado' : 'rechazado'}` 
        });
        return;
      }

      // Parsear configuration
      let config = service.configuration;
      if (typeof config === 'string') {
        try {
          config = JSON.parse(config);
        } catch (e) {
          config = {};
        }
      }

      // Actualizar el servicio a rechazado en unified_configurations
      await sequelize.query(`
        UPDATE unified_configurations 
        SET 
          approval_status = 'rejected',
          is_active = false,
          configuration = ?,
          last_updated = NOW()
        WHERE id = ?
      `, {
        replacements: [
          JSON.stringify({
            ...config,
            adminApproved: false,
            adminRejectedAt: new Date().toISOString(),
            adminNotes: adminNotes
          }),
          Number(id)
        ]
      });

      console.log(`❌ Service rejected: ${service.service_name} for user ${service.user_id}`);

      res.json({
        success: true,
        message: 'Solicitud de validación rechazada.',
        data: {
          id: service.id,
          serviceId: service.service_id,
          serviceName: service.service_name,
          approvalStatus: 'rejected',
          adminNotes: adminNotes
        }
      });
    } catch (error) {
      console.error('❌ Error rejecting validation:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      });
    }
  }

  // Generar token protegido para un servicio
  public async generateProtectedToken(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔐 Generating protected token for user:', req.user?.id);
      
      if (!req.user) {
        console.log('❌ No user in request');
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      const { serviceId, expirationHours } = req.body;
      console.log('🔍 Service ID requested:', serviceId);
      console.log('⏰ Expiration hours requested:', expirationHours);

      if (!serviceId) {
        console.log('❌ No serviceId provided');
        res.status(400).json({ success: false, error: 'Se requiere serviceId' });
        return;
      }

      // Validar tiempo de expiración (entre 1 hora y 30 días)
      const minHours = 1;
      const maxHours = 24 * 30; // 30 días
      const defaultHours = 24; // 24 horas por defecto
      
      let validExpirationHours = defaultHours;
      if (expirationHours && typeof expirationHours === 'number') {
        if (expirationHours < minHours || expirationHours > maxHours) {
          res.status(400).json({ 
            success: false, 
            error: `El tiempo de expiración debe estar entre ${minHours} y ${maxHours} horas` 
          });
          return;
        }
        validExpirationHours = expirationHours;
      }
      
      console.log('✅ Using expiration hours:', validExpirationHours);

      // Verificar que el usuario tenga acceso al servicio usando unified_configurations
      const { sequelize } = await import('../config/database');
      const [configurations] = await sequelize.query(`
        SELECT * FROM unified_configurations 
        WHERE user_id = ? AND CAST(service_id AS CHAR) COLLATE utf8mb4_unicode_ci = CAST(? AS CHAR) COLLATE utf8mb4_unicode_ci
        LIMIT 1
      `, {
        replacements: [req.user.id, serviceId]
      });
      
      console.log('🔍 Found configurations:', (configurations as any[]).length);
      
      if (!configurations || (configurations as any[]).length === 0) {
        console.log('❌ No service found for user:', req.user.id, 'service:', serviceId);
        res.status(403).json({ 
          success: false, 
          error: 'No tienes acceso a este servicio o el servicio no existe' 
        });
        return;
      }
      
      const config = (configurations as any[])[0];
      const userService = {
        serviceId: config.service_id,
        serviceName: config.service_name,
        assistantId: config.assistant_id,
        assistantName: config.assistant_name,
        isActive: Boolean(config.is_active),
        approvalStatus: config.approval_status,
        configuration: typeof config.configuration === 'string' 
          ? JSON.parse(config.configuration) 
          : config.configuration
      };

      console.log('📋 Service details:', {
        serviceId: userService.serviceId,
        serviceName: userService.serviceName,
        isActive: userService.isActive,
        approvalStatus: userService.approvalStatus
      });

      // Verificar que el servicio esté activo
      if (!userService.isActive) {
        console.log('❌ Service is not active');
        res.status(400).json({ 
          success: false, 
          error: 'El servicio no está activo. Actívalo primero para generar el token.' 
        });
        return;
      }

      // Verificar que el servicio esté aprobado por el administrador usando approval_status
      if (userService.approvalStatus !== 'approved') {
        console.log('❌ Service is not admin approved, status:', userService.approvalStatus);
        res.status(403).json({ 
          success: false, 
          error: userService.approvalStatus === 'pending' 
            ? 'El servicio está pendiente de aprobación por el administrador. Contacta al administrador para aprobar tu servicio.' 
            : 'El servicio no ha sido aprobado por el administrador. Contacta al administrador para aprobar tu servicio.' 
        });
        return;
      }

      const protectedToken = this.validationService.generateProtectedToken(serviceId, req.user.id, validExpirationHours);
      console.log('✅ Protected token generated successfully with expiration:', validExpirationHours, 'hours');

      res.json({
        success: true,
        data: {
          protectedToken,
          serviceId,
          userId: req.user.id,
          expirationHours: validExpirationHours,
          expiresAt: new Date(Date.now() + validExpirationHours * 60 * 60 * 1000).toISOString(),
          message: `Token protegido generado con expiración de ${validExpirationHours} horas. Este token no expone credenciales reales.`
        }
      });
    } catch (error) {
      console.error('❌ Error generating protected token:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      });
    }
  }

  // Validar token protegido
  public async validateProtectedToken(req: Request, res: Response): Promise<void> {
    try {
      const { protectedToken } = req.body;

      if (!protectedToken) {
        res.status(400).json({ success: false, error: 'Se requiere protectedToken' });
        return;
      }

      const validation = this.validationService.validateProtectedToken(protectedToken);

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('❌ Error validating protected token:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      });
    }
  }
}
