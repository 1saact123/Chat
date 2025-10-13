#!/usr/bin/env ts-node

/**
 * Script para probar si el workflow está generando respuestas
 */

import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function testWorkflowResponses() {
  console.log('🧪 Probando respuestas del workflow...\n');

  const apiKey = process.env.OPENAI_API_KEY;
  const workflowId = process.env.OPENAI_CHATKIT_WORKFLOW_ID;

  if (!apiKey || !workflowId) {
    console.log('❌ Variables de entorno faltantes');
    return;
  }

  console.log(`📋 Workflow ID: ${workflowId}`);

  try {
    // 1. Crear sesión
    console.log('\n🔄 1. Creando sesión...');
    const sessionResponse = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'chatkit_beta=v1',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflow: {
          id: workflowId
        },
        user: 'test_user'
      })
    });

    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      console.log(`❌ Error creando sesión: ${error}`);
      return;
    }

    const session = await sessionResponse.json() as any;
    console.log(`✅ Sesión creada: ${session.id}`);
    console.log(`🔑 Client Secret: ${session.client_secret.substring(0, 20)}...`);

    // 2. Enviar mensaje usando el client_secret
    console.log('\n💬 2. Enviando mensaje de prueba...');
    
    const messageResponse = await fetch(`https://api.openai.com/v1/chatkit/sessions/${session.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.client_secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: 'Hola, ¿puedes ayudarme?',
        role: 'user'
      })
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.text();
      console.log(`❌ Error enviando mensaje: ${error}`);
      return;
    }

    const messageResult = await messageResponse.json() as any;
    console.log(`✅ Mensaje enviado exitosamente`);
    console.log(`📝 Respuesta completa:`, JSON.stringify(messageResult, null, 2));
    
    // 3. Verificar si hay respuestas del asistente
    console.log('\n🔍 3. Verificando respuestas del asistente...');
    
    if (messageResult.messages && messageResult.messages.length > 0) {
      const assistantMessage = messageResult.messages.find((msg: any) => msg.role === 'assistant');
      if (assistantMessage) {
        console.log(`🤖 Respuesta del asistente: "${assistantMessage.content}"`);
        console.log(`✅ El workflow está generando respuestas correctamente`);
        console.log(`✅ El problema está en el frontend, no en el workflow`);
      } else {
        console.log(`❌ No se encontró respuesta del asistente`);
        console.log(`❌ El workflow no está generando respuestas`);
        console.log(`💡 Posibles causas:`);
        console.log(`   - El workflow no tiene un system message configurado`);
        console.log(`   - El workflow no está publicado`);
        console.log(`   - El workflow está inactivo`);
      }
    } else {
      console.log(`❌ No hay mensajes en la respuesta`);
      console.log(`❌ El workflow no está funcionando correctamente`);
    }

    // 4. Probar con un mensaje más simple
    console.log('\n🔄 4. Probando con mensaje más simple...');
    
    const simpleMessageResponse = await fetch(`https://api.openai.com/v1/chatkit/sessions/${session.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.client_secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: 'Hola',
        role: 'user'
      })
    });

    if (simpleMessageResponse.ok) {
      const simpleResult = await simpleMessageResponse.json() as any;
      console.log(`✅ Mensaje simple enviado`);
      
      if (simpleResult.messages && simpleResult.messages.length > 0) {
        const assistantMessage = simpleResult.messages.find((msg: any) => msg.role === 'assistant');
        if (assistantMessage) {
          console.log(`🤖 Respuesta simple: "${assistantMessage.content}"`);
        } else {
          console.log(`❌ No hay respuesta del asistente para el mensaje simple`);
        }
      }
    }

  } catch (error) {
    console.log(`❌ Error durante la prueba: ${error}`);
  }
}

// Ejecutar prueba
if (require.main === module) {
  testWorkflowResponses();
}

export { testWorkflowResponses };

