#!/usr/bin/env ts-node

/**
 * Script para verificar los workflows existentes
 */

import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function checkExistingWorkflows() {
  console.log('🔍 Verificando workflows existentes...\n');

  const apiKey = process.env.OPENAI_API_KEY;
  const currentWorkflowId = process.env.OPENAI_CHATKIT_WORKFLOW_ID;

  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY no está configurada');
    return;
  }

  console.log(`📋 Workflow ID actual en .env: ${currentWorkflowId || 'No configurado'}`);

  // Lista de workflows que vimos en la imagen
  const workflows = [
    'wf_68e8201822848190bba4d97ecb00a4120acf471c2566d41d', // El que está en .env
    // Agregar otros workflows si los conoces
  ];

  console.log('\n🔧 Verificando workflows...');

  for (const workflowId of workflows) {
    console.log(`\n📋 Verificando workflow: ${workflowId}`);
    
    try {
      // 1. Probar creación de sesión
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
        console.log(`✅ Workflow ${workflowId}: FUNCIONA`);
        console.log(`   Session ID: ${session.id}`);
        console.log(`   Client Secret: ${session.client_secret?.substring(0, 20)}...`);
        
        if (session.workflow) {
          console.log(`   Workflow info:`, JSON.stringify(session.workflow, null, 2));
        }
        
        // Este workflow funciona, actualizar .env
        console.log(`\n🎯 RECOMENDACIÓN:`);
        console.log(`   Actualiza tu archivo .env con:`);
        console.log(`   OPENAI_CHATKIT_WORKFLOW_ID=${workflowId}`);
        
      } else {
        const error = await sessionResponse.text();
        console.log(`❌ Workflow ${workflowId}: NO FUNCIONA`);
        console.log(`   Error: ${error}`);
      }
      
    } catch (error) {
      console.log(`❌ Error verificando workflow ${workflowId}: ${error}`);
    }
  }

  console.log('\n💡 INSTRUCCIONES:');
  console.log('==================');
  console.log('1. Ve a Agent Builder: https://platform.openai.com/agent-builder');
  console.log('2. Abre cada workflow ("flow-test" y "New workflow v2")');
  console.log('3. Verifica que tengan un system message configurado');
  console.log('4. Asegúrate de que estén publicados');
  console.log('5. Copia el ID del workflow que funcione');
  console.log('6. Actualiza OPENAI_CHATKIT_WORKFLOW_ID en tu archivo .env');
}

// Ejecutar verificación
if (require.main === module) {
  checkExistingWorkflows();
}

export { checkExistingWorkflows };
