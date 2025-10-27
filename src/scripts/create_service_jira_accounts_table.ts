/**
 * Script para crear la tabla service_jira_accounts
 * Esta tabla almacena cuentas de Jira alternativas para cada servicio
 */

import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'u931066521_chatbot',
  process.env.DB_USER || 'u931066521_movonte',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'srv1510.hstgr.io',
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

async function createServiceJiraAccountsTable() {
  try {
    console.log('🔗 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    // Crear tabla service_jira_accounts
    console.log('\n📋 Creando tabla service_jira_accounts...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS service_jira_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        service_id VARCHAR(100) NOT NULL,
        
        -- Cuenta para respuestas del asistente
        assistant_jira_email VARCHAR(255) NULL,
        assistant_jira_token TEXT NULL,
        assistant_jira_url VARCHAR(500) NULL,
        
        -- Cuenta para el widget
        widget_jira_email VARCHAR(255) NULL,
        widget_jira_token TEXT NULL,
        widget_jira_url VARCHAR(500) NULL,
        
        -- Metadatos
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Índices y claves
        UNIQUE KEY unique_user_service (user_id, service_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_service_id (service_id),
        INDEX idx_user_id (user_id),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Tabla service_jira_accounts creada exitosamente');

    // Verificar estructura de la tabla
    console.log('\n📊 Verificando estructura de la tabla...');
    const [columns] = await sequelize.query(`
      DESCRIBE service_jira_accounts
    `) as any;

    console.log('\n📋 Columnas de la tabla service_jira_accounts:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });

    // Verificar registros existentes
    console.log('\n📊 Verificando registros existentes...');
    const [accounts] = await sequelize.query(`
      SELECT COUNT(*) as count FROM service_jira_accounts
    `) as any;

    console.log(`✅ Total de cuentas configuradas: ${accounts[0].count}`);

    console.log('\n✅ Proceso completado exitosamente!');
    console.log('\n📝 Notas:');
    console.log('  - La tabla service_jira_accounts está lista para usar');
    console.log('  - Puedes configurar cuentas de Jira alternativas para cada servicio');
    console.log('  - assistant_jira_* se usa para respuestas del asistente');
    console.log('  - widget_jira_* se usa para interacciones del widget');
    console.log('  - Si no hay cuenta configurada, se usa la cuenta del usuario principal');

  } catch (error) {
    console.error('❌ Error al crear la tabla:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar script
createServiceJiraAccountsTable()
  .then(() => {
    console.log('\n🎉 Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error al ejecutar script:', error);
    process.exit(1);
  });

