import { getUnifiedConfiguration } from './migrate_to_unified_table';

async function testUnifiedWebhook() {
  try {
    console.log('🧪 === PROBANDO WEBHOOK CON TABLA UNIFICADA ===\n');

    // 1. Probar configuración landing-page para usuario 1
    console.log('1️⃣ Probando configuración landing-page para usuario 1...');
    const landingPageConfig = await getUnifiedConfiguration('landing-page', 1);
    
    if (landingPageConfig) {
      console.log('✅ Configuración encontrada:');
      console.log(`   Servicio: ${landingPageConfig.service_name}`);
      console.log(`   Usuario: ${landingPageConfig.user_id}`);
      console.log(`   Asistente: ${landingPageConfig.assistant_name} (${landingPageConfig.assistant_id})`);
      console.log(`   Activo: ${landingPageConfig.is_active}`);
      console.log(`   Configuración: ${JSON.stringify(landingPageConfig.configuration, null, 2)}`);
    } else {
      console.log('❌ No se encontró configuración para landing-page');
    }

    // 2. Probar configuración que no existe
    console.log('\n2️⃣ Probando configuración inexistente...');
    const nonExistentConfig = await getUnifiedConfiguration('non-existent', 1);
    
    if (nonExistentConfig) {
      console.log('❌ Se encontró configuración que no debería existir');
    } else {
      console.log('✅ Correctamente no se encontró configuración inexistente');
    }

    // 3. Probar configuración para usuario diferente
    console.log('\n3️⃣ Probando configuración para usuario 10...');
    const user10Config = await getUnifiedConfiguration('test', 10);
    
    if (user10Config) {
      console.log('✅ Configuración encontrada para usuario 10:');
      console.log(`   Servicio: ${user10Config.service_name}`);
      console.log(`   Usuario: ${user10Config.user_id}`);
      console.log(`   Asistente: ${user10Config.assistant_name} (${user10Config.assistant_id})`);
      console.log(`   Activo: ${user10Config.is_active}`);
    } else {
      console.log('❌ No se encontró configuración para usuario 10');
    }

    // 4. Simular búsqueda por proyecto (como hace el webhook)
    console.log('\n4️⃣ Simulando búsqueda por proyecto TI...');
    const { sequelize } = await import('../config/database');
    
    const [tiServices] = await sequelize.query(`
      SELECT * FROM unified_configurations 
      WHERE is_active = TRUE
    `);
    
    console.log(`📋 Servicios activos encontrados: ${tiServices.length}`);
    
    for (const service of tiServices as any[]) {
      let config = {};
      try {
        config = service.configuration ? JSON.parse(service.configuration) : {};
      } catch (e) {
        config = service.configuration || {};
      }
      console.log(`   - ${service.service_name}: ${service.assistant_name} (Usuario ${service.user_id}) - Proyecto: ${(config as any).projectKey || 'No configurado'}`);
    }

    console.log('\n✅ === PRUEBA COMPLETADA ===');

  } catch (error) {
    console.error('❌ Error en prueba:', error);
  }
}

// Ejecutar prueba
if (require.main === module) {
  testUnifiedWebhook().then(() => {
    console.log('\n🎯 === PRUEBA FINALIZADA ===');
  }).catch(console.error);
}

export { testUnifiedWebhook };
