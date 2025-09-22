import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno existentes
dotenv.config();

console.log('🔧 Configurando variables de autenticación...\n');

// Variables de autenticación requeridas
const authVars = {
  JWT_SECRET: process.env.JWT_SECRET || 'movonte_jwt_secret_' + Math.random().toString(36).substring(2, 15),
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@movonte.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123'
};

console.log('📋 Variables de autenticación:');
console.log('   JWT_SECRET:', authVars.JWT_SECRET);
console.log('   ADMIN_USERNAME:', authVars.ADMIN_USERNAME);
console.log('   ADMIN_EMAIL:', authVars.ADMIN_EMAIL);
console.log('   ADMIN_PASSWORD:', authVars.ADMIN_PASSWORD);

// Verificar si existe archivo .env
const envPath = path.join(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('\n📄 Archivo .env encontrado');
  
  // Leer archivo .env existente
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Verificar si las variables ya existen
  const hasJwtSecret = envContent.includes('JWT_SECRET=');
  const hasAdminUsername = envContent.includes('ADMIN_USERNAME=');
  const hasAdminEmail = envContent.includes('ADMIN_EMAIL=');
  const hasAdminPassword = envContent.includes('ADMIN_PASSWORD=');
  
  console.log('\n🔍 Variables existentes:');
  console.log('   JWT_SECRET:', hasJwtSecret ? '✅ CONFIGURADO' : '❌ FALTANTE');
  console.log('   ADMIN_USERNAME:', hasAdminUsername ? '✅ CONFIGURADO' : '❌ FALTANTE');
  console.log('   ADMIN_EMAIL:', hasAdminEmail ? '✅ CONFIGURADO' : '❌ FALTANTE');
  console.log('   ADMIN_PASSWORD:', hasAdminPassword ? '✅ CONFIGURADO' : '❌ FALTANTE');
  
  if (!hasJwtSecret || !hasAdminUsername || !hasAdminEmail || !hasAdminPassword) {
    console.log('\n📝 Agregando variables faltantes al archivo .env...');
    
    let newEnvContent = envContent;
    
    if (!hasJwtSecret) {
      newEnvContent += `\n# === CONFIGURACIÓN DE AUTENTICACIÓN ===\nJWT_SECRET=${authVars.JWT_SECRET}\n`;
    }
    if (!hasAdminUsername) {
      newEnvContent += `ADMIN_USERNAME=${authVars.ADMIN_USERNAME}\n`;
    }
    if (!hasAdminEmail) {
      newEnvContent += `ADMIN_EMAIL=${authVars.ADMIN_EMAIL}\n`;
    }
    if (!hasAdminPassword) {
      newEnvContent += `ADMIN_PASSWORD=${authVars.ADMIN_PASSWORD}\n`;
    }
    
    // Escribir archivo actualizado
    fs.writeFileSync(envPath, newEnvContent);
    console.log('✅ Variables agregadas al archivo .env');
  } else {
    console.log('\n✅ Todas las variables de autenticación ya están configuradas');
  }
} else {
  console.log('\n📄 Archivo .env no encontrado, creando uno nuevo...');
  
  const envContent = `# === CONFIGURACIÓN DE BASE DE DATOS ===
DB_HOST=${process.env.DB_HOST || 'localhost'}
DB_PORT=${process.env.DB_PORT || '3306'}
DB_NAME=${process.env.DB_NAME || 'chatbot_db'}
DB_USER=${process.env.DB_USER || 'root'}
DB_PASSWORD=${process.env.DB_PASSWORD || ''}

# === CONFIGURACIÓN DE AUTENTICACIÓN ===
JWT_SECRET=${authVars.JWT_SECRET}
ADMIN_USERNAME=${authVars.ADMIN_USERNAME}
ADMIN_EMAIL=${authVars.ADMIN_EMAIL}
ADMIN_PASSWORD=${authVars.ADMIN_PASSWORD}
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Archivo .env creado con todas las variables necesarias');
}

console.log('\n🎉 Configuración de autenticación completada!');
console.log('\n📋 Próximos pasos:');
console.log('   1. Ejecutar: npm run create-admin');
console.log('   2. Ejecutar: npm run build');
console.log('   3. Ejecutar: npm start');
console.log('\n🔑 Credenciales de acceso:');
console.log(`   Usuario: ${authVars.ADMIN_USERNAME}`);
console.log(`   Contraseña: ${authVars.ADMIN_PASSWORD}`);
console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login!');
