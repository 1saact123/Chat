import { sequelize } from '../config/database';

async function cleanupOldServices() {
  try {
    console.log('🧹 === LIMPIANDO SERVICIOS VIEJOS ===\n');

    // 1. Eliminar servicio "jira-integration" si existe
    console.log('1️⃣ Eliminando servicio "jira-integration"...');
    const [deleteResult] = await sequelize.query(`
      DELETE FROM unified_configurations 
      WHERE service_id = 'jira-integration'
    `);
    
    console.log(`✅ Servicio "jira-integration" eliminado (${(deleteResult as any).affectedRows || 0} filas)`);

    // 2. Actualizar servicios de admin para que tengan adminApproved
    console.log('\n2️⃣ Actualizando servicios de admin con aprobación automática...');
    const [adminServices] = await sequelize.query(`
      SELECT uc.*, u.role 
      FROM unified_configurations uc
      JOIN users u ON uc.user_id = u.id
      WHERE u.role = 'admin'
    `);

    console.log(`📋 Servicios de admin encontrados: ${adminServices.length}`);

    for (const service of adminServices as any[]) {
      let config = {};
      try {
        config = typeof service.configuration === 'string' 
          ? JSON.parse(service.configuration) 
          : service.configuration || {};
      } catch (e) {
        console.error(`⚠️ Error parseando configuración para ${service.service_id}`);
      }

      // Agregar adminApproved si no existe
      if (!(config as any).adminApproved) {
        (config as any).adminApproved = true;
        (config as any).adminApprovedAt = new Date().toISOString();

        await sequelize.query(`
          UPDATE unified_configurations 
          SET configuration = ?, updated_at = NOW()
          WHERE id = ?
        `, {
          replacements: [JSON.stringify(config), service.id]
        });

        console.log(`✅ Actualizado: ${service.service_name} (${service.service_id})`);
      } else {
        console.log(`⏭️  Ya aprobado: ${service.service_name} (${service.service_id})`);
      }
    }

    // 3. Verificar estado final
    console.log('\n3️⃣ Verificando estado final...');
    const [finalState] = await sequelize.query(`
      SELECT 
        uc.service_id,
        uc.service_name,
        uc.user_id,
        u.username,
        u.role,
        uc.is_active,
        uc.configuration
      FROM unified_configurations uc
      JOIN users u ON uc.user_id = u.id
      ORDER BY u.role DESC, uc.service_name
    `);

    console.log('\n📋 Estado final de servicios:');
    (finalState as any[]).forEach((service: any) => {
      let config = {};
      try {
        config = typeof service.configuration === 'string' 
          ? JSON.parse(service.configuration) 
          : service.configuration || {};
      } catch (e) {
        config = {};
      }

      const roleIcon = service.role === 'admin' ? '👑' : '👤';
      const approvedIcon = (config as any).adminApproved ? '✅' : '⏳';
      const activeIcon = service.is_active ? '🟢' : '⚪';
      
      console.log(`${roleIcon} ${approvedIcon} ${activeIcon} ${service.service_name} (${service.username})`);
    });

    console.log('\n✅ === LIMPIEZA COMPLETADA ===');

  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  }
}

if (require.main === module) {
  cleanupOldServices().then(() => {
    console.log('\n🎯 === LIMPIEZA FINALIZADA ===');
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { cleanupOldServices };


