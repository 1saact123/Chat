import { ConfigurationService } from '../services/configuration_service';

async function debugConfigurationService() {
  try {
    console.log('🔍 === DEBUGGEANDO CONFIGURATION SERVICE ===\n');

    const configService = ConfigurationService.getInstance();
    
    // Verificar configuración del servicio BDM
    console.log('1️⃣ Verificando configuración del servicio BDM...');
    
    const serviceConfig = configService.getServiceConfiguration('bdm-service');
    console.log('📋 Service Configuration:', serviceConfig);
    
    const assistantId = configService.getActiveAssistantForService('bdm-service');
    console.log('🤖 Active Assistant ID:', assistantId);
    
    // Verificar servicios específicos
    console.log('\n2️⃣ Verificando servicios específicos...');
    
    const testServices = ['bdm-service', 'landing-page', 'test-nuevo', 'movonte-remote'];
    
    testServices.forEach(serviceId => {
      const config = configService.getServiceConfiguration(serviceId);
      const assistantId = configService.getActiveAssistantForService(serviceId);
      console.log(`   - ${serviceId}: ${config?.isActive ? 'Activo' : 'Inactivo'} | Assistant: ${assistantId || 'No configurado'}`);
    });

  } catch (error) {
    console.error('❌ Error debuggeando ConfigurationService:', error);
  }
}

// Ejecutar debug
debugConfigurationService().then(() => {
  console.log('\n✅ === DEBUG COMPLETADO ===');
}).catch(console.error);
