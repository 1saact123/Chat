import axios from 'axios';
import 'dotenv/config';

async function diagnoseWebhook() {
  console.log('🔍 === DIAGNÓSTICO DE WEBHOOK ===\n');
  
  const baseUrl = 'https://chat.movonte.com';
  const webhookUrl = `${baseUrl}/api/webhook/jira`;
  const chatbotWebhookUrl = `${baseUrl}/api/chatbot/webhook/jira`;
  
  try {
    // 1. Probar endpoint GET
    console.log('1️⃣ Probando endpoint GET...');
    const getResponse = await axios.get(webhookUrl);
    console.log('✅ GET endpoint funciona:', getResponse.data);
    
    // 2. Probar endpoint POST con datos de prueba
    console.log('\n2️⃣ Probando endpoint POST...');
    const testPayload = {
      webhookEvent: 'comment_created',
      issue: {
        id: '12345',
        key: 'TEST-123',
        fields: {
          summary: 'Test Issue',
          status: { name: 'To Do' }
        }
      },
      comment: {
        id: '67890',
        body: 'This is a test comment',
        author: {
          displayName: 'Test User',
          emailAddress: 'test@example.com',
          accountId: 'test-account-id'
        },
        created: new Date().toISOString()
      }
    };
    
    const postResponse = await axios.post(webhookUrl, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Jira-Webhook-Test/1.0'
      }
    });
    console.log('✅ POST endpoint funciona:', postResponse.data);
    
    // 3. Probar el endpoint real del chatbot
    console.log('\n3️⃣ Probando endpoint del chatbot...');
    const chatbotResponse = await axios.post(chatbotWebhookUrl, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Jira-Webhook-Test/1.0'
      }
    });
    console.log('✅ Chatbot endpoint funciona:', chatbotResponse.data);
    
    // 4. Verificar variables de entorno
    console.log('\n4️⃣ Verificando variables de entorno...');
    const requiredVars = [
      'OPENAI_API_KEY',
      'OPENAI_ASSISTANT_ID',
      'JIRA_EMAIL',
      'JIRA_API_TOKEN',
      'JIRA_BASE_URL',
      'JIRA_PROJECT_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.log('❌ Variables faltantes:', missingVars);
    } else {
      console.log('✅ Todas las variables de entorno están configuradas');
    }
    
    console.log('\n🎉 DIAGNÓSTICO COMPLETADO - El servidor está funcionando correctamente');
    
  } catch (error) {
    console.error('❌ Error en el diagnóstico:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('   Status:', error.response?.status);
      console.error('   Status Text:', error.response?.statusText);
      console.error('   Response Data:', error.response?.data);
      console.error('   Request URL:', error.config?.url);
      console.error('   Request Method:', error.config?.method);
    }
  }
}

// Ejecutar diagnóstico
diagnoseWebhook();
