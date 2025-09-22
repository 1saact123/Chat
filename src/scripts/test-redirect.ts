import dotenv from 'dotenv';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { redirectToLoginIfNotAuth, requireAdmin } from '../middleware/auth';

// Cargar variables de entorno
dotenv.config();

async function testRedirect() {
  console.log('🧪 Probando redirección de autenticación...\n');
  
  // Crear app de prueba
  const app = express();
  app.use(cookieParser());
  
  // Ruta protegida
  app.get('/test-protected', redirectToLoginIfNotAuth, requireAdmin, (req, res) => {
    res.json({ message: 'Acceso autorizado' });
  });
  
  // Ruta de login
  app.get('/login', (req, res) => {
    res.json({ message: 'Página de login' });
  });
  
  try {
    console.log('1️⃣ Probando acceso sin autenticación...');
    const response1 = await request(app)
      .get('/test-protected')
      .expect(302);
    
    console.log('✅ Redirección exitosa:', response1.headers.location);
    
    console.log('\n2️⃣ Probando acceso con cookie inválida...');
    const response2 = await request(app)
      .get('/test-protected')
      .set('Cookie', 'authToken=invalid-token')
      .expect(302);
    
    console.log('✅ Redirección con token inválido:', response2.headers.location);
    
    console.log('\n3️⃣ Probando acceso con header inválido...');
    const response3 = await request(app)
      .get('/test-protected')
      .set('Authorization', 'Bearer invalid-token')
      .expect(302);
    
    console.log('✅ Redirección con header inválido:', response3.headers.location);
    
    console.log('\n🎉 Todas las pruebas de redirección pasaron!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testRedirect();
}

export { testRedirect };
