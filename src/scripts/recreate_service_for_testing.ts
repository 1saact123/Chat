import { sequelize } from '../config/database';

async function recreateServiceForTesting() {
  try {
    console.log('🔍 Recreando servicio para pruebas...');

    const serviceId = 'testing-remote';
    const userId = 12;

    // Insertar el servicio de nuevo
    await sequelize.query(`
      INSERT INTO unified_configurations
      (service_id, service_name, user_id, assistant_id, assistant_name, is_active, configuration, last_updated, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
    `, {
      replacements: [
        serviceId,
        'test-remoto',
        userId,
        'asst_UV1zfpkWRdj3ErxLzl7aDlxc',
        'chatbot test V3',
        false,
        JSON.stringify({ projectKey: 'SCRUM', adminApproved: false })
      ]
    });

    console.log('✅ Servicio recreado');

    // Verificar que el servicio fue creado
    const [services] = await sequelize.query(`
      SELECT 
        user_id,
        service_id,
        service_name,
        is_active,
        configuration
      FROM unified_configurations 
      WHERE service_id = ? AND user_id = ?
    `, {
      replacements: [serviceId, userId]
    });

    console.log('📊 Servicio recreado:');
    console.table(services);

    console.log('\n✅ Proceso completado');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

recreateServiceForTesting();

