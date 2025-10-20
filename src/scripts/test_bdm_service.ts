import axios from 'axios';

async function testBDMService() {
  try {
    console.log('🧪 === PROBANDO SERVICIO BDM ===\n');

    const baseUrl = 'https://chat.movonte.com';
    const wsUrl = 'wss://chat.movonte.com';
    const serviceId = 'bdm-service';
    const protectedToken = 'svc_9_bdm-service_1760744065606_ei9phkms826';

    console.log('📋 Configuración del servicio:');
    console.log(`   Service ID: ${serviceId}`);
    console.log(`   Token: ${protectedToken.substring(0, 20)}...`);
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   WebSocket URL: ${wsUrl}\n`);

    // 1. Probar endpoint de estado
    console.log('1️⃣ === PROBANDO ENDPOINT DE ESTADO ===');
    try {
      const statusResponse = await axios.get(`${baseUrl}/api/user/services/${serviceId}/status`, {
        headers: {
          'Authorization': `Bearer ${protectedToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`✅ Estado HTTP: ${statusResponse.status}`);
      console.log(`📋 Datos de estado:`, JSON.stringify(statusResponse.data, null, 2));
    } catch (error: any) {
      console.log(`❌ Error en estado: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }

    // 2. Probar endpoint de chat
    console.log('\n2️⃣ === PROBANDO ENDPOINT DE CHAT ===');
    try {
      const chatResponse = await axios.post(`${baseUrl}/api/user/services/${serviceId}/chat`, {
        message: 'Hola, soy un test del servicio BDM. ¿Puedes confirmar que estás funcionando correctamente?',
        threadId: 'test-bdm-thread-123'
      }, {
        headers: {
          'Authorization': `Bearer ${protectedToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log(`✅ Chat HTTP: ${chatResponse.status}`);
      console.log(`📋 Respuesta del chat:`, JSON.stringify(chatResponse.data, null, 2));
    } catch (error: any) {
      console.log(`❌ Error en chat: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }

    // 3. Información sobre WebSocket
    console.log('\n3️⃣ === INFORMACIÓN WEBSOCKET ===');
    console.log('📋 Para probar WebSocket, usa el siguiente código:');
    console.log(`   URL: ${wsUrl}`);
    console.log(`   Service ID: ${serviceId}`);
    console.log(`   Token: ${protectedToken}`);
    console.log('   Eventos: connect, assistant_response, disconnect');
    console.log('   Emit: user_message');

  } catch (error) {
    console.error('❌ Error general en la prueba:', error);
  }
}

// Ejecutar prueba
testBDMService().then(() => {
  console.log('\n✅ === PRUEBA COMPLETADA ===');
  console.log('\n💡 ANÁLISIS:');
  console.log('Si las pruebas de API REST pasaron, significa que:');
  console.log('1. ✅ El servicio BDM está funcionando correctamente');
  console.log('2. ✅ El token protegido es válido');
  console.log('3. ✅ La API REST responde correctamente');
  console.log('4. ✅ El asistente "chatbot test V4" está activo');
  console.log('\n📋 Para probar WebSocket, usa los ejemplos del modal');
}).catch(console.error);
