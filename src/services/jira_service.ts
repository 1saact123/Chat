import axios from 'axios';
import { JiraIssueRequest, JiraResponse, ContactFormData } from '../types';
import process from 'process';
import { Buffer } from 'buffer';

export class JiraService {
  private baseUrl: string;
  private auth: string;
  private projectKey: string;

  constructor() {
    this.baseUrl = process.env.JIRA_BASE_URL || 'https://movonte.atlassian.net';
    this.projectKey = process.env.JIRA_PROJECT_KEY || 'CONTACT';
    
    const email = process.env.JIRA_EMAIL || '';
    const token = process.env.JIRA_API_TOKEN || '';
    this.auth = Buffer.from(`${email}:${token}`).toString('base64');
  }

  async createContactIssue(formData: ContactFormData): Promise<JiraResponse> {
    const fields: JiraIssueRequest['fields'] = {
      project: {
        key: this.projectKey
      },
      summary: `Contacto Web: ${formData.name} - ${formData.company || 'Sin empresa'}`,
      description: this.formatContactDescription(formData),
      issuetype: {
        name: 'Task'
      },
      priority: {
        name: 'Medium'
      },
      labels: ['contacto-web', 'lead']
    };

    // Campos personalizados opcionales, definidos por variables de entorno
    const emailFieldId = process.env.JIRA_FIELD_EMAIL;   // e.g., customfield_10000
    const phoneFieldId = process.env.JIRA_FIELD_PHONE;   // e.g., customfield_10001
    const companyFieldId = process.env.JIRA_FIELD_COMPANY; // e.g., customfield_10002

    if (emailFieldId) {
      (fields as any)[emailFieldId] = formData.email;
    }
    if (phoneFieldId && formData.phone) {
      (fields as any)[phoneFieldId] = formData.phone;
    }
    if (companyFieldId && formData.company) {
      (fields as any)[companyFieldId] = formData.company;
    }

    const issueData: JiraIssueRequest = { fields };

    const response = await axios.post(
      `${this.baseUrl}/rest/api/3/issue`,
      issueData,
      {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    return response.data;
  }

  async testConnection(): Promise<any> {
    const response = await axios.get(
      `${this.baseUrl}/rest/api/3/project/${this.projectKey}`,
      {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Accept': 'application/json'
        }
      }
    );

    return response.data;
  }

  private formatContactDescription(formData: ContactFormData): string {
    return `
*Nuevo contacto desde el sitio web*

*Nombre:* ${formData.name}
*Email:* ${formData.email}
*Empresa:* ${formData.company || 'No especificada'}
*Teléfono:* ${formData.phone || 'No proporcionado'}
*Fuente:* ${formData.source || 'Formulario web'}

*Mensaje:*
${formData.message}

---
_Ticket creado automáticamente el ${new Date().toLocaleString('es-MX', { 
  timeZone: 'America/Mexico_City' 
})}_
    `.trim();
  }
}