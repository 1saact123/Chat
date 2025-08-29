import { OpenAIService } from '../services/openAI_service';

async function debugOpenAIIssue() {
  console.log('🔍 Debugging OpenAI Access Issue');
  console.log('================================\n');
  
  // Verificar configuración básica
  console.log('📋 1. Verificando configuración básica:');
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
  console.log(`   OPENAI_ASSISTANT_ID: ${process.env.OPENAI_ASSISTANT_ID ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ ERROR: OPENAI_API_KEY no está configurada');
    return;
  }
  
  const openaiService = new OpenAIService();
  
  // Test 1: Verificar si la API Key está siendo reconocida
  console.log('\n📋 2. Verificando API Key en el servicio:');
  console.log(`   API Key en servicio: ${openaiService['openai'].apiKey ? 'SÍ' : 'NO'}`);
  
  // Test 2: Simular el payload exacto del ticket BDM-61
  console.log('\n📋 3. Simulando payload del ticket BDM-61:');
  const mockPayload = {
    webhookEvent: 'comment_created',
    issue: {
      key: 'BDM-61',
      fields: {
        summary: 'Test ticket',
        status: { name: 'Open' },
        project: { name: 'Test Project' }
      }
    },
    comment: {
      id: '12345',
      body: 'nescesito ayuda con este ticket',
      author: {
        displayName: 'Isaac Toledo Castillo',
        emailAddress: 'isaac@example.com',
        accountId: 'user-123'
      },
      created: new Date().toISOString()
    }
  };
  
  console.log(`   Comentario: "${mockPayload.comment.body}"`);
  console.log(`   Autor: ${mockPayload.comment.author.displayName}`);
  
  try {
    console.log('\n📋 4. Procesando comentario...');
    const response = await openaiService.processJiraComment(mockPayload);
    
    console.log(`   Resultado: ${response.success ? 'SUCCESS' : 'FAILED'}`);
    if (response.success) {
      console.log(`   Respuesta: ${response.response}`);
      console.log(`   Thread ID: ${response.threadId}`);
      
      // Verificar si es una respuesta de fallback
      if (response.threadId.includes('fallback')) {
        console.log('⚠️  ADVERTENCIA: Se está usando respuesta de fallback');
      } else {
        console.log('✅ Se está usando OpenAI correctamente');
      }
    } else {
      console.log(`   Error: ${response.error}`);
    }
  } catch (error) {
    console.log('❌ Error durante el procesamiento:');
    console.error(error);
  }
  
  // Test 3: Probar llamada directa a OpenAI
  console.log('\n📋 5. Probando llamada directa a OpenAI:');
  try {
    const directResponse = await openaiService.processDirectChat('Hola, esto es una prueba', 'test_direct');
    console.log(`   Resultado directo: ${directResponse.success ? 'SUCCESS' : 'FAILED'}`);
    if (directResponse.success) {
      console.log(`   Respuesta directa: ${directResponse.response}`);
    } else {
      console.log(`   Error directo: ${directResponse.error}`);
    }
  } catch (error) {
    console.log('❌ Error en llamada directa:');
    console.error(error);
  }
  
  // Test 4: Verificar detección de comentarios de IA
  console.log('\n📋 6. Verificando detección de comentarios de IA:');
  const aiCommentPayload = {
    ...mockPayload,
    comment: {
      ...mockPayload.comment,
      body: '¡Hola! Soy el asistente de Movonte. ¿En qué puedo ayudarte hoy?',
      author: {
        displayName: 'CA contact service account',
        emailAddress: 'bot@movonte.com',
        accountId: 'bot-123'
      }
    }
  };
  
  try {
    const aiResponse = await openaiService.processJiraComment(aiCommentPayload);
    console.log(`   Detección de IA: ${aiResponse.success ? 'FALLÓ' : 'FUNCIONA'}`);
    if (!aiResponse.success) {
      console.log(`   Razón: ${aiResponse.error}`);
    }
  } catch (error) {
    console.log('❌ Error en detección de IA:');
    console.error(error);
  }
  
  console.log('\n🎯 Debug completado!');
  console.log('💡 Revisa los resultados arriba para identificar el problema.');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  debugOpenAIIssue().catch(console.error);
}

export { debugOpenAIIssue };
