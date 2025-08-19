// Shared types for the entire application

// === Chatbot Types ===
export interface JiraWebhookPayload {
    webhookEvent: string;
    issue: {
      id: string;
      key: string;
      fields: {
        summary: string;
        description?: string;
        status: {
          name: string;
        };
      };
    };
    comment?: {
      id: string;
      body: string;
      author: {
        displayName: string;
        emailAddress: string;
      };
      created: string;
    };
  }
  
  export interface ChatThread {
    threadId: string;
    jiraIssueKey: string;
    lastActivity: Date;
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
    }>;
  }
  
  export interface ChatbotResponse {
    success: boolean;
    threadId: string;
    response?: string;
    error?: string;
  }
  
  // === Contact Form Types ===
  export interface ContactFormData {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    message: string;
    source?: string;
  }
  
  export interface ContactApiResponse {
    success: boolean;
    jiraIssue?: {
      id: string;
      key: string;
      url: string;
    };
    error?: string;
    fallbackEmail?: boolean;
  }
  
  // === Jira Types ===
  export interface JiraIssueRequest {
    fields: {
      project: {
        key: string;
      };
      summary: string;
      description: string;
      issuetype: {
        name: string;
      };
      priority?: {
        name: string;
      };
      labels?: string[];
      customfield_10000?: string; // Contact email
      customfield_10001?: string; // Contact phone
      customfield_10002?: string; // Contact company
      [key: string]: unknown; // Allows adding dynamic custom fields
    };
  }
  
  export interface JiraResponse {
    id: string;
    key: string;
    self: string;
  }
  
  // === Email Types ===
  export interface EmailRequest {
    to: string | string[];
    subject: string;
    message: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Array<{
      filename: string;
      content: string | Buffer;
      contentType?: string;
    }>;
    template?: 'jira_update' | 'chat_summary' | 'contact_form' | 'plain';
    templateData?: any;
  }
  
  export interface EmailResponse {
    success: boolean;
    messageId?: string;
    error?: string;
  }