import { UserConfiguration, ServiceConfiguration, User } from '../models';
import { DatabaseService } from '../services/database_service';
import { sequelize } from '../config/database';

async function migrateToUnifiedTable() {
  try {
    console.log('🔄 === MIGRACIÓN A TABLA UNIFICADA ===\n');

    const dbService = DatabaseService.getInstance();

    // 1. Crear tabla unificada
    console.log('1️⃣ Creando tabla unificada...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS unified_configurations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        service_id VARCHAR(255) NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        user_id INT NOT NULL,
        assistant_id VARCHAR(255) NOT NULL,
        assistant_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        configuration JSON,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        UNIQUE KEY unique_user_service (user_id, service_id),
        INDEX idx_service_id (service_id),
        INDEX idx_user_id (user_id),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await sequelize.query(createTableSQL);
    console.log('✅ Tabla unificada creada');

    // 2. Migrar configuraciones globales (ServiceConfiguration) - Asignar al admin (user_id = 1)
    console.log('\n2️⃣ Migrando configuraciones globales al admin...');
    
    const globalConfigs = await ServiceConfiguration.findAll();
    console.log(`📋 Encontradas ${globalConfigs.length} configuraciones globales`);

    for (const config of globalConfigs) {
      // Filtrar configuraciones especiales que no son servicios reales
      if (config.serviceId.startsWith('disabled_ticket_') || 
          config.serviceId === 'status-based-disable') {
        console.log(`⚠️ Saltando configuración especial: ${config.serviceId}`);
        continue;
      }

      const insertSQL = `
        INSERT INTO unified_configurations 
        (service_id, service_name, user_id, assistant_id, assistant_name, is_active, configuration, last_updated, created_at, updated_at)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        assistant_id = VALUES(assistant_id),
        assistant_name = VALUES(assistant_name),
        is_active = VALUES(is_active),
        configuration = VALUES(configuration),
        last_updated = VALUES(last_updated),
        updated_at = VALUES(updated_at)
      `;

      await sequelize.query(insertSQL, {
        replacements: [
          config.serviceId,
          config.serviceName,
          config.assistantId,
          config.assistantName,
          config.isActive,
          JSON.stringify({ adminManaged: true }), // Marcar como administrada por admin
          config.lastUpdated || new Date(),
          config.createdAt || new Date(),
          config.updatedAt || new Date()
        ]
      });

      console.log(`✅ Migrado al admin: ${config.serviceName} (${config.assistantName})`);
    }

    // 3. Migrar configuraciones de usuario (UserConfiguration)
    console.log('\n3️⃣ Migrando configuraciones de usuario...');
    
    const userConfigs = await UserConfiguration.findAll();
    console.log(`📋 Encontradas ${userConfigs.length} configuraciones de usuario`);

    for (const config of userConfigs) {
      const insertSQL = `
        INSERT INTO unified_configurations 
        (service_id, service_name, user_id, assistant_id, assistant_name, is_active, configuration, last_updated, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        assistant_id = VALUES(assistant_id),
        assistant_name = VALUES(assistant_name),
        is_active = VALUES(is_active),
        configuration = VALUES(configuration),
        last_updated = VALUES(last_updated),
        updated_at = VALUES(updated_at)
      `;

      await sequelize.query(insertSQL, {
        replacements: [
          config.serviceId,
          config.serviceName,
          config.userId,
          config.assistantId,
          config.assistantName,
          config.isActive,
          JSON.stringify(config.configuration || {}),
          config.lastUpdated || new Date(),
          config.createdAt || new Date(),
          config.updatedAt || new Date()
        ]
      });

      console.log(`✅ Migrado: ${config.serviceName} para usuario ${config.userId} (${config.assistantName})`);
    }

    // 4. Verificar migración
    console.log('\n4️⃣ Verificando migración...');
    
    const verifySQL = `
      SELECT 
        service_id,
        service_name,
        user_id,
        assistant_name,
        is_active,
        COUNT(*) as count
      FROM unified_configurations 
      GROUP BY service_id, user_id
      ORDER BY service_id, user_id
    `;

    const [results] = await sequelize.query(verifySQL);
    console.log('📋 Configuraciones migradas:');
    results.forEach((row: any) => {
      const userInfo = row.user_id ? `Usuario ${row.user_id}` : 'Global';
      console.log(`   - ${row.service_name}: ${row.assistant_name} (${userInfo}) - Activo: ${row.is_active}`);
    });

    console.log('\n✅ === MIGRACIÓN COMPLETADA ===');
    console.log('💡 Próximos pasos:');
    console.log('   1. Actualizar controladores para usar unified_configurations');
    console.log('   2. Modificar webhook para usar la nueva tabla');
    console.log('   3. Probar el sistema');
    console.log('   4. Eliminar tablas antiguas (user_configurations, service_configurations)');

  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
}

// Función para obtener configuración específica del usuario
export async function getUnifiedConfiguration(serviceId: string, userId: number): Promise<any> {
  try {
    const dbService = DatabaseService.getInstance();
    
    // Buscar configuración específica del usuario
    const userConfigSQL = `
      SELECT * FROM unified_configurations 
      WHERE service_id = ? AND user_id = ? AND is_active = TRUE
      LIMIT 1
    `;
    
    const [userConfig] = await sequelize.query(userConfigSQL, {
      replacements: [serviceId, userId]
    });
    return userConfig.length > 0 ? userConfig[0] : null;
    
  } catch (error) {
    console.error('❌ Error obteniendo configuración unificada:', error);
    return null;
  }
}

// Función para obtener todas las configuraciones de un usuario
export async function getUserConfigurations(userId: number): Promise<any[]> {
  try {
    const dbService = DatabaseService.getInstance();
    
    const userConfigsSQL = `
      SELECT * FROM unified_configurations 
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY service_name
    `;
    
    const [userConfigs] = await sequelize.query(userConfigsSQL, {
      replacements: [userId]
    });
    return userConfigs;
    
  } catch (error) {
    console.error('❌ Error obteniendo configuraciones del usuario:', error);
    return [];
  }
}

// Ejecutar migración
if (require.main === module) {
  migrateToUnifiedTable().then(() => {
    console.log('\n🎯 === MIGRACIÓN FINALIZADA ===');
  }).catch(console.error);
}

export { migrateToUnifiedTable };
