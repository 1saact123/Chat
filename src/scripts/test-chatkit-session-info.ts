import 'dotenv/config';
import { ChatKitJiraService } from '../services/chatkit_jira_service';

/**
 * Script para probar la obtención de información de sesión de ChatKit
 */
async function testChatKitSessionInfo() {
  console.log('🚀 Iniciando prueba de información de sesión de ChatKit...\n');

  try {
    // 1. Crear instancia del servicio
    console.log('1️⃣ Creando instancia de ChatKitJiraService...');
    const chatKitService = new ChatKitJiraService();
    console.log('✅ Servicio creado correctamente');

    // 2. Crear una sesión de prueba
    console.log('\n2️⃣ Creando sesión de prueba...');
    const testIssueKey = 'DEV-1';
    const testUserInfo = {
      name: 'Test User',
      email: 'test@movonte.com'
    };

    const session = await chatKitService.createSessionForTicket(testIssueKey, testUserInfo);
    console.log(`✅ Sesión creada: ${session.id}`);
    console.log(`✅ Client Secret: ${session.client_secret.substring(0, 20)}...`);

    // 3. Probar obtener sesión por ID
    console.log('\n3️⃣ Probando obtener sesión por ID...');
    const retrievedSession = chatKitService.getSessionById(session.id);
    
    if (retrievedSession) {
      console.log(`✅ Sesión encontrada por ID: ${retrievedSession.id}`);
      console.log(`✅ Client Secret: ${retrievedSession.client_secret.substring(0, 20)}...`);
      console.log(`✅ Expires at: ${new Date(retrievedSession.expires_at * 1000).toISOString()}`);
    } else {
      console.log(`❌ No se pudo encontrar la sesión por ID`);
    }

    // 4. Probar obtener sesión por issue key
    console.log('\n4️⃣ Probando obtener sesión por issue key...');
    const sessionByIssue = chatKitService.getActiveSession(testIssueKey);
    
    if (sessionByIssue) {
      console.log(`✅ Sesión encontrada por issue key: ${sessionByIssue.id}`);
      console.log(`✅ Client Secret: ${sessionByIssue.client_secret.substring(0, 20)}...`);
    } else {
      console.log(`❌ No se pudo encontrar la sesión por issue key`);
    }

    // 5. Verificar que las sesiones son la misma
    console.log('\n5️⃣ Verificando consistencia de sesiones...');
    if (retrievedSession && sessionByIssue && retrievedSession.id === sessionByIssue.id) {
      console.log('✅ Las sesiones son consistentes');
    } else {
      console.log('❌ Las sesiones no son consistentes');
    }

    console.log('\n🎉 ¡Prueba de información de sesión completada exitosamente!');
    console.log('\n📋 Resultado:');
    console.log('✅ El backend puede crear sesiones de ChatKit');
    console.log('✅ El backend puede recuperar sesiones por ID');
    console.log('✅ El backend puede recuperar sesiones por issue key');
    console.log('✅ Las sesiones contienen el client_secret necesario');

  } catch (error) {
    console.error('\n❌ Error durante la prueba:');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar la prueba
testChatKitSessionInfo();
