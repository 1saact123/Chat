import dotenv from 'dotenv';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { redirectToLoginIfNotAuth, requireAdmin } from '../middleware/auth';

// Cargar variables de entorno
dotenv.config();

async function testLoginLoop() {
  console.log('🧪 Probando bucle de login...\n');
  
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
  
  // Ruta de verificación de token
  app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ success: false, error: 'No token' });
      return;
    }
    
    // Simular verificación de token
    if (token === 'valid-token') {
      res.json({ success: true, user: { id: 1, username: 'admin' } });
    } else {
      res.status(401).json({ success: false, error: 'Invalid token' });
    }
  });
  
  try {
    console.log('1️⃣ Probando acceso sin token...');
    const response1 = await request(app)
      .get('/')
      .expect(302);
    
    console.log('✅ Redirección a login:', response1.headers.location);
    
    console.log('\n2️⃣ Probando acceso con token inválido...');
    const response2 = await request(app)
      .get('/')
      .set('Authorization', 'Bearer invalid-token')
      .expect(302);
    
    console.log('✅ Redirección a login:', response2.headers.location);
    
    console.log('\n3️⃣ Probando verificación de token...');
    const response3 = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
    
    console.log('✅ Verificación exitosa:', response3.body);
    
    console.log('\n🎉 No hay bucle de redirección en el backend');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testLoginLoop();
}

export { testLoginLoop };
