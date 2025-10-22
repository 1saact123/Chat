import { UserConfiguration, ServiceConfiguration } from '../models';

async function fixServiceConflicts() {
  try {
    console.log('🔧 === ARREGLANDO CONFLICTOS DE SERVICIOS ===\n');

    // 1. Eliminar servicios innecesarios de UserConfiguration
    console.log('1️⃣ Eliminando servicios innecesarios de UserConfiguration...');
    
    const servicesToDelete = ['test-nuevo ', 'movonte-remote', 'bdm-service'];
    
    for (const serviceId of servicesToDelete) {
      const service = await UserConfiguration.findOne({
        where: { serviceId: serviceId }
      });
      
      if (service) {
        await service.destroy();
        console.log(`✅ Eliminado: ${serviceId}`);
      } else {
        console.log(`⚠️ No encontrado: ${serviceId}`);
      }
    }

    // 2. Eliminar servicios innecesarios de ServiceConfiguration
    console.log('\n2️⃣ Eliminando servicios innecesarios de ServiceConfiguration...');
    
    const globalServicesToDelete = ['bdm-service', 'cors-domain-nuevo.remote.com', 'cors-domain-form.movonte.com', 'cors-domain-jira.test.com'];
    
    for (const serviceId of globalServicesToDelete) {
      const service = await ServiceConfiguration.findOne({
        where: { serviceId: serviceId }
      });
      
      if (service) {
        await service.destroy();
        console.log(`✅ Eliminado: ${serviceId}`);
      } else {
        console.log(`⚠️ No encontrado: ${serviceId}`);
      }
    }

    // 3. Configurar landing-page para proyecto TI
    console.log('\n3️⃣ Configurando landing-page para proyecto TI...');
    
    // Buscar el usuario que tiene el servicio landing-page
    const landingPageService = await ServiceConfiguration.findOne({
      where: { serviceId: 'landing-page' }
    });
    
    if (landingPageService) {
      // Crear configuración en UserConfiguration para landing-page
      const existingUserService = await UserConfiguration.findOne({
        where: { serviceId: 'landing-page' }
      });
      
      if (!existingUserService) {
        // Crear nuevo servicio de usuario para landing-page
        await UserConfiguration.create({
          userId: 1, // Usar el primer usuario (admin)
          serviceId: 'landing-page',
          serviceName: 'Landing Page',
          assistantId: landingPageService.assistantId,
          assistantName: landingPageService.assistantName,
          isActive: true,
          configuration: {
            projectKey: 'TI',
            adminApproved: true,
            adminApprovedAt: new Date().toISOString()
          }
        });
        console.log('✅ Creado servicio de usuario para landing-page con proyecto TI');
      } else {
        // Actualizar configuración existente
        const config = existingUserService.configuration as any || {};
        await existingUserService.update({
          configuration: {
            ...config,
            projectKey: 'TI',
            adminApproved: true,
            adminApprovedAt: new Date().toISOString()
          }
        });
        console.log('✅ Actualizado servicio landing-page para proyecto TI');
      }
    }

    // 4. Verificar configuración final
    console.log('\n4️⃣ Verificando configuración final...');
    
    const finalUserServices = await UserConfiguration.findAll();
    console.log('📋 Servicios en UserConfiguration:');
    finalUserServices.forEach(service => {
      const config = service.configuration as any;
      console.log(`   - ${service.serviceId}: ${service.isActive ? 'Activo' : 'Inactivo'} | Project: ${config?.projectKey || 'No configurado'}`);
    });
    
    const finalGlobalServices = await ServiceConfiguration.findAll({
      where: {
        serviceId: ['landing-page', 'webhook-parallel']
      }
    });
    console.log('\n📋 Servicios en ServiceConfiguration:');
    finalGlobalServices.forEach(service => {
      console.log(`   - ${service.serviceId}: ${service.isActive ? 'Activo' : 'Inactivo'}`);
    });

  } catch (error) {
    console.error('❌ Error arreglando conflictos:', error);
  }
}

// Ejecutar
fixServiceConflicts().then(() => {
  console.log('\n✅ === CONFLICTOS ARREGLADOS ===');
  console.log('\n💡 RESULTADO:');
  console.log('- Solo quedan landing-page y webhook-parallel');
  console.log('- landing-page está configurado para proyecto TI');
  console.log('- Se eliminaron todos los servicios innecesarios');
}).catch(console.error);




