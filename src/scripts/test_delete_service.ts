import jwt from 'jsonwebtoken';

async function testDeleteService() {
  try {
    console.log('🔍 Probando endpoint de eliminación de servicio...');

    // Crear un token JWT para el usuario isaac (ID: 12)
    const token = jwt.sign(
      { userId: 12, username: 'isaac', role: 'user' },
      'your-secret-key', // Usar la misma clave secreta que el backend
      { expiresIn: '1h' }
    );

    console.log('🔑 Token generado:', token);

    // Simular la llamada HTTP que hace el frontend
    const serviceId = 'testing-remote'; // El servicio que queremos eliminar
    
    const response = await fetch(`http://localhost:3000/api/user/services/${serviceId}`, {
      method: 'DELETE',
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

testDeleteService();

