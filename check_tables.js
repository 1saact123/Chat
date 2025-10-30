import { sequelize } from './src/config/database';

async function checkTables() {
  try {
    console.log('🔍 Verificando tablas en la base de datos...');
    
    const [tables] = await sequelize.query('SHOW TABLES');
    console.log('\n📋 Tablas existentes:');
    tables.forEach((table: any) => {
      const tableName = Object.values(table)[0];
      console.log(`- ${tableName}`);
    });
    
    // Verificar si user_webhooks existe
    const [userWebhooksExists] = await sequelize.query('SHOW TABLES LIKE "user_webhooks"');
    console.log(`\n✅ user_webhooks existe: ${userWebhooksExists.length > 0}`);
    
    // Verificar estructura de user_webhooks si existe
    if (userWebhooksExists.length > 0) {
      const [columns] = await sequelize.query('DESCRIBE user_webhooks');
      console.log('\n📊 Columnas de user_webhooks:');
      columns.forEach((col: any) => console.log(`- ${col.Field}: ${col.Type}`));
      
      // Contar registros
      const [count] = await sequelize.query('SELECT COUNT(*) as count FROM user_webhooks');
      console.log(`\n📈 Registros en user_webhooks: ${(count as any[])[0].count}`);
    }
    
    // Verificar si saved_webhooks existe
    const [savedWebhooksExists] = await sequelize.query('SHOW TABLES LIKE "saved_webhooks"');
    console.log(`\n✅ saved_webhooks existe: ${savedWebhooksExists.length > 0}`);
    
    if (savedWebhooksExists.length > 0) {
      const [count] = await sequelize.query('SELECT COUNT(*) as count FROM saved_webhooks');
      console.log(`📈 Registros en saved_webhooks: ${(count as any[])[0].count}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkTables();

