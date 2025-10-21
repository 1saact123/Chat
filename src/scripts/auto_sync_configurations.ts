import { UserConfiguration, ServiceConfiguration } from '../models';

async function autoSyncConfigurations() {
  try {
    console.log('🔄 === SINCRONIZACIÓN AUTOMÁTICA DE CONFIGURACIONES ===\n');

    // 1. Obtener todas las configuraciones de ServiceConfiguration
    const serviceConfigs = await ServiceConfiguration.findAll();
    
    console.log(`📋 Encontradas ${serviceConfigs.length} configuraciones de servicio`);

    for (const serviceConfig of serviceConfigs) {
      console.log(`\n🔍 Procesando servicio: ${serviceConfig.serviceId}`);
      
      // 2. Buscar UserConfiguration correspondiente
      const userConfig = await UserConfiguration.findOne({
        where: { serviceId: serviceConfig.serviceId }
      });

      if (userConfig) {
        // 3. Verificar si están sincronizados
        if (serviceConfig.assistantId !== userConfig.assistantId) {
          console.log(`❌ DESINCRONIZACIÓN DETECTADA:`);
          console.log(`   ServiceConfiguration: ${serviceConfig.assistantName} (${serviceConfig.assistantId})`);
          console.log(`   UserConfiguration: ${userConfig.assistantName} (${userConfig.assistantId})`);
          
          // 4. Sincronizar UserConfiguration con ServiceConfiguration
          await userConfig.update({
            assistantId: serviceConfig.assistantId,
            assistantName: serviceConfig.assistantName,
            lastUpdated: new Date()
          });
          
          console.log(`✅ SINCRONIZADO: UserConfiguration actualizada con ${serviceConfig.assistantName}`);
        } else {
          console.log(`✅ YA SINCRONIZADO: ${serviceConfig.assistantName}`);
        }
      } else {
        console.log(`⚠️ No se encontró UserConfiguration para ${serviceConfig.serviceId}`);
      }
    }

    console.log('\n🎯 === SINCRONIZACIÓN COMPLETADA ===');

  } catch (error) {
    console.error('❌ Error en sincronización automática:', error);
  }
}

// Función para sincronizar un servicio específico
export async function syncSpecificService(serviceId: string): Promise<boolean> {
  try {
    console.log(`🔄 Sincronizando servicio específico: ${serviceId}`);

    const serviceConfig = await ServiceConfiguration.findOne({
      where: { serviceId }
    });

    if (!serviceConfig) {
      console.log(`❌ No se encontró ServiceConfiguration para ${serviceId}`);
      return false;
    }

    const userConfig = await UserConfiguration.findOne({
      where: { serviceId }
    });

    if (!userConfig) {
      console.log(`❌ No se encontró UserConfiguration para ${serviceId}`);
      return false;
    }

    // Sincronizar
    await userConfig.update({
      assistantId: serviceConfig.assistantId,
      assistantName: serviceConfig.assistantName,
      lastUpdated: new Date()
    });

    console.log(`✅ Servicio ${serviceId} sincronizado: ${serviceConfig.assistantName}`);
    return true;

  } catch (error) {
    console.error(`❌ Error sincronizando servicio ${serviceId}:`, error);
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  autoSyncConfigurations().then(() => {
    console.log('\n✅ === PROCESO COMPLETADO ===');
  }).catch(console.error);
}

export { autoSyncConfigurations };
