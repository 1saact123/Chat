import dotenv from 'dotenv';
import { JiraService } from './src/services/jira_service.js';

dotenv.config();

async function testJiraConnection() {
  try {
    console.log('Testing connection with Jira...');
    
    const jiraService = new JiraService();
    
    // Test connection
    const projectInfo = await jiraService.testConnection();
    console.log('Connection successful!');
    console.log('Project info:', projectInfo.name);
    console.log('Project Key:', projectInfo.key);
    
    // Test ticket creation
    console.log('\nTesting ticket creation...');
    const testFormData = {
      name: "Test User",
      email: "test@example.com",
      company: "Test Company",
      phone: "555-1234",
      message: "Este es un ticket de prueba",
      source: "Test API"
    };
    
    const ticket = await jiraService.createContactIssue(testFormData);
    console.log('Ticket created successfully!');
    console.log('Ticket Key:', ticket.key);
    console.log('URL:', `${process.env.JIRA_BASE_URL}/browse/${ticket.key}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
    
    console.log('\nVerify your configuration:');
    console.log('- JIRA_BASE_URL:', process.env.JIRA_BASE_URL);
    console.log('- JIRA_PROJECT_KEY:', process.env.JIRA_PROJECT_KEY, '(should be DEV)');
    console.log('- JIRA_EMAIL:', process.env.JIRA_EMAIL);
    console.log('- JIRA_API_TOKEN:', process.env.JIRA_API_TOKEN ? 'Configured' : 'Missing');
  }
}

testJiraConnection();
