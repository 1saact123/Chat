import { sequelize } from '../config/database';

async function testDeleteServiceSimulation() {
  try {
    console.log('🔍 Simulando eliminación de servicio...');

    const serviceId = 'testing-remote';
    const userId = 12;

    // Verificar que el servicio existe antes de eliminar
    const [servicesBefore] = await sequelize.query(`
      SELECT 
        user_id,
        service_id,
        service_name,
        is_active
      FROM unified_configurations 
      WHERE service_id = ? AND user_id = ?
    `, {
      replacements: [serviceId, userId]
    });

    console.log('📊 Servicio antes de eliminar:');
    console.table(servicesBefore);

    if (servicesBefore.length === 0) {
      console.log('⚠️ El servicio no existe');
      return;
    }

    // Simular la eliminación
    await sequelize.query(`
      DELETE FROM unified_configurations 
      WHERE user_id = ? AND service_id = ?
    `, {
      replacements: [userId, serviceId]
    });

    console.log('✅ Servicio eliminado');

    // Verificar que el servicio fue eliminado
    const [servicesAfter] = await sequelize.query(`
      SELECT 
        user_id,
        service_id,
        service_name,
        is_active
      FROM unified_configurations 
      WHERE service_id = ? AND user_id = ?
    `, {
      replacements: [serviceId, userId]
    });

    console.log('📊 Servicio después de eliminar:');
    console.table(servicesAfter);

    if (servicesAfter.length === 0) {
      console.log('✅ El servicio fue eliminado correctamente');
    } else {
      console.log('❌ El servicio no fue eliminado');
    }

    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

testDeleteServiceSimulation();

