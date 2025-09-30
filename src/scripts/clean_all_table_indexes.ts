import { sequelize } from '../config/database';

async function cleanAllTableIndexes() {
  try {
    console.log('🔄 Cleaning all table indexes...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Obtener todas las tablas de la base de datos
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'chatbot_db' 
      AND TABLE_TYPE = 'BASE TABLE'
    `);
    
    console.log(`📋 Found ${(tables as any[]).length} tables to process`);
    
    for (const table of tables as any[]) {
      const tableName = table.TABLE_NAME;
      console.log(`\n🔍 Processing table: ${tableName}`);
      
      try {
        // Obtener todos los índices de la tabla (excepto PRIMARY)
        const [indexes] = await sequelize.query(`
          SHOW INDEX FROM \`${tableName}\` WHERE Key_name != 'PRIMARY'
        `);
        
        if ((indexes as any[]).length === 0) {
          console.log(`✅ No duplicate indexes found in ${tableName}`);
          continue;
        }
        
        console.log(`📋 Found ${(indexes as any[]).length} indexes in ${tableName}`);
        
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
        
        if (indexesToDrop.length === 0) {
          console.log(`✅ No duplicate indexes to clean in ${tableName}`);
          continue;
        }
        
        console.log(`🗑️ Dropping ${indexesToDrop.length} duplicate indexes from ${tableName}...`);
        
        // Eliminar todos los índices duplicados
        for (const indexName of indexesToDrop) {
          try {
            await sequelize.query(`DROP INDEX \`${indexName}\` ON \`${tableName}\``);
            console.log(`✅ Dropped index: ${indexName} from ${tableName}`);
          } catch (error) {
            console.log(`⚠️ Could not drop index ${indexName} from ${tableName}:`, error instanceof Error ? error.message : String(error));
          }
        }
        
        // Verificar el resultado final
        const [finalIndexes] = await sequelize.query(`
          SHOW INDEX FROM \`${tableName}\` WHERE Key_name != 'PRIMARY'
        `);
        
        console.log(`📋 Final index count for ${tableName}: ${(finalIndexes as any[]).length}`);
        
      } catch (error) {
        console.error(`❌ Error processing table ${tableName}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    console.log('\n✅ All table indexes cleaned successfully');
    
  } catch (error) {
    console.error('❌ Error cleaning table indexes:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanAllTableIndexes();
}

export { cleanAllTableIndexes };
