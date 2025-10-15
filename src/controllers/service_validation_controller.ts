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

      const validationRequest: ServiceValidationRequest = {
        serviceName,
        serviceDescription,
        websiteUrl,
        requestedDomain
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

      const validations = await this.validationService.getPendingValidations();

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
        message: 'Solicitud de validación aprobada exitosamente. CORS configurado automáticamente.',
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
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Usuario no autenticado' });
        return;
      }

      const { serviceId } = req.body;

      if (!serviceId) {
        res.status(400).json({ success: false, error: 'Se requiere serviceId' });
        return;
      }

      // Verificar que el usuario tenga acceso al servicio
      const userConfigService = this.validationService.getUserConfigurationService(req.user.id);
      const userServices = userConfigService.getAllServiceConfigurations();
      
      const userService = userServices.find(service => service.serviceId === serviceId);
      if (!userService) {
        res.status(403).json({ 
          success: false, 
          error: 'No tienes acceso a este servicio o el servicio no existe' 
        });
        return;
      }

      // Verificar que el servicio esté activo
      if (!userService.isActive) {
        res.status(400).json({ 
          success: false, 
          error: 'El servicio no está activo. Actívalo primero para generar el token.' 
        });
        return;
      }

      const protectedToken = this.validationService.generateProtectedToken(serviceId, req.user.id);

      res.json({
        success: true,
        data: {
          protectedToken,
          serviceId,
          userId: req.user.id,
          message: 'Token protegido generado. Este token no expone credenciales reales.'
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
