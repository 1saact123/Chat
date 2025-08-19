import 'dotenv/config';
import { JiraService } from '../services/jira_service';
import type { ContactFormData } from '../types';

async function main(): Promise<void> {
    const jiraService = new JiraService();

    try {
        console.log('Testing connection with Jira...');
        const projectInfo = await jiraService.testConnection();
        console.log('Successful connection');
        console.log('Project:', projectInfo?.name, '| Key:', projectInfo?.key);

        console.log('\nTesting ticket creation...');
        const testFormData: ContactFormData = {
            name: 'Test User',
            email: 'test@example.com',
            company: 'Test Company',
            phone: '555-1234',
            message: 'Este es un ticket de prueba generado por el script test-jira.ts',
            source: 'Test Script'
        };

        const ticket = await jiraService.createContactIssue(testFormData);
        console.log('Ticket created successfully');
        console.log('Ticket Key:', ticket.key);
        console.log('URL:', `${process.env.JIRA_BASE_URL}/browse/${ticket.key}`);
    } catch (error: any) {
        console.error('Error:', error?.message ?? error);
        if (error?.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
        console.log('\nVerify your configuration:');
        console.log('- JIRA_BASE_URL:', process.env.JIRA_BASE_URL);
        console.log('- JIRA_PROJECT_KEY:', process.env.JIRA_PROJECT_KEY);
        console.log('- JIRA_EMAIL:', process.env.JIRA_EMAIL);
        console.log('- JIRA_API_TOKEN:', process.env.JIRA_API_TOKEN ? 'Configured' : 'Missing');
        process.exitCode = 1;
    }
}

main();


