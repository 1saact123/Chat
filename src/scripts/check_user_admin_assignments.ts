import { sequelize } from '../config/database';

async function checkUserAdminAssignments() {
  try {
    console.log('🔍 Verificando asignaciones de administradores...');

    // Verificar usuarios y sus adminId
    const [users] = await sequelize.query(`
      SELECT 
        id,
        username,
        role,
        admin_id
      FROM users 
      ORDER BY id
    `);

    console.log('\n📊 Usuarios y sus administradores asignados:');
    console.table(users);

    // Verificar solicitudes de validación existentes
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

    console.log('\n📊 Solicitudes de validación existentes:');
    console.table(validations);

    // Verificar servicios pendientes de aprobación
    const [pendingServices] = await sequelize.query(`
      SELECT 
        user_id,
        service_id,
        service_name,
        is_active,
        configuration
      FROM unified_configurations 
      WHERE is_active = false AND JSON_EXTRACT(configuration, '$.adminApproved') = false
      ORDER BY user_id
    `);

    console.log('\n📊 Servicios pendientes de aprobación:');
    console.table(pendingServices);

    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkUserAdminAssignments();
