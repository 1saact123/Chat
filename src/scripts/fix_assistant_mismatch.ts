import { UserConfiguration, ServiceConfiguration } from '../models';

async function fixAssistantMismatch() {
  try {
    console.log('🔧 === ARREGLANDO DISCREPANCIA DE ASISTENTES ===\n');

    // 1. Verificar configuraciones actuales
    console.log('1️⃣ Verificando configuraciones actuales...');
    
    const serviceConfig = await ServiceConfiguration.findOne({
      where: { serviceId: 'landing-page' }
    });
    
    const userConfig = await UserConfiguration.findOne({
      where: { serviceId: 'landing-page' }
    });

    if (serviceConfig) {
      console.log('📋 ServiceConfiguration:');
      console.log(`   Assistant ID: ${serviceConfig.assistantId}`);
      console.log(`   Assistant Name: ${serviceConfig.assistantName}`);
    }

    if (userConfig) {
      console.log('📋 UserConfiguration:');
      console.log(`   Assistant ID: ${userConfig.assistantId}`);
      console.log(`   Assistant Name: ${userConfig.assistantName}`);
    }

    // 2. Sincronizar UserConfiguration con ServiceConfiguration
    if (serviceConfig && userConfig) {
      console.log('\n2️⃣ Sincronizando UserConfiguration con ServiceConfiguration...');
      
      await userConfig.update({
        assistantId: serviceConfig.assistantId,
        assistantName: serviceConfig.assistantName
      });
      
      console.log('✅ UserConfiguration actualizado:');
      console.log(`   Assistant ID: ${serviceConfig.assistantId}`);
      console.log(`   Assistant Name: ${serviceConfig.assistantName}`);
    }

    // 3. Verificar configuración final
    console.log('\n3️⃣ Verificando configuración final...');
    
    const finalUserConfig = await UserConfiguration.findOne({
      where: { serviceId: 'landing-page' }
    });
    
    const finalServiceConfig = await ServiceConfiguration.findOne({
      where: { serviceId: 'landing-page' }
    });

    if (finalUserConfig && finalServiceConfig) {
      const userAssistant = finalUserConfig.assistantId;
      const serviceAssistant = finalServiceConfig.assistantId;
      
      if (userAssistant === serviceAssistant) {
        console.log('✅ CONFIGURACIONES SINCRONIZADAS:');
        console.log(`   Assistant ID: ${userAssistant}`);
        console.log(`   Assistant Name: ${finalUserConfig.assistantName}`);
      } else {
        console.log('❌ CONFIGURACIONES AÚN DESINCRONIZADAS:');
        console.log(`   UserConfiguration: ${userAssistant}`);
        console.log(`   ServiceConfiguration: ${serviceAssistant}`);
      }
    }

  } catch (error) {
    console.error('❌ Error arreglando discrepancia:', error);
  }
}

// Ejecutar
fixAssistantMismatch().then(() => {
  console.log('\n✅ === SINCRONIZACIÓN COMPLETADA ===');
  console.log('\n💡 PRÓXIMO PASO:');
  console.log('Reinicia el servidor para que cargue las nuevas configuraciones');
  console.log('O ejecuta un script para forzar la recarga de configuraciones');
}).catch(console.error);
