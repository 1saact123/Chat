import { sequelize } from '../config/database';

async function createMissingValidationRequest() {
  try {
    console.log('🔍 Creando solicitud de validación faltante...');

    // Buscar servicios pendientes de aprobación que no tienen solicitud de validación
    const [pendingServices] = await sequelize.query(`
      SELECT 
        user_id,
        service_id,
        service_name,
        configuration
      FROM unified_configurations 
      WHERE is_active = false 
        AND JSON_EXTRACT(configuration, '$.adminApproved') = false
    `);

    console.log('📊 Servicios pendientes encontrados:', pendingServices);

    for (const service of pendingServices as any[]) {
      // Verificar si ya existe una solicitud de validación para este servicio
      const [existingValidation] = await sequelize.query(`
        SELECT id FROM service_validations 
        WHERE user_id = ? AND service_name = ?
        LIMIT 1
      `, {
        replacements: [service.user_id, service.service_name]
      });

      if (existingValidation.length === 0) {
        // Crear solicitud de validación
        console.log(`📝 Creando solicitud de validación para servicio: ${service.service_name} (Usuario: ${service.user_id})`);
        
        // Obtener el adminId del usuario
        const [userInfo] = await sequelize.query(`
          SELECT admin_id FROM users WHERE id = ?
        `, {
          replacements: [service.user_id]
        });

        const adminId = (userInfo[0] as any)?.admin_id;

        await sequelize.query(`
          INSERT INTO service_validations 
          (user_id, service_name, service_description, website_url, requested_domain, status, admin_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
        `, {
          replacements: [
            service.user_id,
            service.service_name,
            `Servicio ${service.service_name}`,
            'https://example.com',
            'example.com',
            adminId
          ]
        });

        console.log(`✅ Solicitud de validación creada para: ${service.service_name}`);
      } else {
        console.log(`⚠️ Ya existe solicitud de validación para: ${service.service_name}`);
      }
    }

    // Verificar las solicitudes creadas
    const [validations] = await sequelize.query(`
      SELECT 
        id,
        user_id,
        service_name,
        status,
        admin_id,
        created_at
      FROM service_validations 
      ORDER BY created_at DESC
    `);

    console.log('\n📊 Solicitudes de validación actualizadas:');
    console.table(validations);

    console.log('\n✅ Proceso completado');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

createMissingValidationRequest();

