import { sequelize } from '../config/database';

async function testServiceLookup() {
  try {
    console.log('🔍 Probando búsqueda de servicio...');

    const userId = 12;
    const serviceId = 'testing-remote';

    // Probar la consulta original (con filtro is_active = TRUE)
    const [activeServices] = await sequelize.query(`
      SELECT * FROM unified_configurations 
      WHERE user_id = ? AND service_id = ? AND is_active = TRUE
      LIMIT 1
    `, {
      replacements: [userId, serviceId]
    });

    console.log('📊 Servicios activos encontrados:');
    console.table(activeServices);

    // Probar la consulta corregida (sin filtro is_active)
    const [allServices] = await sequelize.query(`
      SELECT * FROM unified_configurations 
      WHERE user_id = ? AND service_id = ?
      LIMIT 1
    `, {
      replacements: [userId, serviceId]
    });

    console.log('📊 Todos los servicios encontrados:');
    console.table(allServices);

    if (activeServices.length === 0 && allServices.length > 0) {
      console.log('✅ Problema confirmado: El servicio existe pero no está activo');
      console.log('✅ La corrección debería funcionar');
    } else if (allServices.length === 0) {
      console.log('⚠️ El servicio no existe en la base de datos');
    } else {
      console.log('✅ El servicio existe y está activo');
    }

    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

testServiceLookup();

