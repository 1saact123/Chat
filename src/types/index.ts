// Tipos compartidos para toda la aplicación

// === Tipos del Chatbot ===
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
  
  // === Tipos del Formulario de Contacto ===
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
  
  // === Tipos de Jira ===
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
      customfield_10000?: string; // Email del contacto
      customfield_10001?: string; // Teléfono del contacto
      customfield_10002?: string; // Empresa del contacto
      [key: string]: unknown; // Permite agregar campos personalizados dinámicos
    };
  }
  
  export interface JiraResponse {
    id: string;
    key: string;
    self: string;
  }
  
  // === Tipos de Email ===
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