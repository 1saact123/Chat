#!/usr/bin/env ts-node

/**
 * Script de diagnóstico para verificar la configuración de asistentes
 */

import { ConfigurationService } from '../src/services/configuration_service';
import { DatabaseService } from '../src/services/database_service';

async function debugAssistantConfig(): Promise<void> {
  console.log('🔍 Iniciando diagnóstico de configuración de asistentes...\n');
  
  try {
    // 1. Verificar ConfigurationService
    console.log('1️⃣ Verificando ConfigurationService...');
    const configService = ConfigurationService.getInstance();
    
    // Obtener todas las configuraciones
    const allConfigs = configService.getAllConfigurations();
    console.log(`📊 Total configuraciones cargadas: ${allConfigs.length}`);
    
    for (const config of allConfigs) {
      console.log(`  - ${config.serviceId}: ${config.assistantName} (${config.assistantId}) - Active: ${config.isActive}`);
    }
    
    // 2. Verificar asistente para landing-page
    console.log('\n2️⃣ Verificando asistente para landing-page...');
    const landingPageAssistant = configService.getActiveAssistantForService('landing-page');
    console.log(`🎯 Asistente activo para landing-page: ${landingPageAssistant || 'NO ENCONTRADO'}`);
    
    // 3. Verificar base de datos directamente
    console.log('\n3️⃣ Verificando base de datos directamente...');
    const dbService = DatabaseService.getInstance();
    const dbConfigs = await dbService.getAllServiceConfigs();
    
    console.log(`📊 Configuraciones en BD: ${dbConfigs.length}`);
    for (const dbConfig of dbConfigs) {
      console.log(`  - ${dbConfig.serviceId}: ${dbConfig.assistantName} (${dbConfig.assistantId}) - Active: ${dbConfig.isActive}`);
    }
    
    // 4. Verificar variables de entorno
    console.log('\n4️⃣ Verificando variables de entorno...');
    console.log(`OPENAI_ASSISTANT_ID: ${process.env.OPENAI_ASSISTANT_ID || 'NO CONFIGURADO'}`);
    console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
    
    // 5. Recargar configuraciones
    console.log('\n5️⃣ Recargando configuraciones desde BD...');
    await configService.reloadConfigurationsFromDatabase();
    
    // Verificar nuevamente
    const reloadedAssistant = configService.getActiveAssistantForService('landing-page');
    console.log(`🔄 Asistente después de recargar: ${reloadedAssistant || 'NO ENCONTRADO'}`);
    
    console.log('\n✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  debugAssistantConfig().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

export { debugAssistantConfig };
