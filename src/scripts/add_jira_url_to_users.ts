import { sequelize } from '../models';

async function addJiraUrlToUsers() {
  try {
    console.log('🔄 Adding jiraUrl column to users table...');
    
    // Agregar columna jiraUrl a la tabla users
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN jiraUrl TEXT NULL
    `);
    
    console.log('✅ jiraUrl column added successfully to users table');
    
    // Verificar que la columna se agregó correctamente
    const [results] = await sequelize.query(`
      DESCRIBE users
    `);
    
    console.log('📋 Current users table structure:');
    console.table(results);
    
  } catch (error) {
    console.error('❌ Error adding jiraUrl column:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  addJiraUrlToUsers();
}

export { addJiraUrlToUsers };
