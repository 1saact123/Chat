import dotenv from 'dotenv';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { redirectToLoginIfNotAuth, requireAdmin } from '../middleware/auth';

// Cargar variables de entorno
dotenv.config();

async function debugApp() {
  console.log('🔍 Debugging app configuration...\n');
  
  // Crear app de prueba EXACTAMENTE como en la app real
  const app = express();
  app.use(cookieParser());
  
  // Middleware personalizado para interceptar la ruta raíz ANTES de los archivos estáticos
  app.get('/', redirectToLoginIfNotAuth, requireAdmin, (req, res) => {
    console.log('✅ Ruta protegida ejecutada');
    res.json({ message: 'Dashboard accesible', user: req.user });
  });
  
  // Servir archivos estáticos DESPUÉS de las rutas
  app.use(express.static('public'));
  
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
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    console.log('🔍 Esto significa que la ruta protegida NO se está ejecutando');
    console.log('🔍 El archivo estático se está sirviendo en su lugar');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  debugApp();
}

export { debugApp };
