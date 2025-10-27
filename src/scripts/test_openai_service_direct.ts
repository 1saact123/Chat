import { OpenAIService } from '../services/openAI_service';
import { ConfigurationService } from '../services/configuration_service';

async function testOpenAIServiceDirect() {
  try {
    console.log('🧪 === PROBANDO OPENAI SERVICE DIRECTAMENTE ===\n');

    // Forzar recarga de configuraciones
    console.log('1️⃣ Forzando recarga de configuraciones...');
    const configService = ConfigurationService.getInstance();
    const configServiceAny = configService as any;
    await configServiceAny.loadConfigurationsFromDatabase();
    
    // Verificar configuración
    console.log('\n2️⃣ Verificando configuración...');
    const bdmConfig = configService.getServiceConfiguration('bdm-service');
    const bdmAssistant = configService.getActiveAssistantForService('bdm-service');
    
    console.log(`📋 Service Configuration:`, bdmConfig);
    console.log(`🤖 Active Assistant ID: ${bdmAssistant || 'null'}`);
    
    if (!bdmAssistant) {
      console.log('❌ No se puede continuar sin assistant ID');
      return;
    }

    // Crear instancia de OpenAIService
    console.log('\n3️⃣ Creando instancia de OpenAIService...');
    const openaiService = new OpenAIService();
    
    // Probar processChatForService directamente
    console.log('\n4️⃣ Probando processChatForService...');
    const result = await openaiService.processChatForService(
      'Hola, soy un test directo del servicio BDM. ¿Puedes confirmar que estás funcionando correctamente?',
      'bdm-service',
      'test-direct-thread-123'
    );
    
    console.log('\n5️⃣ Resultado:');
    console.log(`✅ Success: ${result.success}`);
    if (result.success) {
      console.log(`📝 Response: ${result.response?.substring(0, 200)}...`);
      console.log(`🧵 Thread ID: ${result.threadId}`);
      console.log(`🤖 Assistant ID: ${result.assistantId}`);
      console.log(`📛 Assistant Name: ${result.assistantName}`);
    } else {
      console.log(`❌ Error: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Error probando OpenAIService:', error);
  }
}

// Ejecutar prueba
testOpenAIServiceDirect().then(() => {
  console.log('\n✅ === PRUEBA COMPLETADA ===');
}).catch(console.error);






