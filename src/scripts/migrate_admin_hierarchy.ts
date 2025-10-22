import { sequelize } from '../config/database';

async function migrateAdminHierarchy() {
  try {
    console.log('🚀 Iniciando migración de jerarquía de administradores...');

    // 1. Verificar y agregar campo admin_id a la tabla users
    console.log('📝 Verificando campo admin_id en tabla users...');
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN admin_id INT NULL,
        ADD INDEX idx_users_admin_id (admin_id),
        ADD FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ Campo admin_id agregado a tabla users');
    } catch (error: any) {
      if (error.original?.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ Campo admin_id ya existe en tabla users, continuando...');
      } else {
        throw error;
      }
    }

    // 2. Verificar y agregar campo admin_id a la tabla service_validations
    console.log('📝 Verificando campo admin_id en tabla service_validations...');
    try {
      await sequelize.query(`
        ALTER TABLE service_validations 
        ADD COLUMN admin_id INT NULL,
        ADD INDEX idx_service_validations_admin_id (admin_id),
        ADD FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ Campo admin_id agregado a tabla service_validations');
    } catch (error: any) {
      if (error.original?.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️ Campo admin_id ya existe en tabla service_validations, continuando...');
      } else {
        throw error;
      }
    }

    // 3. Actualizar usuarios existentes
    console.log('🔄 Actualizando usuarios existentes...');
    
    // Obtener el primer admin (usuario con role = 'admin')
    const [adminUsers] = await sequelize.query(`
      SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1
    `);
    
    if (adminUsers.length > 0) {
      const firstAdminId = (adminUsers[0] as any).id;
      console.log(`👑 Usando admin principal con ID: ${firstAdminId}`);
      
      // Asignar todos los usuarios no-admin al primer admin
      await sequelize.query(`
        UPDATE users 
        SET admin_id = ? 
        WHERE role != 'admin' AND admin_id IS NULL
      `, {
        replacements: [firstAdminId]
      });
      
      console.log('✅ Usuarios asignados al admin principal');
    }

    // 4. Actualizar service_validations existentes
    console.log('🔄 Actualizando service_validations existentes...');
    
    // Para cada service_validation, asignar el admin_id del usuario que la creó
    await sequelize.query(`
      UPDATE service_validations sv
      JOIN users u ON sv.user_id = u.id
      SET sv.admin_id = u.admin_id
      WHERE sv.admin_id IS NULL
    `);
    
    console.log('✅ Service validations actualizadas');

    // 5. Verificar migración
    console.log('🔍 Verificando migración...');
    
    const [userStats] = await sequelize.query(`
      SELECT 
        role,
        COUNT(*) as total,
        COUNT(admin_id) as with_admin
      FROM users 
      GROUP BY role
    `);
    
    const [validationStats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(admin_id) as with_admin
      FROM service_validations
    `);
    
    console.log('📊 Estadísticas de usuarios:', userStats);
    console.log('📊 Estadísticas de service_validations:', validationStats);

    console.log('✅ Migración de jerarquía de administradores completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar migración
migrateAdminHierarchy()
  .then(() => {
    console.log('🏁 Migración completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  });
