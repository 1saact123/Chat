import { sequelize } from '../config/database';

/**
 * Script para agregar campos service_id y jira_project_key a user_webhooks
 * Esto permite que cada usuario tenga múltiples webhooks paralelos,
 * cada uno asociado a un servicio específico y proyecto de Jira
 */
async function addServiceToWebhooks() {
  try {
    console.log('🔄 === MIGRACIÓN: Agregar service_id y jira_project_key a user_webhooks ===\n');

    // 1. Verificar si las columnas ya existen
    console.log('1️⃣ Verificando estructura actual de user_webhooks...');
    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM user_webhooks
    `);
    
    console.log('📋 Columnas actuales:', columns.map((col: any) => col.Field).join(', '));
    
    const hasServiceId = columns.some((col: any) => col.Field === 'service_id');
    const hasProjectKey = columns.some((col: any) => col.Field === 'jira_project_key');
    const hasAssistantId = columns.some((col: any) => col.Field === 'assistant_id');

    // 2. Agregar service_id si no existe
    if (!hasServiceId) {
      console.log('\n2️⃣ Agregando columna service_id...');
      await sequelize.query(`
        ALTER TABLE user_webhooks 
        ADD COLUMN service_id VARCHAR(100) NULL COMMENT 'ID del servicio al que pertenece este webhook'
        AFTER user_id
      `);
      console.log('✅ Columna service_id agregada');
      
      // Agregar índice para service_id
      await sequelize.query(`
        ALTER TABLE user_webhooks 
        ADD INDEX idx_service_id (service_id)
      `);
      console.log('✅ Índice agregado para service_id');
    } else {
      console.log('⚠️ La columna service_id ya existe');
    }

    // 3. Agregar jira_project_key si no existe
    if (!hasProjectKey) {
      console.log('\n3️⃣ Agregando columna jira_project_key...');
      await sequelize.query(`
        ALTER TABLE user_webhooks 
        ADD COLUMN jira_project_key VARCHAR(50) NULL COMMENT 'Clave del proyecto de Jira destino'
        AFTER service_id
      `);
      console.log('✅ Columna jira_project_key agregada');
      
      // Agregar índice para jira_project_key
      await sequelize.query(`
        ALTER TABLE user_webhooks 
        ADD INDEX idx_jira_project (jira_project_key)
      `);
      console.log('✅ Índice agregado para jira_project_key');
    } else {
      console.log('⚠️ La columna jira_project_key ya existe');
    }

    // 4. Agregar assistant_id si no existe (opcional, para vincular con un asistente específico)
    if (!hasAssistantId) {
      console.log('\n4️⃣ Agregando columna assistant_id (opcional)...');
      await sequelize.query(`
        ALTER TABLE user_webhooks 
        ADD COLUMN assistant_id VARCHAR(255) NULL COMMENT 'ID del asistente específico para este webhook'
        AFTER jira_project_key
      `);
      console.log('✅ Columna assistant_id agregada');
    } else {
      console.log('⚠️ La columna assistant_id ya existe');
    }

    // 5. Agregar índice compuesto para búsquedas eficientes
    console.log('\n5️⃣ Agregando índice compuesto...');
    try {
      await sequelize.query(`
        ALTER TABLE user_webhooks 
        ADD INDEX idx_user_service_active (user_id, service_id, is_enabled)
      `);
      console.log('✅ Índice compuesto agregado');
    } catch (error: any) {
      if (error.message.includes('Duplicate key name')) {
        console.log('⚠️ El índice compuesto ya existe');
      } else {
        throw error;
      }
    }

    // 6. Verificar estructura final
    console.log('\n6️⃣ Verificando estructura final...');
    const [finalColumns] = await sequelize.query(`
      SHOW COLUMNS FROM user_webhooks
    `);
    
    console.log('\n📋 Estructura final de user_webhooks:');
    console.log('┌─────────────────────┬──────────────┬──────────┐');
    console.log('│ Campo               │ Tipo         │ Nulo     │');
    console.log('├─────────────────────┼──────────────┼──────────┤');
    finalColumns.forEach((col: any) => {
      const field = col.Field.padEnd(19);
      const type = col.Type.padEnd(12);
      const nullable = col.Null.padEnd(8);
      console.log(`│ ${field} │ ${type} │ ${nullable} │`);
    });
    console.log('└─────────────────────┴──────────────┴──────────┘');

    // 7. Mostrar webhooks existentes
    console.log('\n7️⃣ Verificando webhooks existentes...');
    const [webhooks] = await sequelize.query(`
      SELECT 
        id,
        user_id,
        name,
        service_id,
        jira_project_key,
        is_enabled
      FROM user_webhooks
    `);

    if ((webhooks as any[]).length > 0) {
      console.log(`\n📋 Webhooks existentes (${(webhooks as any[]).length}):`);
      (webhooks as any[]).forEach((webhook: any) => {
        console.log(`   - ID: ${webhook.id} | Usuario: ${webhook.user_id} | Nombre: ${webhook.name}`);
        console.log(`     Servicio: ${webhook.service_id || 'NULL'} | Proyecto: ${webhook.jira_project_key || 'NULL'} | Activo: ${webhook.is_enabled}`);
      });
    } else {
      console.log('⚠️ No hay webhooks existentes');
    }

    console.log('\n✅ === MIGRACIÓN COMPLETADA EXITOSAMENTE ===');
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Actualizar el modelo UserWebhook en models/index.ts');
    console.log('   2. Actualizar UserWebhooksController para manejar service_id y jira_project_key');
    console.log('   3. Actualizar el frontend para permitir seleccionar servicio y proyecto');
    console.log('   4. Modificar la lógica de webhooks para enviar según el servicio específico');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addServiceToWebhooks()
    .then(() => {
      console.log('\n🎯 === SCRIPT FINALIZADO ===');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script falló:', error);
      process.exit(1);
    });
}

export { addServiceToWebhooks };


