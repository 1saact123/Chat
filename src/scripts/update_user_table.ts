import { sequelize } from '../models';
import { User } from '../models';
import { Op } from 'sequelize';

async function updateUserTable() {
  try {
    console.log('🔄 Updating user table with new fields...');
    
    // Verificar si las columnas ya existen
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'chatbot_db' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('jira_token', 'openai_token', 'is_initial_setup_complete')
    `);

    const existingColumns = (results as any[]).map(row => row.COLUMN_NAME);
    console.log('📋 Existing columns:', existingColumns);

    // Agregar columnas que no existen
    if (!existingColumns.includes('jira_token')) {
      await sequelize.query('ALTER TABLE users ADD COLUMN jira_token TEXT');
      console.log('✅ Added jira_token column');
    }

    if (!existingColumns.includes('openai_token')) {
      await sequelize.query('ALTER TABLE users ADD COLUMN openai_token TEXT');
      console.log('✅ Added openai_token column');
    }

    if (!existingColumns.includes('is_initial_setup_complete')) {
      await sequelize.query('ALTER TABLE users ADD COLUMN is_initial_setup_complete BOOLEAN DEFAULT FALSE');
      console.log('✅ Added is_initial_setup_complete column');
    }

    // Actualizar usuarios existentes para que tengan setup completo (excepto admin y demo)
    await User.update(
      { isInitialSetupComplete: true },
      { 
        where: { 
          username: { [Op.notIn]: ['admin', 'demo'] }
        }
      }
    );

    console.log('✅ Updated existing users to have setup complete');
    console.log('🎉 User table update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating user table:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateUserTable()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { updateUserTable };
