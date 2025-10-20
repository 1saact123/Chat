import { sequelize } from '../config/database';

async function addUserIdToSavedWebhooks() {
  try {
    console.log('🔄 Adding user_id column to saved_webhooks table...');
    
    // Verificar si la columna ya existe
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'saved_webhooks' 
      AND COLUMN_NAME = 'user_id'
    `);
    
    if ((results as any[]).length > 0) {
      console.log('✅ Column user_id already exists in saved_webhooks table');
      return;
    }
    
    // Agregar la columna user_id
    await sequelize.query(`
      ALTER TABLE saved_webhooks 
      ADD COLUMN user_id INT NULL,
      ADD INDEX idx_saved_webhooks_user_id (user_id),
      ADD CONSTRAINT fk_saved_webhooks_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) 
        ON DELETE CASCADE ON UPDATE CASCADE
    `);
    
    console.log('✅ Successfully added user_id column to saved_webhooks table');
    
    // Actualizar registros existentes (opcional - asignar a admin si es necesario)
    const [existingWebhooks] = await sequelize.query(`
      SELECT COUNT(*) as count FROM saved_webhooks WHERE user_id IS NULL
    `);
    
    const count = (existingWebhooks as any[])[0].count;
    if (count > 0) {
      console.log(`📝 Found ${count} existing webhooks without user_id`);
      console.log('💡 Consider updating these records to assign them to specific users');
    }
    
  } catch (error) {
    console.error('❌ Error adding user_id column to saved_webhooks:', error);
    throw error;
  }
}

// Ejecutar la migración
addUserIdToSavedWebhooks()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });


