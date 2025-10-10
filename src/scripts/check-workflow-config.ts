#!/usr/bin/env ts-node

/**
 * Script para verificar la configuración del workflow
 */

import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function checkWorkflowConfig() {
  console.log('🔍 Verificando configuración del workflow...\n');

  const apiKey = process.env.OPENAI_API_KEY;
  const workflowId = process.env.OPENAI_CHATKIT_WORKFLOW_ID;

  if (!apiKey || !workflowId) {
    console.log('❌ Variables de entorno faltantes');
    return;
  }

  console.log(`📋 Workflow ID: ${workflowId}`);

  try {
    // Verificar si el workflow existe usando la API de workflows
    console.log('\n🔧 Verificando workflow...');
    
    // Intentar obtener información del workflow usando diferentes endpoints
    const endpoints = [
      `https://api.openai.com/v1/workflows/${workflowId}`,
      `https://api.openai.com/v1/assistants/${workflowId}`,
      `https://api.openai.com/v1/chatkit/workflows/${workflowId}`
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`\n🌐 Probando: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'chatkit_beta=v1',
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Workflow encontrado en: ${endpoint}`);
          console.log(`📊 Datos del workflow:`, JSON.stringify(data, null, 2));
          return;
        } else {
          const error = await response.text();
          console.log(`❌ Error en ${endpoint}: ${error}`);
        }
      } catch (error) {
        console.log(`❌ Error de conexión en ${endpoint}: ${error}`);
      }
    }

    // Si no encontramos el workflow, probemos crear una sesión y ver qué pasa
    console.log('\n🧪 Probando creación de sesión...');
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

    if (sessionResponse.ok) {
      const session = await sessionResponse.json() as any;
      console.log(`✅ Sesión creada exitosamente`);
      console.log(`📝 Session ID: ${session.id}`);
      console.log(`🔑 Client Secret: ${session.client_secret?.substring(0, 20)}...`);
      
      // Verificar si la sesión tiene información del workflow
      if (session.workflow) {
        console.log(`📋 Workflow en sesión:`, JSON.stringify(session.workflow, null, 2));
      }
      
      console.log('\n🎯 DIAGNÓSTICO:');
      console.log('================');
      console.log('✅ El workflow existe y se puede crear sesiones');
      console.log('✅ La configuración del backend es correcta');
      console.log('❌ El problema está en el frontend o en la configuración del workflow');
      console.log('\n💡 SOLUCIONES POSIBLES:');
      console.log('1. Verificar que el workflow tenga un system message configurado');
      console.log('2. Asegurarse de que el workflow esté publicado');
      console.log('3. Revisar la configuración del widget de ChatKit en el frontend');
      console.log('4. Verificar que el script de ChatKit esté cargado correctamente');
      
    } else {
      const error = await sessionResponse.text();
      console.log(`❌ Error creando sesión: ${error}`);
    }

  } catch (error) {
    console.log(`❌ Error durante la verificación: ${error}`);
  }
}

// Ejecutar verificación
if (require.main === module) {
  checkWorkflowConfig();
}

export { checkWorkflowConfig };
