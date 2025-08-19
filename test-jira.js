import dotenv from 'dotenv';
import { JiraService } from './src/services/jira_service.js';

dotenv.config();

async function testJiraConnection() {
  try {
    console.log('🔍 Probando conexión con Jira...');
    
    const jiraService = new JiraService();
    
    // Probar conexión
    const projectInfo = await jiraService.testConnection();
    console.log('✅ Conexión exitosa!');
    console.log('📋 Información del proyecto:', projectInfo.name);
    console.log('🔑 Project Key:', projectInfo.key);
    
    // Probar creación de ticket
    console.log('\n📝 Probando creación de ticket...');
    const testFormData = {
      name: "Test User",
      email: "test@example.com",
      company: "Test Company",
      phone: "555-1234",
      message: "Este es un ticket de prueba",
      source: "Test API"
    };
    
    const ticket = await jiraService.createContactIssue(testFormData);
    console.log('✅ Ticket creado exitosamente!');
    console.log('🎫 Ticket Key:', ticket.key);
    console.log('🔗 URL:', `${process.env.JIRA_BASE_URL}/browse/${ticket.key}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Response:', error.response.data);
    }
    
    console.log('\n🔧 Verifica tu configuración:');
    console.log('- JIRA_BASE_URL:', process.env.JIRA_BASE_URL);
    console.log('- JIRA_PROJECT_KEY:', process.env.JIRA_PROJECT_KEY, '(debería ser DEV)');
    console.log('- JIRA_EMAIL:', process.env.JIRA_EMAIL);
    console.log('- JIRA_API_TOKEN:', process.env.JIRA_API_TOKEN ? '✅ Configurado' : '❌ Faltante');
  }
}

testJiraConnection();
