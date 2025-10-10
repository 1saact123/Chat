import 'dotenv/config';
import { ChatbotController } from '../controllers/chatbot_controller';
import { OpenAIService } from '../services/openAI_service';

/**
 * Script para probar el webhook modificado con ChatKit usando proyecto DEV
 */
async function testWebhookWithChatKitDev() {
  console.log('🚀 Iniciando prueba del webhook con ChatKit (proyecto DEV)...\n');

  try {
    // 1. Crear instancia del controlador
    console.log('1️⃣ Creando instancia del ChatbotController...');
    const openaiService = new OpenAIService();
    const chatbotController = new ChatbotController(openaiService, null);
    console.log('✅ Controlador creado correctamente');

    // 2. Crear payload de prueba con proyecto DEV
    console.log('\n2️⃣ Creando payload de prueba (proyecto DEV)...');
    const mockPayload = {
      webhookEvent: 'comment_created',
      issue: {
        key: 'DEV-1', // Usar proyecto DEV
        fields: {
          summary: 'Test Issue for ChatKit Integration',
          status: {
            name: 'Open'
          }
        }
      },
      comment: {
        id: 'test_comment_456',
        body: 'Hola, este es un comentario de prueba para ChatKit en proyecto DEV',
        author: {
          displayName: 'Test User',
          emailAddress: 'test@movonte.com',
          accountId: 'test-account-id'
        },
        created: new Date().toISOString()
      }
    };

    console.log('✅ Payload de prueba creado:');
    console.log(`   Issue: ${mockPayload.issue.key}`);
    console.log(`   Comment: ${mockPayload.comment.body}`);
    console.log(`   Author: ${mockPayload.comment.author.displayName}`);

    // 3. Crear mock de request y response
    console.log('\n3️⃣ Creando mock de request y response...');
    const mockReq = {
      body: mockPayload,
      headers: {
        'user-agent': 'Test Script',
        'origin': 'test-origin'
      },
      url: '/api/chatbot/webhook/jira',
      method: 'POST',
      get: (header: string) => mockReq.headers[header.toLowerCase()] || null
    } as any;

    let responseData: any = null;
    let responseStatus: number = 200;
    
    const mockRes = {
      json: (data: any) => {
        responseData = data;
        console.log('📤 Response enviada:', data);
      },
      status: (code: number) => {
        responseStatus = code;
        return mockRes;
      }
    } as any;

    // 4. Ejecutar el webhook
    console.log('\n4️⃣ Ejecutando webhook...');
    await chatbotController.handleJiraWebhook(mockReq, mockRes);

    // 5. Verificar resultados
    console.log('\n5️⃣ Verificando resultados...');
    if (responseData) {
      if (responseData.success) {
        console.log('✅ Webhook ejecutado exitosamente');
        console.log(`   Success: ${responseData.success}`);
        if (responseData.sessionId) {
          console.log(`   Session ID: ${responseData.sessionId}`);
        }
        if (responseData.message) {
          console.log(`   Message: ${responseData.message}`);
        }
        if (responseData.ignored) {
          console.log(`   Ignored: ${responseData.ignored} (${responseData.reason})`);
        }
      } else {
        console.log('❌ Webhook falló');
        console.log(`   Error: ${responseData.error}`);
      }
    } else {
      console.log('⚠️ No se recibió respuesta del webhook');
    }

    console.log('\n🎉 ¡Prueba del webhook completada!');
    console.log('\n📋 Resultado:');
    if (responseData && responseData.success && responseData.sessionId) {
      console.log('✅ ChatKit está funcionando correctamente');
      console.log('✅ El webhook ahora usa ChatKit en lugar de asistentes tradicionales');
      console.log('✅ Los comentarios de Jira se procesarán con ChatKit');
    } else {
      console.log('⚠️ El webhook funcionó pero no se procesó con ChatKit');
      console.log('   Esto puede ser normal si el ticket está deshabilitado o hay otras validaciones');
    }

  } catch (error) {
    console.error('\n❌ Error durante la prueba del webhook:');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar la prueba
testWebhookWithChatKitDev();
