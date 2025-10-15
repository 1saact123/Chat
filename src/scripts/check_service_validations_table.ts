import { sequelize } from '../config/database';

async function checkServiceValidationsTable() {
  try {
    console.log('🔍 Checking service_validations table...');
    
    // Verificar si la tabla existe
    const [results] = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_validations'`
    );
    
    if ((results as any[]).length === 0) {
      console.log('❌ Table service_validations does not exist');
      console.log('💡 Run the migration script to create the table');
      return;
    }
    
    console.log('✅ Table service_validations exists');
    
    // Verificar la estructura de la tabla
    const [columns] = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_validations' ORDER BY ORDINAL_POSITION`
    );
    
    console.log('📋 Table structure:');
    (columns as any[]).forEach((column: any) => {
      console.log(`  - ${column.COLUMN_NAME}: ${column.DATA_TYPE} (${column.IS_NULLABLE === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Verificar si hay datos
    const [count] = await sequelize.query(
      `SELECT COUNT(*) as count FROM service_validations`
    );
    
    const totalCount = (count as any[])[0].count;
    console.log(`📊 Total records: ${totalCount}`);
    
    if (totalCount > 0) {
      // Mostrar algunos registros de ejemplo
      const [records] = await sequelize.query(
        `SELECT id, serviceName, status, requestedDomain, createdAt FROM service_validations ORDER BY createdAt DESC LIMIT 5`
      );
      
      console.log('📝 Recent records:');
      (records as any[]).forEach((record: any) => {
        console.log(`  - ID: ${record.id}, Service: ${record.serviceName}, Status: ${record.status}, Domain: ${record.requestedDomain}, Created: ${record.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking service_validations table:', error);
  } finally {
    await sequelize.close();
  }
}

checkServiceValidationsTable();
