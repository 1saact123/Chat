import jwt from 'jsonwebtoken';

async function testAdminEndpointHttp() {
  try {
    console.log('🔍 Probando endpoint HTTP del admin...');

    // Crear un token JWT para el admin (ID: 1)
    const token = jwt.sign(
      { userId: 1, username: 'admin', role: 'admin' },
      'your-secret-key', // Usar la misma clave secreta que el backend
      { expiresIn: '1h' }
    );

    console.log('🔑 Token generado:', token);

    // Simular la llamada HTTP que hace el frontend
    const response = await fetch('http://localhost:3000/api/admin/service-validation/pending', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Status de respuesta:', response.status);
    console.log('📊 Headers:', response.headers);

    if (response.ok) {
      const data = await response.json();
      console.log('📊 Datos recibidos:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }

    console.log('\n✅ Prueba completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testAdminEndpointHttp();

