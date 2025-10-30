import { sequelize } from '../config/database';

async function updateWebhooksSchema() {
  try {
    console.log('🔄 Iniciando actualización del esquema de webhooks...');

    // 1. Agregar campo token si no existe
    try {
      await sequelize.query(`
        ALTER TABLE user_webhooks
        ADD COLUMN token VARCHAR(255) NULL COMMENT 'Token de autenticación para el webhook'
        AFTER jira_project_key
      `);
      console.log('✅ Campo token agregado a user_webhooks');
    } catch (error: any) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠️ Campo token ya existe en user_webhooks');
      } else {
        throw error;
      }
    }

    // 2. Eliminar campo jira_project_key si existe
    try {
      await sequelize.query(`
        ALTER TABLE user_webhooks
        DROP COLUMN jira_project_key
      `);
      console.log('✅ Campo jira_project_key eliminado de user_webhooks');
    } catch (error: any) {
      if (error.message.includes("doesn't exist")) {
        console.log('⚠️ Campo jira_project_key no existe en user_webhooks');
      } else {
        throw error;
      }
    }

    // 3. Eliminar índices relacionados con jira_project_key
    try {
      await sequelize.query(`
        ALTER TABLE user_webhooks
        DROP INDEX idx_jira_project
      `);
      console.log('✅ Índice idx_jira_project eliminado');
    } catch (error: any) {
      if (error.message.includes("doesn't exist")) {
        console.log('⚠️ Índice idx_jira_project no existe');
      } else {
        throw error;
      }
    }

    // 4. Agregar índice para token
    try {
      await sequelize.query(`
        ALTER TABLE user_webhooks
        ADD INDEX idx_token (token)
      `);
      console.log('✅ Índice idx_token agregado');
    } catch (error: any) {
      if (error.message.includes('Duplicate key name')) {
        console.log('⚠️ Índice idx_token ya existe');
      } else {
        throw error;
      }
    }

    // 5. Actualizar índice compuesto (remover jira_project_key)
    try {
      await sequelize.query(`
        ALTER TABLE user_webhooks
        DROP INDEX idx_user_service_active
      `);
      console.log('✅ Índice compuesto anterior eliminado');
    } catch (error: any) {
      if (error.message.includes("doesn't exist")) {
        console.log('⚠️ Índice compuesto anterior no existe');
      } else {
        throw error;
      }
    }

    try {
      await sequelize.query(`
        ALTER TABLE user_webhooks
        ADD INDEX idx_user_service_active (user_id, service_id, is_enabled)
      `);
      console.log('✅ Nuevo índice compuesto agregado');
    } catch (error: any) {
      if (error.message.includes('Duplicate key name')) {
        console.log('⚠️ Índice compuesto ya existe');
      } else {
        throw error;
      }
    }

    console.log('✅ Actualización del esquema de webhooks completada');
  } catch (error) {
    console.error('❌ Error actualizando esquema de webhooks:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateWebhooksSchema()
    .then(() => {
      console.log('🎉 Migración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la migración:', error);
      process.exit(1);
    });
}

export { updateWebhooksSchema };

