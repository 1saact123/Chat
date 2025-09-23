import { DatabaseService } from './database_service';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

export class ThreadCleanupService {
  private static instance: ThreadCleanupService;
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  static getInstance(): ThreadCleanupService {
    if (!ThreadCleanupService.instance) {
      ThreadCleanupService.instance = new ThreadCleanupService();
    }
    return ThreadCleanupService.instance;
  }

  /**
   * Limpia threads antiguos de la base de datos
   * @param daysToKeep Número de días a mantener (por defecto 30)
   */
  async cleanupOldThreads(daysToKeep: number = 30): Promise<void> {
    try {
      console.log(`🧹 Iniciando limpieza de threads antiguos (mantener ${daysToKeep} días)`);
      
      // Calcular fecha de corte
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      // Contar registros a eliminar
      const countResult = await sequelize.query(
        'SELECT COUNT(*) as count FROM chat_threads WHERE created_at < ?',
        {
          replacements: [cutoffDate],
          type: QueryTypes.SELECT
        }
      );
      
      const recordsToDelete = (countResult[0] as any).count;
      
      if (recordsToDelete === 0) {
        console.log('✅ No hay threads antiguos para eliminar');
        return;
      }
      
      console.log(`📊 Encontrados ${recordsToDelete} threads antiguos para eliminar`);
      
      // Eliminar threads antiguos
      const deleteResult = await sequelize.query(
        'DELETE FROM chat_threads WHERE created_at < ?',
        {
          replacements: [cutoffDate],
          type: QueryTypes.DELETE
        }
      );
      
      console.log(`✅ Limpieza completada: ${recordsToDelete} threads eliminados`);
      
      // Verificar tamaño actual de la tabla
      const currentCount = await sequelize.query(
        'SELECT COUNT(*) as count FROM chat_threads',
        {
          type: QueryTypes.SELECT
        }
      );
      
      const remainingRecords = (currentCount[0] as any).count;
      console.log(`📊 Threads restantes en BD: ${remainingRecords}`);
      
    } catch (error) {
      console.error('❌ Error en limpieza de threads:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de la tabla chat_threads
   */
  async getTableStats(): Promise<any> {
    try {
      const stats = await sequelize.query(`
        SELECT 
          COUNT(*) as total_threads,
          MIN(created_at) as oldest_thread,
          MAX(created_at) as newest_thread,
          COUNT(DISTINCT service_id) as unique_services,
          COUNT(DISTINCT issue_key) as unique_issues
        FROM chat_threads
      `, {
        type: QueryTypes.SELECT
      });
      
      return stats[0];
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return null;
    }
  }

  /**
   * Limpieza de emergencia - elimina todos los threads
   * ¡CUIDADO! Esto elimina TODOS los datos
   */
  async emergencyCleanup(): Promise<void> {
    try {
      console.log('🚨 INICIANDO LIMPIEZA DE EMERGENCIA - ELIMINANDO TODOS LOS THREADS');
      
      const result = await sequelize.query(
        'DELETE FROM chat_threads',
        {
          type: QueryTypes.DELETE
        }
      );
      
      console.log('✅ Limpieza de emergencia completada');
    } catch (error) {
      console.error('❌ Error en limpieza de emergencia:', error);
      throw error;
    }
  }
}
