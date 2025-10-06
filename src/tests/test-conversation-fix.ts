import { OpenAIService } from '../services/openAI_service';

async function testConversationFix() {
  console.log('🧪 Testing conversation fix improvements...\n');
  
  const openaiService = new OpenAIService();
  
  // Simular una conversación con respuestas repetitivas
  const testMessages = [
    "Hola, necesito ayuda con el ticket BDM-61",
    "¿Puedes ayudarme con el estado del ticket?",
    "¿Qué más necesitas saber sobre el ticket?",
    "¿Hay alguna actualización sobre el ticket?"
  ];
  
  const threadId = 'test_conversation_fix';
  
  console.log('📝 Testing conversation flow:');
  
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`\n--- Mensaje ${i + 1}: "${message}" ---`);
    
    const context = {
      jiraIssueKey: 'BDM-61',
      issueSummary: 'Test ticket for conversation fix',
      issueStatus: 'Open',
      authorName: 'Test User',
      isJiraComment: true,
      conversationType: 'jira-ticket'
    };
    
    try {
      const response = await openaiService.processDirectChat(message, threadId, context);
      
      if (response.success) {
        console.log(`✅ Respuesta: ${response.response}`);
        console.log(`📊 Thread ID: ${response.threadId}`);
      } else {
        console.log(`❌ Error: ${response.error}`);
      }
    } catch (error) {
      console.error(`❌ Exception: ${error}`);
    }
    
    // Pausa entre mensajes para simular tiempo real
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎯 Testing completed!');
  console.log('📋 Check the responses above to verify they are not repetitive.');
}

// Ejecutar la prueba si se llama directamente
if (require.main === module) {
  testConversationFix().catch(console.error);
}

export { testConversationFix };
