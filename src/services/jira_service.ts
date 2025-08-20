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
      summary: `Web Contact: ${formData.name} - ${formData.company || 'No company'}`,
      description: this.formatContactDescriptionADF(formData),
      issuetype: {
        name: 'Task'
      },
      priority: {
        name: 'Medium'
      },
      labels: ['contacto-web', 'lead']
    };

    // Optional custom fields, only add if they exist in the project
    const emailFieldId = process.env.JIRA_FIELD_EMAIL;
    const phoneFieldId = process.env.JIRA_FIELD_PHONE;
    const companyFieldId = process.env.JIRA_FIELD_COMPANY;

    // Only add custom fields if they are configured and exist
    if (emailFieldId && emailFieldId.trim() !== '') {
      (fields as any)[emailFieldId] = formData.email;
    }
    if (phoneFieldId && phoneFieldId.trim() !== '' && formData.phone) {
      (fields as any)[phoneFieldId] = formData.phone;
    }
    if (companyFieldId && companyFieldId.trim() !== '' && formData.company) {
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

  async addCommentToIssue(issueKey: string, commentText: string): Promise<any> {
    try {
      console.log(`Adding comment to issue ${issueKey}: ${commentText}`);
      
      const commentData = {
        body: {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: commentText
                }
              ]
            }
          ]
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}/comment`,
        commentData,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      console.log(`Comment added successfully to ${issueKey}`);
      return response.data;
    } catch (error) {
      console.error(`Error adding comment to ${issueKey}:`, error);
      throw error;
    }
  }

  private formatContactDescriptionADF(formData: ContactFormData) {
    const lines = [
      `New contact from website`,
      `Name: ${formData.name}`,
      `Email: ${formData.email}`,
      `Company: ${formData.company || 'Not specified'}`,
      `Phone: ${formData.phone || 'Not provided'}`,
      `Source: ${formData.source || 'Web form'}`,
      '',
      `Message:`,
      `${formData.message}`,
      '',
      `---`,
      `Ticket automatically created on ${new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })}`
    ];

    // Convert plain lines to minimal ADF document with paragraphs
    return {
      version: 1 as const,
      type: 'doc' as const,
      content: lines.map((text) => ({
        type: 'paragraph' as const,
        content: text
          ? [{ type: 'text' as const, text }]
          : undefined
      }))
    };
  }
}