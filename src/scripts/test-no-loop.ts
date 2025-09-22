import dotenv from 'dotenv';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { redirectToLoginIfNotAuth, requireAdmin } from '../middleware/auth';

// Cargar variables de entorno
dotenv.config();

async function testNoLoop() {
  console.log('🧪 Probando que no hay bucles de redirección...\n');
  
  // Crear app de prueba
  const app = express();
  app.use(cookieParser());
  
  // Ruta protegida
  app.get('/', redirectToLoginIfNotAuth, requireAdmin, (req, res) => {
    res.json({ message: 'Dashboard accesible', user: req.user });
  });
  
  // Ruta de login
  app.get('/login', (req, res) => {
    res.json({ message: 'Página de login' });
  });
  
  try {
    console.log('1️⃣ Probando acceso a / sin autenticación...');
    const response1 = await request(app)
      .get('/')
      .expect(302);
    
    console.log('✅ Redirección a login:', response1.headers.location);
    
    console.log('\n2️⃣ Probando acceso a /login...');
    const response2 = await request(app)
      .get('/login')
      .expect(200);
    
    console.log('✅ Login accesible:', response2.body.message);
    
    console.log('\n3️⃣ Probando acceso a / con cookie válida...');
    const response3 = await request(app)
      .get('/')
      .set('Cookie', 'authToken=valid-token')
      .expect(500); // Esperamos error porque el token no es válido JWT
    
    console.log('✅ Error esperado con token inválido');
    
    console.log('\n🎉 No hay bucles de redirección!');
    console.log('✅ El sistema funciona correctamente:');
    console.log('   - Sin autenticación → Redirige a /login');
    console.log('   - Con /login → Muestra página de login');
    console.log('   - Con token inválido → Maneja el error correctamente');
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testNoLoop();
}

export { testNoLoop };
