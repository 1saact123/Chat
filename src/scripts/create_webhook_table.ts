import { sequelize } from '../config/database';
import { SavedWebhook } from '../models';

async function createWebhookTable() {
  try {
    console.log('🔄 Creating saved_webhooks table...');
    
    // Sincronizar el modelo con la base de datos
    await SavedWebhook.sync({ force: false }); // force: false para no eliminar datos existentes
    
    console.log('✅ Table saved_webhooks created successfully');
    
    // Verificar que la tabla existe
    const tableExists = await sequelize.getQueryInterface().showAllTables();
    if (tableExists.includes('saved_webhooks')) {
      console.log('✅ Table saved_webhooks verified in database');
    } else {
      console.log('❌ Table saved_webhooks not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error creating saved_webhooks table:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createWebhookTable();
}

export { createWebhookTable };
