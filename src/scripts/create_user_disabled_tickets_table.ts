import { sequelize } from '../config/database';

async function createUserDisabledTicketsTable() {
  try {
    console.log('🔄 Creating user_disabled_tickets table...');
    
    // Verificar si la tabla ya existe
    const [results] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'user_disabled_tickets'
    `);
    
    if ((results as any[]).length > 0) {
      console.log('✅ Table user_disabled_tickets already exists');
      return;
    }
    
    // Crear la tabla user_disabled_tickets
    await sequelize.query(`
      CREATE TABLE user_disabled_tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        issue_key VARCHAR(50) NOT NULL,
        reason TEXT,
        disabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        disabled_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_issue (user_id, issue_key),
        INDEX idx_user_disabled_tickets_user_id (user_id),
        INDEX idx_user_disabled_tickets_issue_key (issue_key),
        CONSTRAINT fk_user_disabled_tickets_user_id 
          FOREIGN KEY (user_id) REFERENCES users(id) 
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    
    console.log('✅ Successfully created user_disabled_tickets table');
    
  } catch (error) {
    console.error('❌ Error creating user_disabled_tickets table:', error);
    throw error;
  }
}

// Ejecutar la migración
createUserDisabledTicketsTable()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });

