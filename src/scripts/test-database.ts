import dotenv from 'dotenv';
import { testConnection, syncDatabase } from '../config/database';

// Cargar variables de entorno
dotenv.config();

async function testDatabaseConnection() {
  console.log('🧪 Probando conexión a la base de datos...\n');
  
  console.log('📋 Configuración detectada:');
  console.log('   Host:', process.env.DB_HOST);
  console.log('   Puerto:', process.env.DB_PORT);
  console.log('   Base de datos:', process.env.DB_NAME);
  console.log('   Usuario:', process.env.DB_USER);
  console.log('   Contraseña:', process.env.DB_PASSWORD ? '[CONFIGURADA]' : '[NO CONFIGURADA]');
  
  try {
    console.log('\n🔌 Intentando conectar a la base de datos...');
    const connected = await testConnection();
    
    if (connected) {
      console.log('\n✅ ¡Conexión exitosa!');
      
      console.log('\n🔄 Sincronizando modelos...');
      await syncDatabase();
      
      console.log('\n🎉 Base de datos lista para usar!');
    } else {
      console.log('\n❌ No se pudo conectar a la base de datos');
      console.log('\n🔧 Posibles soluciones:');
      console.log('   1. Verificar que las variables de entorno estén configuradas');
      console.log('   2. Verificar que el RDS esté ejecutándose');
      console.log('   3. Verificar que el security group permita conexiones desde tu IP');
      console.log('   4. Verificar que las credenciales sean correctas');
    }
  } catch (error: any) {
    console.error('\n❌ Error durante la prueba:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 El error ECONNREFUSED indica:');
      console.log('   - El servidor no está ejecutándose en la dirección especificada');
      console.log('   - El puerto está bloqueado por firewall');
      console.log('   - Las credenciales son incorrectas');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n🔧 El error ENOTFOUND indica:');
      console.log('   - El hostname no se puede resolver');
      console.log('   - Verificar que DB_HOST sea correcto');
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testDatabaseConnection();
}

export { testDatabaseConnection };