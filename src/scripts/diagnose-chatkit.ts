#!/usr/bin/env ts-node

/**
 * Script de Diagnóstico para ChatKit
 * Verifica la configuración y conectividad de ChatKit
 */

import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

interface ChatKitDiagnostic {
  environment: {
    openaiApiKey: boolean;
    workflowId: boolean;
    apiKeyFormat: boolean;
  };
  workflow: {
    exists: boolean;
    published: boolean;
    hasSystemMessage: boolean;
  };
  connectivity: {
    openaiApi: boolean;
    chatkitEndpoint: boolean;
  };
}

async function diagnoseChatKit(): Promise<ChatKitDiagnostic> {
  console.log('🔍 Iniciando diagnóstico de ChatKit...\n');

  const diagnostic: ChatKitDiagnostic = {
    environment: {
      openaiApiKey: false,
      workflowId: false,
      apiKeyFormat: false
    },
    workflow: {
      exists: false,
      published: false,
      hasSystemMessage: false
    },
    connectivity: {
      openaiApi: false,
      chatkitEndpoint: false
    }
  };

  // 1. Verificar variables de entorno
  console.log('📋 1. Verificando variables de entorno...');
  
  const apiKey = process.env.OPENAI_API_KEY;
  const workflowId = process.env.OPENAI_CHATKIT_WORKFLOW_ID;

  diagnostic.environment.openaiApiKey = !!apiKey;
  diagnostic.environment.workflowId = !!workflowId;
  diagnostic.environment.apiKeyFormat = apiKey?.startsWith('sk-') || false;

  console.log(`   OPENAI_API_KEY: ${apiKey ? '✅ Configurada' : '❌ No configurada'}`);
  console.log(`   OPENAI_CHATKIT_WORKFLOW_ID: ${workflowId ? '✅ Configurada' : '❌ No configurada'}`);
  console.log(`   Formato API Key: ${diagnostic.environment.apiKeyFormat ? '✅ Correcto' : '❌ Incorrecto'}`);

  if (!apiKey || !workflowId) {
    console.log('\n❌ ERROR: Variables de entorno faltantes');
    console.log('   Configura las siguientes variables en tu archivo .env:');
    console.log('   OPENAI_API_KEY=sk-tu_api_key_aqui');
    console.log('   OPENAI_CHATKIT_WORKFLOW_ID=wf_tu_workflow_id_aqui');
    return diagnostic;
  }

  // 2. Verificar conectividad con OpenAI API
  console.log('\n🌐 2. Verificando conectividad con OpenAI API...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    diagnostic.connectivity.openaiApi = response.ok;
    console.log(`   OpenAI API: ${response.ok ? '✅ Conectado' : '❌ Error de conexión'}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`   Error: ${error}`);
    }
  } catch (error) {
    console.log(`   OpenAI API: ❌ Error de conexión - ${error}`);
  }

  // 3. Verificar workflow específico
  console.log('\n🔧 3. Verificando workflow de ChatKit...');
  
  try {
    const response = await fetch(`https://api.openai.com/v1/assistants/${workflowId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const workflow = await response.json() as any;
      diagnostic.workflow.exists = true;
      diagnostic.workflow.published = workflow.status === 'published';
      diagnostic.workflow.hasSystemMessage = !!workflow.instructions;

      console.log(`   Workflow existe: ✅`);
      console.log(`   Estado: ${workflow.status}`);
      console.log(`   System Message: ${workflow.instructions ? '✅ Configurado' : '❌ Vacío'}`);
      console.log(`   Publicado: ${workflow.status === 'published' ? '✅' : '❌'}`);
      
      if (workflow.instructions) {
        console.log(`   System Message: "${workflow.instructions.substring(0, 100)}..."`);
      }
    } else {
      console.log(`   Workflow: ❌ No encontrado o error`);
      const error = await response.text();
      console.log(`   Error: ${error}`);
    }
  } catch (error) {
    console.log(`   Workflow: ❌ Error de verificación - ${error}`);
  }

  // 4. Probar creación de sesión
  console.log('\n🧪 4. Probando creación de sesión...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
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

    diagnostic.connectivity.chatkitEndpoint = response.ok;
    
    if (response.ok) {
      const session = await response.json() as any;
      console.log(`   Sesión creada: ✅`);
      console.log(`   Session ID: ${session.id}`);
      console.log(`   Client Secret: ${session.client_secret?.substring(0, 20)}...`);
    } else {
      console.log(`   Creación de sesión: ❌ Error`);
      const error = await response.text();
      console.log(`   Error: ${error}`);
    }
  } catch (error) {
    console.log(`   Creación de sesión: ❌ Error - ${error}`);
  }

  return diagnostic;
}

async function generateRecommendations(diagnostic: ChatKitDiagnostic): Promise<void> {
  console.log('\n🎯 RECOMENDACIONES:');
  console.log('==================');

  if (!diagnostic.environment.openaiApiKey || !diagnostic.environment.workflowId) {
    console.log('\n❌ PROBLEMA CRÍTICO: Variables de entorno faltantes');
    console.log('   Solución: Configura las variables en tu archivo .env');
    console.log('   OPENAI_API_KEY=sk-tu_api_key_aqui');
    console.log('   OPENAI_CHATKIT_WORKFLOW_ID=wf_tu_workflow_id_aqui');
    return;
  }

  if (!diagnostic.environment.apiKeyFormat) {
    console.log('\n❌ PROBLEMA: Formato de API key incorrecto');
    console.log('   Solución: La API key debe empezar con "sk-"');
    return;
  }

  if (!diagnostic.connectivity.openaiApi) {
    console.log('\n❌ PROBLEMA: No se puede conectar a OpenAI API');
    console.log('   Solución: Verifica tu API key y conexión a internet');
    return;
  }

  if (!diagnostic.workflow.exists) {
    console.log('\n❌ PROBLEMA: El workflow no existe');
    console.log('   Solución:');
    console.log('   1. Ve a https://platform.openai.com/agent-builder');
    console.log('   2. Crea un nuevo workflow');
    console.log('   3. Copia el ID del workflow');
    console.log('   4. Actualiza OPENAI_CHATKIT_WORKFLOW_ID en .env');
    return;
  }

  if (!diagnostic.workflow.published) {
    console.log('\n❌ PROBLEMA: El workflow no está publicado');
    console.log('   Solución:');
    console.log('   1. Ve a https://platform.openai.com/agent-builder');
    console.log('   2. Abre tu workflow');
    console.log('   3. Haz clic en "Publish"');
    return;
  }

  if (!diagnostic.workflow.hasSystemMessage) {
    console.log('\n❌ PROBLEMA: El workflow no tiene system message');
    console.log('   Solución:');
    console.log('   1. Ve a https://platform.openai.com/agent-builder');
    console.log('   2. Abre tu workflow');
    console.log('   3. En "Instructions", agrega:');
    console.log('      "Eres un asistente de IA especializado en ayudar con tareas administrativas y de gestión del sistema Movonte Dashboard. Puedes ayudar con consultas sobre proyectos, usuarios, servicios, tickets y configuraciones del sistema. Responde de manera profesional y útil."');
    console.log('   4. Guarda y publica el workflow');
    return;
  }

  if (!diagnostic.connectivity.chatkitEndpoint) {
    console.log('\n❌ PROBLEMA: No se puede crear sesión de ChatKit');
    console.log('   Solución: Verifica que tu API key tenga permisos para ChatKit');
    return;
  }

  console.log('\n✅ TODO ESTÁ CONFIGURADO CORRECTAMENTE');
  console.log('   Si aún no ves respuestas, el problema puede estar en:');
  console.log('   1. El frontend no está procesando las respuestas correctamente');
  console.log('   2. Hay un error en la configuración del widget de ChatKit');
  console.log('   3. El workflow necesita más configuración');
}

// Ejecutar diagnóstico
async function main() {
  try {
    const diagnostic = await diagnoseChatKit();
    await generateRecommendations(diagnostic);
    
    console.log('\n📊 RESUMEN DEL DIAGNÓSTICO:');
    console.log('============================');
    console.log(JSON.stringify(diagnostic, null, 2));
    
  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

if (require.main === module) {
  main();
}

export { diagnoseChatKit, generateRecommendations };
