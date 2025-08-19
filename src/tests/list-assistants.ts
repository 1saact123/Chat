import 'dotenv/config';
import OpenAI from 'openai';

async function listAssistants(): Promise<void> {
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY no está configurado en .env');
        return;
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        console.log('🔍 Listando assistants de OpenAI...\n');
        
        const assistants = await openai.beta.assistants.list();
        
        if (assistants.data.length === 0) {
            console.log('📝 No tienes assistants creados.');
            console.log('💡 Ve a https://platform.openai.com/assistants para crear uno.');
            return;
        }

        console.log(`✅ Encontrados ${assistants.data.length} assistant(s):\n`);
        
        assistants.data.forEach((assistant, index) => {
            console.log(`${index + 1}. 📋 ${assistant.name || 'Sin nombre'}`);
            console.log(`   🆔 ID: ${assistant.id}`);
            console.log(`   🤖 Modelo: ${assistant.model}`);
            console.log(`   📅 Creado: ${new Date(assistant.created_at * 1000).toLocaleString()}`);
            console.log(`   📝 Instrucciones: ${assistant.instructions?.substring(0, 100)}${assistant.instructions && assistant.instructions.length > 100 ? '...' : ''}`);
            console.log('');
        });

        console.log('💡 Copia el ID del assistant que quieras usar y agrégalo a tu .env como OPENAI_ASSISTANT_ID');

    } catch (error: any) {
        console.error('❌ Error:', error?.message || error);
        
        if (error?.status === 401) {
            console.log('🔧 Verifica que tu OPENAI_API_KEY sea válido');
        }
    }
}

listAssistants();
