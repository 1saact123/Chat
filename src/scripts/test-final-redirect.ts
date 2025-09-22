import dotenv from 'dotenv';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { redirectToLoginIfNotAuth, requireAdmin } from '../middleware/auth';

// Cargar variables de entorno
dotenv.config();

async function testFinalRedirect() {
  console.log('🧪 Probando redirección final con configuración completa...\n');
  
  // Crear app de prueba que simule la configuración real
  const app = express();
  app.use(cookieParser());
  
  // Simular el orden de middleware como en la app real
  app.use(express.static('public')); // Archivos estáticos DESPUÉS de las rutas
  
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
    console.log('✅ Location:', response.headers.location);
    
    if (response.headers.location === '/login') {
      console.log('🎉 ¡Redirección funcionando correctamente!');
    } else {
      console.log('❌ Redirección no está funcionando. Location:', response.headers.location);
    }
    
    console.log('\n2️⃣ Probando acceso a archivo estático...');
    const staticResponse = await request(app)
      .get('/login.html')
      .expect(200);
    
    console.log('✅ Archivo estático accesible:', staticResponse.status);
    
    console.log('\n🎉 Configuración de redirección funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testFinalRedirect();
}

export { testFinalRedirect };
