import { sequelize } from '../config/database';

async function fixUsersTable() {
  try {
    console.log('🔄 Fixing users table indexes...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Obtener información sobre los índices existentes
    const [indexes] = await sequelize.query(`
      SHOW INDEX FROM users WHERE Key_name != 'PRIMARY'
    `);
    
    console.log('📋 Current indexes:', indexes);
    
    // Eliminar índices duplicados o problemáticos
    const duplicateIndexes = new Set();
    const indexesToDrop = [];
    
    for (const index of indexes as any[]) {
      const keyName = index.Key_name;
      const columnName = index.Column_name;
      
      // Si ya vimos este índice, marcarlo para eliminar
      if (duplicateIndexes.has(keyName)) {
        indexesToDrop.push(keyName);
      } else {
        duplicateIndexes.add(keyName);
      }
    }
    
    // Eliminar índices duplicados
    for (const indexName of indexesToDrop) {
      try {
        await sequelize.query(`DROP INDEX \`${indexName}\` ON users`);
        console.log(`✅ Dropped duplicate index: ${indexName}`);
      } catch (error) {
        console.log(`⚠️ Could not drop index ${indexName}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    // Verificar que la tabla users tiene la estructura correcta
    const [tableInfo] = await sequelize.query(`DESCRIBE users`);
    console.log('📋 Users table structure:', tableInfo);
    
    console.log('✅ Users table fixed successfully');
    
  } catch (error) {
    console.error('❌ Error fixing users table:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixUsersTable();
}

export { fixUsersTable };
