import 'dotenv/config';
import { ChatKitJiraService } from '../services/chatkit_jira_service';

/**
 * Script para probar la migración a ChatKit
 */
async function testChatKitMigration() {
  console.log('🚀 Iniciando prueba de migración a ChatKit...\n');

  try {
    // 1. Verificar variables de entorno
    console.log('1️⃣ Verificando variables de entorno...');
    const workflowId = process.env.OPENAI_CHATKIT_WORKFLOW_ID;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!workflowId) {
      throw new Error('❌ OPENAI_CHATKIT_WORKFLOW_ID no está configurado');
    }
    if (!apiKey) {
      throw new Error('❌ OPENAI_API_KEY no está configurado');
    }

    console.log(`✅ Workflow ID: ${workflowId}`);
    console.log(`✅ API Key: ${apiKey.substring(0, 10)}...`);

    // 2. Crear instancia del servicio
    console.log('\n2️⃣ Creando instancia de ChatKitJiraService...');
    const chatKitService = new ChatKitJiraService();
    console.log('✅ Servicio creado correctamente');

    // 3. Probar creación de sesión
    console.log('\n3️⃣ Probando creación de sesión de ChatKit...');
    const testIssueKey = 'TI-589';
    const testUserInfo = {
      name: 'Test User',
      email: 'test@movonte.com'
    };

    const session = await chatKitService.createSessionForTicket(testIssueKey, testUserInfo);
    console.log(`✅ Sesión creada: ${session.id}`);
    console.log(`✅ Client Secret: ${session.client_secret.substring(0, 20)}...`);

    // 4. Probar procesamiento de mensaje del widget
    console.log('\n4️⃣ Probando procesamiento de mensaje del widget...');
    const widgetResult = await chatKitService.processWidgetMessage(
      testIssueKey,
      'Hola, este es un mensaje de prueba',
      testUserInfo
    );

    if (widgetResult.success) {
      console.log('✅ Mensaje del widget procesado correctamente');
      console.log(`✅ Session ID: ${widgetResult.sessionId}`);
    } else {
      console.log(`❌ Error procesando mensaje del widget: ${widgetResult.error}`);
    }

    // 5. Probar procesamiento de comentario de Jira
    console.log('\n5️⃣ Probando procesamiento de comentario de Jira...');
    const jiraResult = await chatKitService.processJiraComment(
      testIssueKey,
      'Este es un comentario de prueba desde Jira',
      { displayName: 'Jira User', emailAddress: 'jira@movonte.com' }
    );

    if (jiraResult.success) {
      console.log('✅ Comentario de Jira procesado correctamente');
      console.log(`✅ Session ID: ${jiraResult.sessionId}`);
    } else {
      console.log(`❌ Error procesando comentario de Jira: ${jiraResult.error}`);
    }

    // 6. Verificar sesiones activas
    console.log('\n6️⃣ Verificando sesiones activas...');
    const hasActiveSession = chatKitService.hasActiveSession(testIssueKey);
    console.log(`✅ Sesión activa para ${testIssueKey}: ${hasActiveSession}`);

    console.log('\n🎉 ¡Migración a ChatKit probada exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Cambia el webhook de Jira a /api/chatkit/webhook/jira');
    console.log('2. Prueba con un comentario real en Jira');
    console.log('3. Verifica los logs del backend');

  } catch (error) {
    console.error('\n❌ Error durante la prueba de migración:');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar la prueba
testChatKitMigration();
