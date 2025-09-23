#!/usr/bin/env ts-node

/**
 * Script de limpieza manual de threads
 * Uso: npm run cleanup-threads
 */

import { ThreadCleanupService } from '../src/services/thread_cleanup_service';

async function main() {
  console.log('🧹 Iniciando limpieza manual de threads...');
  
  try {
    const cleanupService = ThreadCleanupService.getInstance();
    
    // Mostrar estadísticas antes de la limpieza
    console.log('📊 Estadísticas antes de la limpieza:');
    const statsBefore = await cleanupService.getTableStats();
    console.log(statsBefore);
    
    // Ejecutar limpieza (mantener 30 días)
    await cleanupService.cleanupOldThreads(30);
    
    // Mostrar estadísticas después de la limpieza
    console.log('📊 Estadísticas después de la limpieza:');
    const statsAfter = await cleanupService.getTableStats();
    console.log(statsAfter);
    
    console.log('✅ Limpieza manual completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en limpieza manual:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}
