import { sequelize } from '../config/database';

async function checkDatabaseConfig() {
  console.log('🔍 Checking database configuration...');
  
  // Mostrar configuración actual
  console.log('📋 Current database configuration:');
  console.log('   Host:', process.env.DB_HOST || 'localhost');
  console.log('   Port:', process.env.DB_PORT || '3306');
  console.log('   Database:', process.env.DB_NAME || 'chatbot_db');
  console.log('   Username:', process.env.DB_USER || 'root');
  console.log('   Password:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
  
  console.log('\n🌍 Environment variables:');
  console.log('   NODE_ENV:', process.env.NODE_ENV);
  console.log('   DB_HOST:', process.env.DB_HOST);
  console.log('   DB_PORT:', process.env.DB_PORT);
  console.log('   DB_NAME:', process.env.DB_NAME);
  console.log('   DB_USER:', process.env.DB_USER);
  console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');
  
  // Intentar conectar
  console.log('\n🔌 Testing database connection...');
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Verificar si la tabla users existe
    const [results] = await sequelize.query("SHOW TABLES LIKE 'users'");
    if (results.length > 0) {
      console.log('✅ Users table exists');
      
      // Contar usuarios
      const [userCount] = await sequelize.query("SELECT COUNT(*) as count FROM users");
      console.log(`📊 Total users: ${(userCount as any)[0].count}`);
    } else {
      console.log('❌ Users table does not exist');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Database connection failed:', errorMessage);
    
    if (errorMessage.includes('ECONNREFUSED')) {
      console.log('\n💡 Possible solutions:');
      console.log('   1. Check if MySQL is running locally');
      console.log('   2. Verify RDS connection settings');
      console.log('   3. Check security groups for RDS');
      console.log('   4. Verify RDS endpoint and credentials');
    }
  } finally {
    await sequelize.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkDatabaseConfig();
}

export { checkDatabaseConfig };
