import { sequelize } from '../config/database';

async function checkServiceExists() {
  try {
    console.log('🔍 Verificando si el servicio testing-remote existe...');

    // Verificar si el servicio existe
    const [services] = await sequelize.query(`
      SELECT 
        user_id,
        service_id,
        service_name,
        is_active,
        configuration
      FROM unified_configurations 
      WHERE service_id = 'testing-remote'
    `);

    console.log('📊 Servicios encontrados:');
    console.table(services);

    if (services.length === 0) {
      console.log('⚠️ El servicio testing-remote no existe');
    } else {
      console.log('✅ El servicio testing-remote existe');
    }

    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkServiceExists();

