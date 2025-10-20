import { UserConfiguration, ServiceConfiguration } from '../models';

async function syncAssistantV3() {
  try {
    console.log('🔄 === SINCRONIZANDO CON CHATBOT TEST V3 ===\n');

    // 1. Obtener configuración del servicio
    const serviceConfig = await ServiceConfiguration.findOne({
      where: { serviceId: 'landing-page' }
    });
    
    if (!serviceConfig) {
      console.log('❌ No se encontró ServiceConfiguration para landing-page');
      return;
    }

    console.log('📋 ServiceConfiguration encontrada:');
    console.log(`   Assistant ID: ${serviceConfig.assistantId}`);
    console.log(`   Assistant Name: ${serviceConfig.assistantName}`);

    // 2. Actualizar UserConfiguration
    const userConfig = await UserConfiguration.findOne({
      where: { serviceId: 'landing-page' }
    });

    if (!userConfig) {
      console.log('❌ No se encontró UserConfiguration para landing-page');
      return;
    }

    console.log('\n📋 UserConfiguration antes de actualizar:');
    console.log(`   Assistant ID: ${userConfig.assistantId}`);
    console.log(`   Assistant Name: ${userConfig.assistantName}`);

    // 3. Sincronizar
    await userConfig.update({
      assistantId: serviceConfig.assistantId,
      assistantName: serviceConfig.assistantName
    });

    console.log('\n✅ UserConfiguration actualizada:');
    console.log(`   Assistant ID: ${serviceConfig.assistantId}`);
    console.log(`   Assistant Name: ${serviceConfig.assistantName}`);

    // 4. Verificar sincronización
    const updatedUserConfig = await UserConfiguration.findOne({
      where: { serviceId: 'landing-page' }
    });

    if (updatedUserConfig) {
      const serviceAssistant = serviceConfig.assistantId;
      const userAssistant = updatedUserConfig.assistantId;
      
      if (serviceAssistant === userAssistant) {
        console.log('\n✅ SINCRONIZACIÓN EXITOSA');
        console.log(`   Ambos usan: ${serviceConfig.assistantName} (${serviceAssistant})`);
      } else {
        console.log('\n❌ SINCRONIZACIÓN FALLÓ');
        console.log(`   ServiceConfiguration: ${serviceConfig.assistantName} (${serviceAssistant})`);
        console.log(`   UserConfiguration: ${updatedUserConfig.assistantName} (${userAssistant})`);
      }
    }

  } catch (error) {
    console.error('❌ Error sincronizando asistente:', error);
  }
}

// Ejecutar
syncAssistantV3().then(() => {
  console.log('\n✅ === SINCRONIZACIÓN COMPLETADA ===');
  console.log('\n💡 PRÓXIMO PASO:');
  console.log('Ejecuta el script de prueba para verificar que funciona');
}).catch(console.error);
