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
        creator?: {
          displayName: string;
          emailAddress?: string;
          accountId: string;
        };
        labels?: string[];
      };
    };
    comment?: {
      id: string;
      body: string;
      author: {
        displayName: string;
        emailAddress?: string;
        accountId: string;
      };
      created: string;
    };
    // Para eventos de cambio de estado
    changelog?: {
      items: Array<{
        field: string;
        fieldtype: string;
        from?: string;
        fromString?: string;
        to?: string;
        toString?: string;
      }>;
    };
    user?: {
      displayName: string;
      emailAddress?: string;
      accountId: string;
    };
  }
  
  export interface ChatThread {
    threadId: string;
    jiraIssueKey?: string;
    openaiThreadId?: string;
    lastActivity: Date;
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: Date;
    }>;
  }
  
  export interface ChatbotResponse {
    success: boolean;
    threadId?: string;
    response?: string;
    error?: string;
    assistantId?: string;
    assistantName?: string;
  }

  // === Atlassian Document Format (ADF) minimal types ===
  export interface AtlassianTextNode {
    type: 'text';
    text: string;
    marks?: Array<{ type: string }>;
  }

  export interface AtlassianHardBreakNode {
    type: 'hardBreak';
  }

  export interface AtlassianParagraphNode {
    type: 'paragraph';
    content?: Array<AtlassianTextNode | AtlassianHardBreakNode>;
  }

  export interface AtlassianDocument {
    version: 1;
    type: 'doc';
    content: Array<AtlassianParagraphNode>;
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
      description: string | AtlassianDocument;
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