import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

async function testAssistant() {
  console.log('🧪 Testing Assistant API...\n');

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const assistantId = process.env.OPENAI_ASSISTANT_ID;

  if (!assistantId) {
    console.error('❌ OPENAI_ASSISTANT_ID not configured');
    return;
  }

  try {
    console.log('1. Verificando asistente...');
    const assistant = await openai.beta.assistants.retrieve(assistantId);
    console.log(`✅ Asistente encontrado: ${assistant.name}`);
    console.log(`   ID: ${assistant.id}`);
    console.log(`   Modelo: ${assistant.model}`);
    console.log(`   Instrucciones: ${assistant.instructions ? 'Sí' : 'No'}`);
    console.log(`   Herramientas: ${assistant.tools?.length || 0}\n`);

    console.log('2. Creando thread...');
    const thread = await openai.beta.threads.create({
      metadata: { test: 'true' }
    });
    console.log(`✅ Thread creado: ${thread.id}\n`);

    console.log('3. Agregando mensaje...');
    const message = await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: 'Hola, ¿cómo estás?'
    });
    console.log(`✅ Mensaje agregado: ${message.id}\n`);

    console.log('4. Creando run...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });
    console.log(`✅ Run creado: ${run.id}`);
    console.log(`   Estado inicial: ${run.status}\n`);

    console.log('5. Esperando completación...');
    let currentRun = run;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`   Intento ${attempts}/${maxAttempts}: ${currentRun.status}`);
      
      if (currentRun.status === 'completed') {
        console.log('✅ Run completado exitosamente!\n');
        break;
      }
      
      if (currentRun.status === 'failed') {
        console.log('❌ Run falló');
        if (currentRun.last_error) {
          console.log(`   Error: ${currentRun.last_error.message}`);
        }
        return;
      }
      
      if (currentRun.status === 'cancelled') {
        console.log('❌ Run cancelado');
        return;
      }
      
      if (currentRun.status === 'requires_action') {
        console.log('⚠️ Run requiere acción (tool call)');
        return;
      }
      
      // Esperar 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Obtener estado actualizado
      currentRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (attempts >= maxAttempts) {
      console.log('❌ Timeout esperando completación');
      return;
    }

    console.log('6. Obteniendo respuesta...');
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => 
      msg.role === 'assistant' && msg.run_id === run.id
    );

    if (assistantMessage && assistantMessage.content[0].type === 'text') {
      console.log('✅ Respuesta del asistente:');
      console.log(`   "${assistantMessage.content[0].text.value}"`);
    } else {
      console.log('❌ No se encontró respuesta del asistente');
      console.log('Mensajes disponibles:', messages.data.map(m => ({
        role: m.role,
        run_id: m.run_id,
        content_type: m.content[0]?.type
      })));
    }

  } catch (error) {
    console.error('❌ Error durante el test:', error);
    
    if (error instanceof Error) {
      console.error('Mensaje de error:', error.message);
      
      // Verificar si es un error de permisos
      if (error.message.includes('permission') || error.message.includes('access')) {
        console.log('\n💡 Posible problema de permisos con el token de servicio');
        console.log('   - Verifica que el token tenga acceso a la API de Assistants');
        console.log('   - Contacta al administrador de la cuenta');
      }
    }
  }
}

testAssistant();
