import axios from 'axios';

async function testBDMSimple() {
  try {
    console.log('🧪 === PRUEBA SIMPLE DEL SERVICIO BDM ===\n');

    const baseUrl = 'https://chat.movonte.com';
    const serviceId = 'bdm-service';
    const protectedToken = 'svc_9_bdm-service_1760744065606_ei9phkms826';

    console.log('📋 Configuración:');
    console.log(`   Service ID: ${serviceId}`);
    console.log(`   Token: ${protectedToken.substring(0, 30)}...`);
    console.log(`   URL: ${baseUrl}\n`);

    // Probar endpoint de chat con diferentes variaciones
    const endpoints = [
      `/api/user/services/${serviceId}/chat`,
      `/api/services/${serviceId}/chat`,
      `/api/chat/${serviceId}`,
      `/api/user/chat/${serviceId}`
    ];

    for (const endpoint of endpoints) {
      console.log(`🔍 Probando endpoint: ${endpoint}`);
      
      try {
        const response = await axios.post(`${baseUrl}${endpoint}`, {
          message: 'Hola, ¿puedes confirmar que estás funcionando?',
          threadId: 'test-simple-123'
        }, {
          headers: {
            'Authorization': `Bearer ${protectedToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        console.log(`✅ ÉXITO: ${response.status}`);
        console.log(`📋 Respuesta:`, JSON.stringify(response.data, null, 2));
        break; // Si funciona, no probar más endpoints
        
      } catch (error: any) {
        console.log(`❌ Error ${error.response?.status}: ${error.response?.data?.error || error.message}`);
      }
    }

    // Probar sin token para ver si el endpoint existe
    console.log('\n🔍 Probando endpoint sin token:');
    try {
      const response = await axios.post(`${baseUrl}/api/user/services/${serviceId}/chat`, {
        message: 'Test sin token'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      console.log(`✅ Endpoint existe: ${response.status}`);
    } catch (error: any) {
      console.log(`❌ Endpoint no existe o requiere autenticación: ${error.response?.status}`);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar prueba
testBDMSimple().then(() => {
  console.log('\n✅ === PRUEBA COMPLETADA ===');
}).catch(console.error);





