import { UserConfiguration, ServiceConfiguration } from '../models';

async function checkAllServices() {
  try {
    console.log('🔍 === VERIFICANDO TODOS LOS SERVICIOS ===\n');

    // Verificar servicios en UserConfiguration
    console.log('1️⃣ Servicios en UserConfiguration:');
    const userServices = await UserConfiguration.findAll();
    console.log(`📋 Total: ${userServices.length} servicios`);
    
    userServices.forEach(service => {
      const config = service.configuration as any;
      console.log(`   - ${service.serviceId}: ${service.isActive ? 'Activo' : 'Inactivo'} | Project: ${config?.projectKey || 'No configurado'} | Assistant: ${service.assistantId || 'No configurado'}`);
    });

    // Verificar servicios en ServiceConfiguration
    console.log('\n2️⃣ Servicios en ServiceConfiguration:');
    const globalServices = await ServiceConfiguration.findAll();
    console.log(`📋 Total: ${globalServices.length} servicios`);
    
    globalServices.forEach(service => {
      console.log(`   - ${service.serviceId}: ${service.isActive ? 'Activo' : 'Inactivo'} | Assistant: ${service.assistantId || 'No configurado'}`);
    });

    // Verificar conflictos de proyectos
    console.log('\n3️⃣ Verificando conflictos de proyectos:');
    const projectMap = new Map<string, string[]>();
    
    userServices.forEach(service => {
      const config = service.configuration as any;
      if (config?.projectKey) {
        if (!projectMap.has(config.projectKey)) {
          projectMap.set(config.projectKey, []);
        }
        projectMap.get(config.projectKey)!.push(service.serviceId);
      }
    });

    for (const [projectKey, services] of projectMap.entries()) {
      if (services.length > 1) {
        console.log(`⚠️ CONFLICTO: Proyecto ${projectKey} tiene múltiples servicios: ${services.join(', ')}`);
      } else {
        console.log(`✅ Proyecto ${projectKey}: ${services[0]}`);
      }
    }

  } catch (error) {
    console.error('❌ Error verificando servicios:', error);
  }
}

// Ejecutar verificación
checkAllServices().then(() => {
  console.log('\n✅ === VERIFICACIÓN COMPLETADA ===');
}).catch(console.error);
