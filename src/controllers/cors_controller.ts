import { Request, Response } from 'express';
import { CorsService } from '../services/cors_service';

export class CorsController {
  /**
   * Obtener estadísticas de CORS
   */
  public async getStats(req: Request, res: Response): Promise<void> {
    try {
      const corsService = CorsService.getInstance();
      const stats = corsService.getStats();

      res.json({
        success: true,
        data: {
          ...stats,
          message: 'CORS configurado dinámicamente desde base de datos'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas de CORS:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Forzar recarga de CORS desde la base de datos
   */
  public async forceReload(req: Request, res: Response): Promise<void> {
    try {
      // Solo admin puede forzar recarga
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requieren permisos de administrador'
        });
        return;
      }

      const corsService = CorsService.getInstance();
      await corsService.forceReload();

      const stats = corsService.getStats();

      res.json({
        success: true,
        message: 'CORS recargado exitosamente desde la base de datos',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error forzando recarga de CORS:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Agregar dominio manualmente
   */
  public async addDomain(req: Request, res: Response): Promise<void> {
    try {
      // Solo admin puede agregar dominios
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requieren permisos de administrador'
        });
        return;
      }

      const { domain } = req.body;

      if (!domain) {
        res.status(400).json({
          success: false,
          error: 'El dominio es requerido'
        });
        return;
      }

      const corsService = CorsService.getInstance();
      await corsService.addApprovedDomain(domain);

      res.json({
        success: true,
        message: `Dominio '${domain}' agregado exitosamente a CORS`,
        data: corsService.getStats(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error agregando dominio a CORS:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  /**
   * Remover dominio
   */
  public async removeDomain(req: Request, res: Response): Promise<void> {
    try {
      // Solo admin puede remover dominios
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requieren permisos de administrador'
        });
        return;
      }

      const { domain } = req.params;

      if (!domain) {
        res.status(400).json({
          success: false,
          error: 'El dominio es requerido'
        });
        return;
      }

      const corsService = CorsService.getInstance();
      corsService.removeDomain(domain);

      res.json({
        success: true,
        message: `Dominio '${domain}' removido exitosamente de CORS`,
        data: corsService.getStats(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error removiendo dominio de CORS:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}


