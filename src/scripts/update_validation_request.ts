import { sequelize } from '../config/database';

async function updateValidationRequest() {
  try {
    console.log('🔍 Actualizando solicitud de validación con datos reales...');

    // Actualizar la solicitud de validación del servicio test-remoto
    await sequelize.query(`
      UPDATE service_validations 
      SET 
        website_url = 'https://movonte.com',
        requested_domain = 'movonte.com',
        service_description = 'Servicio de prueba remoto para integración con Jira'
      WHERE id = 10 AND service_name = 'test-remoto'
    `);

    console.log('✅ Solicitud de validación actualizada');

    // Verificar la actualización
    const [updatedValidation] = await sequelize.query(`
      SELECT 
        id,
        service_name,
        website_url,
        requested_domain,
        service_description
      FROM service_validations 
      WHERE id = 10
    `);

    console.log('📊 Solicitud actualizada:');
    console.table(updatedValidation);

    console.log('\n✅ Proceso completado');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

updateValidationRequest();

