import { sequelize } from '../config/database';

async function testPendingServices() {
  try {
    console.log('🔍 Verificando servicios pendientes de aprobación...');

    // Verificar servicios del usuario 12 (que tiene un servicio pendiente)
    console.log('\n📊 Servicios del usuario 12:');
    const [user12Services] = await sequelize.query(`
      SELECT 
        service_id,
        service_name,
        is_active,
        configuration
      FROM unified_configurations 
      WHERE user_id = 12
      ORDER BY service_name
    `);

    console.log('Resultado:', user12Services);

    // Verificar servicios del usuario 11
    console.log('\n📊 Servicios del usuario 11:');
    const [user11Services] = await sequelize.query(`
      SELECT 
        service_id,
        service_name,
        is_active,
        configuration
      FROM unified_configurations 
      WHERE user_id = 11
      ORDER BY service_name
    `);

    console.log('Resultado:', user11Services);

    // Verificar todos los servicios pendientes (is_active = false)
    console.log('\n📊 Todos los servicios pendientes:');
    const [pendingServices] = await sequelize.query(`
      SELECT 
        user_id,
        service_id,
        service_name,
        is_active,
        configuration
      FROM unified_configurations 
      WHERE is_active = false
      ORDER BY user_id, service_name
    `);

    console.log('Servicios pendientes:', pendingServices);

    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

testPendingServices();
