import { DatabaseService } from '../services/database_service';
import { User, sequelize } from '../models';

async function migratePermissions() {
  console.log('🔄 Migrando permisos de usuarios...');
  
  try {
    // Verificar si ya existe la columna permissions
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'permissions'
    `);
    
    if (results.length === 0) {
      console.log('📊 Agregando columna permissions a la tabla users...');
      
      // Agregar la columna permissions (sin valor por defecto en MySQL)
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN permissions JSON NULL
      `);
      
      console.log('✅ Columna permissions agregada exitosamente');
    } else {
      console.log('✅ La columna permissions ya existe');
    }
    
    // Actualizar usuarios existentes que no tengan permisos configurados
    const users = await User.findAll({
      where: {
        role: 'user'
      }
    });
    
    console.log(`📋 Encontrados ${users.length} usuarios para actualizar`);
    
    for (const user of users) {
      if (!user.permissions) {
        const defaultPermissions = {
          serviceManagement: false,
          automaticAIDisableRules: false,
          webhookConfiguration: false,
          ticketControl: false,
          aiEnabledProjects: false,
          remoteServerIntegration: false
        };
        
        await user.update({ permissions: defaultPermissions });
        console.log(`✅ Permisos por defecto agregados a usuario: ${user.username}`);
      } else {
        console.log(`✅ Usuario ${user.username} ya tiene permisos configurados`);
      }
    }
    
    console.log('🎉 Migración de permisos completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en migración de permisos:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migratePermissions()
    .then(() => {
      console.log('✅ Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en migración:', error);
      process.exit(1);
    });
}

export { migratePermissions };
