import { UserConfiguration, ServiceConfiguration } from '../models';

async function checkCurrentAssistant() {
  try {
    console.log('🔍 === VERIFICANDO ASISTENTE ACTUAL ===\n');

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
      console.log(`   Last Updated: ${serviceConfig.lastUpdated}`);
    }

    if (userConfig) {
      console.log('📋 UserConfiguration:');
      console.log(`   Assistant ID: ${userConfig.assistantId}`);
      console.log(`   Assistant Name: ${userConfig.assistantName}`);
      console.log(`   Last Updated: ${userConfig.lastUpdated}`);
    }

    // 2. Verificar si están sincronizados
    if (serviceConfig && userConfig) {
      const serviceAssistant = serviceConfig.assistantId;
      const userAssistant = userConfig.assistantId;
      
      console.log('\n2️⃣ Comparación:');
      if (serviceAssistant === userAssistant) {
        console.log('✅ CONFIGURACIONES SINCRONIZADAS');
        console.log(`   Ambos usan: ${serviceConfig.assistantName} (${serviceAssistant})`);
      } else {
        console.log('❌ CONFIGURACIONES DESINCRONIZADAS');
        console.log(`   ServiceConfiguration: ${serviceConfig.assistantName} (${serviceAssistant})`);
        console.log(`   UserConfiguration: ${userConfig.assistantName} (${userAssistant})`);
        
        // Mostrar fechas de actualización
        console.log('\n📅 Fechas de actualización:');
        console.log(`   ServiceConfiguration: ${serviceConfig.lastUpdated}`);
        console.log(`   UserConfiguration: ${userConfig.lastUpdated}`);
      }
    }

  } catch (error) {
    console.error('❌ Error verificando asistente:', error);
  }
}

// Ejecutar
checkCurrentAssistant().then(() => {
  console.log('\n✅ === VERIFICACIÓN COMPLETADA ===');
}).catch(console.error);
