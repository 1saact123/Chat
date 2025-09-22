import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

console.log('🔍 Verificando configuración de base de datos...\n');

console.log('📋 Variables de entorno:');
console.log('   DB_HOST:', process.env.DB_HOST || 'NO CONFIGURADO (default: localhost)');
console.log('   DB_PORT:', process.env.DB_PORT || 'NO CONFIGURADO (default: 3306)');
console.log('   DB_NAME:', process.env.DB_NAME || 'NO CONFIGURADO (default: chatbot_db)');
console.log('   DB_USER:', process.env.DB_USER || 'NO CONFIGURADO (default: root)');
console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '[CONFIGURADO]' : 'NO CONFIGURADO');

console.log('\n🔧 Configuración actual:');
console.log('   Host:', process.env.DB_HOST || 'localhost');
console.log('   Puerto:', process.env.DB_PORT || '3306');
console.log('   Base de datos:', process.env.DB_NAME || 'chatbot_db');
console.log('   Usuario:', process.env.DB_USER || 'root');

console.log('\n⚠️  Si estás usando RDS, necesitas configurar:');
console.log('   DB_HOST=tu-rds-endpoint.amazonaws.com');
console.log('   DB_PORT=3306');
console.log('   DB_NAME=nombre_de_tu_base_de_datos');
console.log('   DB_USER=tu_usuario_rds');
console.log('   DB_PASSWORD=tu_contraseña_rds');

console.log('\n📝 Ejemplo de .env para RDS:');
console.log('   DB_HOST=movonte-db.cluster-xyz.us-east-1.rds.amazonaws.com');
console.log('   DB_PORT=3306');
console.log('   DB_NAME=movonte_db');
console.log('   DB_USER=admin');
console.log('   DB_PASSWORD=tu_contraseña_segura');

console.log('\n🔑 Variables de autenticación:');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '[CONFIGURADO]' : 'NO CONFIGURADO');
console.log('   ADMIN_USERNAME:', process.env.ADMIN_USERNAME || 'NO CONFIGURADO (default: admin)');
console.log('   ADMIN_EMAIL:', process.env.ADMIN_EMAIL || 'NO CONFIGURADO (default: admin@movonte.com)');
console.log('   ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '[CONFIGURADO]' : 'NO CONFIGURADO (default: admin123)');
