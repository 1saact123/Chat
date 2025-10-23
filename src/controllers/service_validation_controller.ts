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

  // Obtener solicitudes pendientes (solo para admins)
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

      // Solo obtener solicitudes asignadas a este administrador
      const validations = await this.validationService.getPendingValidationsForAdmin(req.user.id);

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

  // Aprobar solicitud de validación (solo para admins)
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
        res.status(400).json({ success: false, error: 'ID de validación inválido' });
        return;
      }

      const validation = await this.validationService.approveValidation(
        Number(id), 
        req.user.id, 
        adminNotes
      );

      res.json({
        success: true,
        message: `Solicitud de validación aprobada exitosamente. CORS configurado automáticamente para el dominio: ${validation.requestedDomain}`,
        data: validation
      });
    } catch (error) {
      console.error('❌ Error approving validation:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      });
    }
  }

  // Rechazar solicitud de validación (solo para admins)
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
        res.status(400).json({ success: false, error: 'ID de validación inválido' });
        return;
      }

      if (!adminNotes || adminNotes.trim().length === 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Se requieren notas del administrador para rechazar la solicitud' 
        });
        return;
      }

      const validation = await this.validationService.rejectValidation(
        Number(id), 
        req.user.id, 
        adminNotes
      );

      res.json({
        success: true,
        message: 'Solicitud de validación rechazada.',
        data: validation
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
        WHERE user_id = ? AND service_id = ? AND is_active = TRUE
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
        configuration: typeof config.configuration === 'string' 
          ? JSON.parse(config.configuration) 
          : config.configuration
      };

      console.log('📋 Service details:', {
        serviceId: userService.serviceId,
        serviceName: userService.serviceName,
        isActive: userService.isActive,
        adminApproved: userService.configuration?.adminApproved
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

      // Verificar que el servicio esté aprobado por el administrador
      const isAdminApproved = userService.configuration?.adminApproved;
      if (!isAdminApproved) {
        console.log('❌ Service is not admin approved');
        res.status(403).json({ 
          success: false, 
          error: 'El servicio no ha sido aprobado por el administrador. Contacta al administrador para aprobar tu servicio.' 
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
