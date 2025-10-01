import { sequelize } from '../config/database';

async function updateWebhookConfigTable() {
  try {
    console.log('🔄 Updating webhook_config table to add filter columns...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Verificar si las columnas ya existen
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'chatbot_db' 
      AND TABLE_NAME = 'webhook_config' 
      AND COLUMN_NAME IN ('filter_enabled', 'filter_condition', 'filter_value')
    `);
    
    const existingColumns = (columns as any[]).map(col => col.COLUMN_NAME);
    console.log('📋 Existing filter columns:', existingColumns);
    
    // Agregar columnas si no existen
    if (!existingColumns.includes('filter_enabled')) {
      await sequelize.query(`
        ALTER TABLE webhook_config 
        ADD COLUMN filter_enabled TINYINT(1) DEFAULT false
      `);
      console.log('✅ Added filter_enabled column');
    }
    
    if (!existingColumns.includes('filter_condition')) {
      await sequelize.query(`
        ALTER TABLE webhook_config 
        ADD COLUMN filter_condition VARCHAR(50) DEFAULT 'response_value'
      `);
      console.log('✅ Added filter_condition column');
    }
    
    if (!existingColumns.includes('filter_value')) {
      await sequelize.query(`
        ALTER TABLE webhook_config 
        ADD COLUMN filter_value VARCHAR(50) DEFAULT 'Yes'
      `);
      console.log('✅ Added filter_value column');
    }
    
    // Actualizar la configuración existente con valores por defecto
    await sequelize.query(`
      UPDATE webhook_config 
      SET filter_enabled = false, 
          filter_condition = 'response_value', 
          filter_value = 'Yes'
      WHERE id = 1
    `);
    
    console.log('✅ Webhook config table updated successfully');
    
    // Verificar la estructura final
    const [finalStructure] = await sequelize.query(`
      DESCRIBE webhook_config
    `);
    
    console.log('📋 Final table structure:');
    (finalStructure as any[]).forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating webhook config table:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateWebhookConfigTable();
}

export { updateWebhookConfigTable };

