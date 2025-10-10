#!/usr/bin/env ts-node

/**
 * Script para probar el workflow de ChatKit directamente
 */

import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function testWorkflow() {
  console.log('🧪 Probando workflow de ChatKit...\n');

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

    // 2. Probar mensaje
    console.log('\n💬 2. Enviando mensaje de prueba...');
    
    // Simular el envío de un mensaje usando el client_secret
    const messageResponse = await fetch('https://api.openai.com/v1/chatkit/sessions/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.client_secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          role: 'user',
          content: 'Hola, ¿puedes ayudarme?'
        }
      })
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.text();
      console.log(`❌ Error enviando mensaje: ${error}`);
      return;
    }

    const messageResult = await messageResponse.json();
    console.log(`✅ Mensaje enviado exitosamente`);
    console.log(`📝 Respuesta: ${JSON.stringify(messageResult, null, 2)}`);

  } catch (error) {
    console.log(`❌ Error durante la prueba: ${error}`);
  }
}

// Ejecutar prueba
if (require.main === module) {
  testWorkflow();
}

export { testWorkflow };
