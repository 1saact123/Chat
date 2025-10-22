import { ConfigurationService } from '../services/configuration_service';

async function debugConfigurationMap() {
  try {
    console.log('🔍 === DEBUGGEANDO MAP DE CONFIGURACIONES ===\n');

    const configService = ConfigurationService.getInstance();
    
    // Acceder al Map de configuraciones (usando any para acceder a propiedades privadas)
    const configServiceAny = configService as any;
    const configurationsMap = configServiceAny.configurations;
    
    console.log('📋 Contenido del Map de configuraciones:');
    console.log(`   Tamaño del Map: ${configurationsMap.size}`);
    
    // Iterar sobre todas las configuraciones
    for (const [serviceId, config] of configurationsMap.entries()) {
      console.log(`   - ${serviceId}: ${config.isActive ? 'Activo' : 'Inactivo'} | Assistant: ${config.assistantId || 'No configurado'}`);
    }
    
    // Verificar específicamente bdm-service
    console.log('\n🔍 Verificando bdm-service específicamente:');
    const bdmConfig = configurationsMap.get('bdm-service');
    if (bdmConfig) {
      console.log('✅ bdm-service encontrado en Map:');
      console.log(`   Service ID: ${bdmConfig.serviceId}`);
      console.log(`   Service Name: ${bdmConfig.serviceName}`);
      console.log(`   Assistant ID: ${bdmConfig.assistantId}`);
      console.log(`   Assistant Name: ${bdmConfig.assistantName}`);
      console.log(`   Is Active: ${bdmConfig.isActive}`);
    } else {
      console.log('❌ bdm-service NO encontrado en Map');
    }
    
    // Probar el método getActiveAssistantForService
    console.log('\n🔍 Probando getActiveAssistantForService:');
    const assistantId = configService.getActiveAssistantForService('bdm-service');
    console.log(`   Resultado: ${assistantId || 'null'}`);
    
    // Probar con otros servicios
    console.log('\n🔍 Probando con otros servicios:');
    const landingAssistant = configService.getActiveAssistantForService('landing-page');
    console.log(`   landing-page: ${landingAssistant || 'null'}`);
    
    const webhookAssistant = configService.getActiveAssistantForService('webhook-parallel');
    console.log(`   webhook-parallel: ${webhookAssistant || 'null'}`);

  } catch (error) {
    console.error('❌ Error debuggeando Map:', error);
  }
}

// Ejecutar debug
debugConfigurationMap().then(() => {
  console.log('\n✅ === DEBUG COMPLETADO ===');
}).catch(console.error);


