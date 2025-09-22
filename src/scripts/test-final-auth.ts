import dotenv from 'dotenv';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { redirectToLoginIfNotAuth, requireAdmin } from '../middleware/auth';
import { login } from '../controllers/auth_controller';

// Cargar variables de entorno
dotenv.config();

async function testFinalAuth() {
  console.log('🧪 Probando sistema de autenticación completo...\n');
  
  // Crear app de prueba
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  
  // Ruta de login
  app.post('/api/auth/login', login);
  
  // Ruta protegida (simulando la ruta raíz)
  app.get('/', redirectToLoginIfNotAuth, requireAdmin, (req, res) => {
    res.json({ message: 'Dashboard accesible', user: req.user });
  });
  
  // Ruta de login HTML
  app.get('/login', (req, res) => {
    res.json({ message: 'Página de login' });
  });
  
  try {
    console.log('1️⃣ Probando acceso a ruta raíz sin autenticación...');
    const response1 = await request(app)
      .get('/')
      .expect(302);
    
    console.log('✅ Redirección exitosa a:', response1.headers.location);
    
    console.log('\n2️⃣ Probando login...');
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      })
      .expect(200);
    
    console.log('✅ Login exitoso');
    console.log('🍪 Cookie generada:', loginResponse.headers['set-cookie'] ? 'SÍ' : 'NO');
    
    // Extraer cookie del login
    const cookies = loginResponse.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      console.log('\n3️⃣ Probando acceso con cookie válida...');
      const response2 = await request(app)
        .get('/')
        .set('Cookie', cookies[0])
        .expect(200);
      
      console.log('✅ Acceso autorizado:', response2.body.message);
    }
    
    console.log('\n🎉 Sistema de autenticación funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testFinalAuth();
}

export { testFinalAuth };
