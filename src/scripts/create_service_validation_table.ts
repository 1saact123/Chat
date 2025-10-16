import { sequelize } from '../config/database';

async function createServiceValidationTable() {
  try {
    console.log('🔄 Creating service_validations table...');
    
    // Verificar si la tabla ya existe
    const [results] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'service_validations'
    `);
    
    if ((results as any[]).length > 0) {
      console.log('✅ Table service_validations already exists');
      return;
    }
    
    // Crear la tabla service_validations
    await sequelize.query(`
      CREATE TABLE service_validations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        service_description TEXT,
        website_url VARCHAR(500) NOT NULL,
        requested_domain VARCHAR(255) NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        admin_notes TEXT,
        validated_by INT NULL,
        validated_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_service_validations_user_id (user_id),
        INDEX idx_service_validations_status (status),
        INDEX idx_service_validations_domain (requested_domain),
        CONSTRAINT fk_service_validations_user_id 
          FOREIGN KEY (user_id) REFERENCES users(id) 
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_service_validations_validated_by 
          FOREIGN KEY (validated_by) REFERENCES users(id) 
          ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);
    
    console.log('✅ Successfully created service_validations table');
    
  } catch (error) {
    console.error('❌ Error creating service_validations table:', error);
    throw error;
  }
}

// Ejecutar la migración
createServiceValidationTable()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });

