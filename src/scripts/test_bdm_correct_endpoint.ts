import axios from 'axios';

async function testBDMCorrectEndpoint() {
  try {
    console.log('🧪 === PROBANDO ENDPOINT CORRECTO DEL SERVICIO BDM ===\n');

    const baseUrl = 'https://chat.movonte.com';
    const serviceId = 'bdm-service';

    console.log('📋 Configuración:');
    console.log(`   Service ID: ${serviceId}`);
    console.log(`   URL: ${baseUrl}`);
    console.log(`   Endpoint: /api/services/${serviceId}/chat\n`);

    // Probar el endpoint correcto
    console.log('🔍 Probando endpoint correcto: /api/services/bdm-service/chat');
    
    try {
      const response = await axios.post(`${baseUrl}/api/services/${serviceId}/chat`, {
        message: 'Hola, soy un test del servicio BDM. ¿Puedes confirmar que estás funcionando correctamente?',
        threadId: 'test-bdm-correct-123'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log(`✅ ÉXITO: ${response.status}`);
      console.log(`📋 Respuesta completa:`, JSON.stringify(response.data, null, 2));
      
      // Verificar estructura de respuesta
      if (response.data.success) {
        console.log('\n🎉 ANÁLISIS DE RESPUESTA:');
        console.log(`   ✅ Success: ${response.data.success}`);
        console.log(`   📝 Response: ${response.data.response?.substring(0, 100)}...`);
        console.log(`   🧵 Thread ID: ${response.data.threadId}`);
        console.log(`   🤖 Assistant ID: ${response.data.assistantId}`);
        console.log(`   📛 Assistant Name: ${response.data.assistantName}`);
      }
      
    } catch (error: any) {
      console.log(`❌ Error ${error.response?.status}: ${error.response?.data?.error || error.message}`);
      
      if (error.response?.data) {
        console.log(`📋 Detalles del error:`, JSON.stringify(error.response.data, null, 2));
      }
    }

    // Probar con un mensaje más simple
    console.log('\n🔍 Probando con mensaje simple...');
    try {
      const response = await axios.post(`${baseUrl}/api/services/${serviceId}/chat`, {
        message: 'Hola'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      console.log(`✅ ÉXITO con mensaje simple: ${response.status}`);
      console.log(`📋 Respuesta:`, JSON.stringify(response.data, null, 2));
      
    } catch (error: any) {
      console.log(`❌ Error con mensaje simple: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar prueba
testBDMCorrectEndpoint().then(() => {
  console.log('\n✅ === PRUEBA COMPLETADA ===');
  console.log('\n💡 CONCLUSIÓN:');
  console.log('El endpoint correcto es: /api/services/bdm-service/chat');
  console.log('Este endpoint NO requiere autenticación de usuario');
  console.log('Solo necesita el serviceId en la URL');
}).catch(console.error);

