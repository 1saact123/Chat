import { DatabaseService } from '../services/database_service';
import { UserConfiguration, ServiceConfiguration } from '../models';

async function addBDMToGlobalSystem() {
  try {
    console.log('🔧 === AGREGANDO SERVICIO BDM AL SISTEMA GLOBAL ===\n');

    const dbService = DatabaseService.getInstance();
    
    // Obtener la configuración del servicio BDM del sistema de usuario
    const bdmUserService = await UserConfiguration.findOne({
      where: {
        serviceId: 'bdm-service'
      }
    });

    if (!bdmUserService) {
      console.log('❌ No se encontró el servicio BDM en UserConfiguration');
      return;
    }

    console.log('✅ Servicio BDM encontrado en UserConfiguration:');
    console.log(`   Service ID: ${bdmUserService.serviceId}`);
    console.log(`   Service Name: ${bdmUserService.serviceName}`);
    console.log(`   Assistant ID: ${bdmUserService.assistantId}`);
    console.log(`   Assistant Name: ${bdmUserService.assistantName}`);
    console.log(`   Is Active: ${bdmUserService.isActive}`);

    // Verificar si ya existe en el sistema global
    const existingGlobalService = await ServiceConfiguration.findOne({
      where: {
        serviceId: 'bdm-service'
      }
    });

    if (existingGlobalService) {
      console.log('⚠️ El servicio BDM ya existe en el sistema global');
      console.log('📋 Configuración actual:', {
        serviceId: existingGlobalService.serviceId,
        serviceName: existingGlobalService.serviceName,
        assistantId: existingGlobalService.assistantId,
        assistantName: existingGlobalService.assistantName,
        isActive: existingGlobalService.isActive
      });
      
      // Actualizar la configuración existente
      await existingGlobalService.update({
        assistantId: bdmUserService.assistantId,
        assistantName: bdmUserService.assistantName,
        isActive: bdmUserService.isActive
      });
      
      console.log('✅ Configuración global actualizada');
    } else {
      // Crear nueva configuración en el sistema global
      await ServiceConfiguration.create({
        serviceId: bdmUserService.serviceId,
        serviceName: bdmUserService.serviceName,
        assistantId: bdmUserService.assistantId,
        assistantName: bdmUserService.assistantName,
        isActive: bdmUserService.isActive
      });
      
      console.log('✅ Servicio BDM agregado al sistema global');
    }

    // Verificar la configuración final
    console.log('\n🔍 Verificando configuración final...');
    const finalConfig = await ServiceConfiguration.findOne({
      where: {
        serviceId: 'bdm-service'
      }
    });

    if (finalConfig) {
      console.log('📋 Configuración final en sistema global:');
      console.log({
        serviceId: finalConfig.serviceId,
        serviceName: finalConfig.serviceName,
        assistantId: finalConfig.assistantId,
        assistantName: finalConfig.assistantName,
        isActive: finalConfig.isActive
      });
    }

  } catch (error) {
    console.error('❌ Error agregando servicio BDM al sistema global:', error);
  }
}

// Ejecutar
addBDMToGlobalSystem().then(() => {
  console.log('\n✅ === CONFIGURACIÓN COMPLETADA ===');
  console.log('\n💡 PRÓXIMO PASO:');
  console.log('Ahora el servicio BDM debería funcionar con el endpoint:');
  console.log('POST https://chat.movonte.com/api/services/bdm-service/chat');
}).catch(console.error);
