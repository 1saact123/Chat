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

  // === EXISTING METHODS ===
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
      labels: ['contacto-web', 'lead', 'widget-chat']
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
      (fields as any)[companyFieldId] = formData.phone;
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

  // === NEW METHODS FOR BIDIRECTIONAL INTEGRATION ===

  /**
   * Get issue details by key
   */
  async getIssueByKey(issueKey: string): Promise<any> {
    try {
      console.log(`Getting issue details for ${issueKey}`);
      
      const response = await axios.get(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}`,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error getting issue ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Get all comments for an issue
   */
  async getIssueComments(issueKey: string): Promise<any> {
    try {
      console.log(`Getting comments for issue ${issueKey}`);
      
      const response = await axios.get(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}/comment`,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error getting comments for ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Add comment to issue (enhanced for widget integration)
   */
  async addCommentToIssue(issueKey: string, commentText: string, authorInfo?: { name: string; email?: string; source: 'widget' | 'jira' }): Promise<any> {
    try {
      console.log(`Adding comment to issue ${issueKey}: ${commentText}`);
      
      // Format comment with author information
      let formattedComment = commentText;
      if (authorInfo) {
        const sourceLabel = authorInfo.source === 'widget' ? 'Widget Chat' : 'Jira';
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
        formattedComment = `[${sourceLabel}] ${authorInfo.name}: ${commentText}\n\n---\nSent via ${sourceLabel} on ${timestamp}`;
      }
      
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
                  text: formattedComment
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

  /**
   * Update issue status
   */
  async updateIssueStatus(issueKey: string, statusName: string): Promise<any> {
    try {
      console.log(`Updating issue ${issueKey} status to ${statusName}`);
      
      // First get available transitions
      const transitionsResponse = await axios.get(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Accept': 'application/json'
          }
        }
      );

      const transitions = transitionsResponse.data.transitions;
      const targetTransition = transitions.find((t: any) => 
        t.to.name.toLowerCase() === statusName.toLowerCase()
      );

      if (!targetTransition) {
        throw new Error(`Status transition to '${statusName}' not available`);
      }

      const updateData = {
        transition: {
          id: targetTransition.id
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
        updateData,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      console.log(`Issue ${issueKey} status updated to ${statusName}`);
      return response.data;
    } catch (error) {
      console.error(`Error updating issue ${issueKey} status:`, error);
      throw error;
    }
  }

  /**
   * Search issues by customer email
   */
  async searchIssuesByEmail(email: string): Promise<any> {
    try {
      console.log(`Searching issues for email: ${email}`);
      
      const jql = `project = ${this.projectKey} AND labels = "widget-chat" AND (description ~ "${email}" OR summary ~ "${email}") ORDER BY created DESC`;
      
      const response = await axios.post(
        `${this.baseUrl}/rest/api/3/search`,
        {
          jql,
          maxResults: 10,
          fields: ['key', 'summary', 'status', 'created', 'labels']
        },
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error searching issues for email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Create a new chat session for an existing issue
   */
  async createChatSession(issueKey: string, customerInfo: { name: string; email: string }): Promise<any> {
    try {
      console.log(`Creating chat session for issue ${issueKey}`);
      
      // Add a special comment to mark the start of chat session
      const sessionComment = `🎯 **CHAT SESSION STARTED**\n\nCustomer: ${customerInfo.name} (${customerInfo.email})\nStarted: ${new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })}\n\n---\nChat widget connected successfully.`;
      
      return await this.addCommentToIssue(issueKey, sessionComment, {
        name: 'System',
        source: 'jira'
      });
    } catch (error) {
      console.error(`Error creating chat session for ${issueKey}:`, error);
      throw error;
    }
  }

  /**
   * Get conversation history for an issue (formatted for widget)
   */
  async getConversationHistory(issueKey: string): Promise<Array<{ role: 'user' | 'assistant'; content: string; timestamp: string; source: 'widget' | 'jira' }>> {
    try {
      console.log(`Getting conversation history for issue ${issueKey}`);
      
      const commentsResponse = await this.getIssueComments(issueKey);
      const comments = commentsResponse.comments || [];
      
      // Filter and format comments for chat widget
      const conversationHistory = comments
        .filter((comment: any) => {
          // Skip system comments and very short ones
          const content = comment.body?.content?.[0]?.content?.[0]?.text || '';
          return content.length > 10 && !content.includes('🎯 **CHAT SESSION STARTED**');
        })
        .map((comment: any) => {
          const content = comment.body?.content?.[0]?.content?.[0]?.text || '';
          const isFromWidget = content.includes('[Widget Chat]');
          const isFromJira = content.includes('[Jira]');
          
          // Extract the actual message content
          let messageContent = content;
          if (isFromWidget || isFromJira) {
            const colonIndex = content.indexOf(':');
            if (colonIndex !== -1) {
              messageContent = content.substring(colonIndex + 1).trim();
            }
          }
          
          return {
            role: isFromWidget ? 'user' : 'assistant',
            content: messageContent,
            timestamp: comment.created,
            source: isFromWidget ? 'widget' : 'jira'
          };
        });

      return conversationHistory;
    } catch (error) {
      console.error(`Error getting conversation history for ${issueKey}:`, error);
      return [];
    }
  }

  // === EXISTING METHODS ===
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