import { getUserConfigurations } from './migrate_to_unified_table';

async function testApiUnified() {
  try {
    console.log('🧪 === PROBANDO API CON TABLA UNIFICADA ===\n');

    // 1. Probar configuraciones del usuario 1 (admin)
    console.log('1️⃣ Probando configuraciones del usuario 1 (admin)...');
    const user1Configs = await getUserConfigurations(1);
    console.log(`📋 Usuario 1 tiene ${user1Configs.length} configuraciones:`);
    user1Configs.forEach((config: any) => {
      console.log(`   - ${config.service_name}: ${config.assistant_name} (Activo: ${config.is_active})`);
    });

    // 2. Probar configuraciones del usuario 10
    console.log('\n2️⃣ Probando configuraciones del usuario 10...');
    const user10Configs = await getUserConfigurations(10);
    console.log(`📋 Usuario 10 tiene ${user10Configs.length} configuraciones:`);
    user10Configs.forEach((config: any) => {
      console.log(`   - ${config.service_name}: ${config.assistant_name} (Activo: ${config.is_active})`);
    });

    // 3. Probar configuraciones del usuario 11
    console.log('\n3️⃣ Probando configuraciones del usuario 11...');
    const user11Configs = await getUserConfigurations(11);
    console.log(`📋 Usuario 11 tiene ${user11Configs.length} configuraciones:`);
    user11Configs.forEach((config: any) => {
      console.log(`   - ${config.service_name}: ${config.assistant_name} (Activo: ${config.is_active})`);
    });

    // 4. Simular dashboard de usuario
    console.log('\n4️⃣ Simulando dashboard de usuario...');
    const { sequelize } = await import('../config/database');
    
    // Simular diferentes usuarios accediendo a sus dashboards
    const testUsers = [1, 10, 11];
    
    for (const userId of testUsers) {
      console.log(`\n👤 Dashboard del Usuario ${userId}:`);
      const [userServices] = await sequelize.query(`
        SELECT * FROM unified_configurations 
        WHERE user_id = ? AND is_active = TRUE
        ORDER BY service_name
      `, {
        replacements: [userId]
      });
      
      console.log(`   📊 Servicios activos: ${userServices.length}`);
      userServices.forEach((service: any) => {
        let config = {};
        try {
          config = service.configuration ? JSON.parse(service.configuration) : {};
        } catch (e) {
          config = service.configuration || {};
        }
        console.log(`   - ${service.service_name}: ${service.assistant_name} (Proyecto: ${(config as any).projectKey || 'No configurado'})`);
      });
    }

    console.log('\n✅ === PRUEBA DE API COMPLETADA ===');

  } catch (error) {
    console.error('❌ Error en prueba de API:', error);
  }
}

// Ejecutar prueba
if (require.main === module) {
  testApiUnified().then(() => {
    console.log('\n🎯 === PRUEBA DE API FINALIZADA ===');
  }).catch(console.error);
}

export { testApiUnified };
