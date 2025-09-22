import dotenv from 'dotenv';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { redirectToLoginIfNotAuth, requireAdmin } from '../middleware/auth';

// Cargar variables de entorno
dotenv.config();

async function testRedirectDebug() {
  console.log('🧪 Probando redirección paso a paso...\n');
  
  // Crear app de prueba
  const app = express();
  app.use(cookieParser());
  
  // Ruta protegida (simulando la ruta raíz)
  app.get('/', redirectToLoginIfNotAuth, requireAdmin, (req, res) => {
    res.json({ message: 'Dashboard accesible', user: req.user });
  });
  
  // Ruta de login
  app.get('/login', (req, res) => {
    res.json({ message: 'Página de login' });
  });
  
  try {
    console.log('1️⃣ Probando acceso a ruta raíz sin autenticación...');
    const response = await request(app)
      .get('/')
      .expect(302);
    
    console.log('✅ Status:', response.status);
    console.log('✅ Headers:', response.headers);
    console.log('✅ Location:', response.headers.location);
    
    if (response.headers.location === '/login') {
      console.log('🎉 ¡Redirección funcionando correctamente!');
    } else {
      console.log('❌ Redirección no está funcionando. Location:', response.headers.location);
    }
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testRedirectDebug();
}

export { testRedirectDebug };
