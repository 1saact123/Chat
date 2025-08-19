import 'dotenv/config';
import OpenAI from 'openai';

async function testOpenAI(): Promise<void> {
    console.log('🔍 Probando conexión con OpenAI...\n');
    
    // Verificar que la API key esté configurada
    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY no está configurado en .env');
        return;
    }

    // Verificar formato de la API key
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
        console.error('❌ OPENAI_API_KEY no tiene el formato correcto (debe empezar con "sk-")');
        console.log('🔧 Tu API key actual:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
        return;
    }

    console.log('✅ API Key configurada correctamente');
    console.log('🔑 Formato:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        // Probar con una llamada simple primero
        console.log('\n🧪 Probando llamada simple a la API...');
        const models = await openai.models.list();
        console.log('✅ Conexión exitosa con OpenAI');
        console.log(`📊 Modelos disponibles: ${models.data.length}`);

        // Ahora probar assistants
        console.log('\n🤖 Probando listado de assistants...');
        const assistants = await openai.beta.assistants.list();
        
        console.log(`📋 Total de assistants: ${assistants.data.length}`);
        
        if (assistants.data.length === 0) {
            console.log('📝 No se encontraron assistants.');
            console.log('💡 Verifica que:');
            console.log('   1. Estés usando la cuenta correcta de OpenAI');
            console.log('   2. Hayas creado el assistant en https://platform.openai.com/assistants');
            console.log('   3. La API key tenga permisos para acceder a assistants');
        } else {
            console.log('\n📋 Assistants encontrados:');
            assistants.data.forEach((assistant, index) => {
                console.log(`${index + 1}. ${assistant.name || 'Sin nombre'} (${assistant.id})`);
            });
        }

    } catch (error: any) {
        console.error('❌ Error:', error?.message || error);
        
        if (error?.status === 401) {
            console.log('\n🔧 Error 401 - API Key inválida:');
            console.log('   - Verifica que la API key sea correcta');
            console.log('   - Asegúrate de que no tenga espacios extra');
            console.log('   - Verifica que no haya expirado');
        } else if (error?.status === 403) {
            console.log('\n🔧 Error 403 - Sin permisos:');
            console.log('   - Verifica que tu cuenta tenga acceso a Assistants API');
            console.log('   - Puede que necesites actualizar tu plan de OpenAI');
        }
    }
}

testOpenAI();
