import { sequelize } from '../config/database';

async function testAdminValidationEndpoint() {
  try {
    console.log('🔍 Probando endpoint de validaciones para admin...');

    // Simular la consulta que hace el método getPendingValidationsForAdmin
    const adminId = 1; // Admin principal
    
    const [validations] = await sequelize.query(`
      SELECT 
        sv.id,
        sv.service_name,
        sv.service_description,
        sv.website_url,
        sv.requested_domain,
        sv.status,
        sv.admin_notes,
        sv.validated_by,
        sv.validated_at,
        sv.created_at,
        sv.updated_at,
        u.id as user_id,
        u.username,
        u.email
      FROM service_validations sv
      LEFT JOIN users u ON sv.user_id = u.id
      WHERE sv.status = 'pending' AND sv.admin_id = ?
      ORDER BY sv.created_at ASC
    `, {
      replacements: [adminId]
    });

    console.log('📊 Solicitudes pendientes para admin ID 1:');
    console.table(validations);

    // También verificar todas las solicitudes de validación
    const [allValidations] = await sequelize.query(`
      SELECT 
        sv.id,
        sv.user_id,
        sv.service_name,
        sv.status,
        sv.admin_id,
        u.username as user_username
      FROM service_validations sv
      LEFT JOIN users u ON sv.user_id = u.id
      ORDER BY sv.created_at DESC
    `);

    console.log('\n📊 Todas las solicitudes de validación:');
    console.table(allValidations);

    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

testAdminValidationEndpoint();

