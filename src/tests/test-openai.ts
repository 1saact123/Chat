import 'dotenv/config';
import OpenAI from 'openai';

async function testOpenAI(): Promise<void> {
    console.log('Testing connection with OpenAI...\n');
    
    // Verificar que la API key esté configurada
    if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is not set in .env');
        return;
    }

    // Verificar formato de la API key
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
        console.error('OPENAI_API_KEY does not have the correct format (must start with "sk-")');
        console.log('Your current API key:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
        return;
    }

    console.log('API Key configured correctly');
    console.log('Format:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        // Probar con una llamada simple primero
        console.log('\nTesting a simple API call...');
        const models = await openai.models.list();
        console.log('Successful connection with OpenAI');
        console.log(`Available models: ${models.data.length}`);

        // Ahora probar assistants
        console.log('\nTesting assistants listing...');
        const assistants = await openai.beta.assistants.list();
        
        console.log(`Total assistants: ${assistants.data.length}`);
        
        if (assistants.data.length === 0) {
            console.log('No assistants found.');
            console.log('Verify that:');
            console.log('   1. You are using the correct OpenAI account');
            console.log('   2. You have created the assistant at https://platform.openai.com/assistants');
            console.log('   3. The API key has permissions to access assistants');
        } else {
            console.log('\nAssistants encontrados:');
            assistants.data.forEach((assistant, index) => {
                console.log(`${index + 1}. ${assistant.name || 'Unnamed'} (${assistant.id})`);
            });
        }

    } catch (error: any) {
        console.error('Error:', error?.message || error);
        
        if (error?.status === 401) {
            console.log('\nError 401 - Invalid API Key:');
            console.log('   - Verify that the API key is correct');
            console.log('   - Make sure it does not contain extra spaces');
            console.log('   - Verify that it has not expired');
        } else if (error?.status === 403) {
            console.log('\nError 403 - No permissions:');
            console.log('   - Verify that your account has access to the Assistants API');
            console.log('   - You may need to upgrade your OpenAI plan');
        }
    }
}

testOpenAI();
