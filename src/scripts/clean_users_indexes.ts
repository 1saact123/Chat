import { sequelize } from '../config/database';

async function cleanUsersIndexes() {
  try {
    console.log('🔄 Cleaning users table indexes...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Obtener todos los índices de la tabla users (excepto PRIMARY)
    const [indexes] = await sequelize.query(`
      SHOW INDEX FROM users WHERE Key_name != 'PRIMARY'
    `);
    
    console.log(`📋 Found ${(indexes as any[]).length} indexes to clean`);
    
    // Crear un Set para rastrear índices únicos por columna
    const uniqueIndexes = new Set();
    const indexesToDrop = [];
    
    for (const index of indexes as any[]) {
      const keyName = index.Key_name;
      const columnName = index.Column_name;
      
      // Crear un identificador único para cada columna
      const columnKey = `${columnName}_unique`;
      
      // Si ya tenemos un índice para esta columna, marcar para eliminar
      if (uniqueIndexes.has(columnKey)) {
        indexesToDrop.push(keyName);
      } else {
        uniqueIndexes.add(columnKey);
      }
    }
    
    console.log(`🗑️ Dropping ${indexesToDrop.length} duplicate indexes...`);
    
    // Eliminar todos los índices duplicados
    for (const indexName of indexesToDrop) {
      try {
        await sequelize.query(`DROP INDEX \`${indexName}\` ON users`);
        console.log(`✅ Dropped index: ${indexName}`);
      } catch (error) {
        console.log(`⚠️ Could not drop index ${indexName}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    // Verificar el resultado final
    const [finalIndexes] = await sequelize.query(`
      SHOW INDEX FROM users WHERE Key_name != 'PRIMARY'
    `);
    
    console.log(`📋 Final index count: ${(finalIndexes as any[]).length}`);
    console.log('📋 Remaining indexes:', (finalIndexes as any[]).map((idx: any) => idx.Key_name));
    
    console.log('✅ Users table indexes cleaned successfully');
    
  } catch (error) {
    console.error('❌ Error cleaning users table indexes:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanUsersIndexes();
}

export { cleanUsersIndexes };
