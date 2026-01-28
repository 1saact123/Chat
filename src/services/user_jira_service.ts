import axios from 'axios';
import { Buffer } from 'buffer';

export class UserJiraService {
  private baseUrl: string;
  private auth: string;
  private userId: number;

  constructor(userId: number, jiraToken: string, jiraUrl: string, userEmail: string) {
    this.userId = userId;
    this.baseUrl = jiraUrl;
    
    // Para autenticación Basic de Jira se necesita email:token
    this.auth = Buffer.from(`${userEmail}:${jiraToken}`).toString('base64');
  }

  // Listar proyectos del usuario
  async listProjects(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/rest/api/3/project`, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Accept': 'application/json'
        }
      });

      return response.data.map((project: any) => ({
        id: project.id,
        key: project.key,
        name: project.name,
        description: project.description
      }));
    } catch (error) {
      console.error(`Error listing projects for user ${this.userId}:`, error);
      throw error;
    }
  }

  // Obtener issue por key
  async getIssueByKey(issueKey: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/rest/api/3/issue/${issueKey}`, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error getting issue ${issueKey} for user ${this.userId}:`, error);
      throw error;
    }
  }

  // Agregar comentario
  async addCommentToIssue(issueKey: string, commentText: string): Promise<any> {
    try {
      // Formatear el texto con saltos de línea correctamente para ADF
      const lines = commentText.split('\n').filter(line => line.trim() !== '');
      
      const commentData = {
        body: {
          version: 1,
          type: 'doc',
          content: lines.map((line, index) => {
            // Detectar texto en negrita (**texto**)
            const boldRegex = /\*\*(.*?)\*\*/g;
            const parts: any[] = [];
            let lastIndex = 0;
            let match;
            
            while ((match = boldRegex.exec(line)) !== null) {
              // Agregar texto antes del match
              if (match.index > lastIndex) {
                parts.push({
                  type: 'text',
                  text: line.substring(lastIndex, match.index)
                });
              }
              // Agregar texto en negrita
              parts.push({
                type: 'text',
                text: match[1],
                marks: [{ type: 'strong' }]
              });
              lastIndex = match.index + match[0].length;
            }
            
            // Agregar texto restante
            if (lastIndex < line.length) {
              parts.push({
                type: 'text',
                text: line.substring(lastIndex)
              });
            }
            
            // Si no hay partes (línea vacía), usar texto simple
            if (parts.length === 0) {
              parts.push({ type: 'text', text: line });
            }
            
            return {
              type: 'paragraph',
              content: parts
            };
          })
        }
      };

      console.log(`📝 Adding comment to ${issueKey} using user credentials (${this.userId})`);
      
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

      return response.data;
    } catch (error: any) {
      console.error(`❌ Error adding comment to ${issueKey} for user ${this.userId}:`, error);
      
      // Log detallado del error
      if (error.response?.data) {
        console.error(`   Jira API Error:`, JSON.stringify({
          status: error.response.status,
          statusText: error.response.statusText,
          errors: error.response.data.errors,
          errorMessages: error.response.data.errorMessages,
          url: `${this.baseUrl}/rest/api/3/issue/${issueKey}/comment`
        }, null, 2));
      }
      
      throw error;
    }
  }

  // Probar conexión
  async testConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/rest/api/3/myself`, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Accept': 'application/json'
        }
      });
      return true;
    } catch (error) {
      console.error(`Connection test failed for user ${this.userId}:`, error);
      return false;
    }
  }

  // Obtener comentarios de un issue
  async getIssueComments(issueKey: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/rest/api/3/issue/${issueKey}/comment`, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Accept': 'application/json'
        }
      });

      return response.data.comments || [];
    } catch (error) {
      console.error(`Error getting comments for issue ${issueKey} for user ${this.userId}:`, error);
      throw error;
    }
  }

  // Actualizar estado de issue
  async updateIssueStatus(issueKey: string, statusName: string): Promise<any> {
    try {
      // Primero obtener las transiciones disponibles
      const transitionsResponse = await axios.get(`${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Accept': 'application/json'
        }
      });

      const transitions = transitionsResponse.data.transitions;
      const targetTransition = transitions.find((t: any) => t.name === statusName);

      if (!targetTransition) {
        throw new Error(`Status transition '${statusName}' not found`);
      }

      // Ejecutar la transición
      const response = await axios.post(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
        {
          transition: {
            id: targetTransition.id
          }
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
      console.error(`Error updating status for issue ${issueKey} for user ${this.userId}:`, error);
      throw error;
    }
  }

  // Crear issue
  async createIssue(issueData: {
    projectKey: string;
    summary: string;
    description: any;
    issueType: string;
    priority: string;
    labels?: string[];
  }): Promise<any> {
    try {
      const fields: any = {
        project: {
          key: issueData.projectKey
        },
        summary: issueData.summary,
        description: issueData.description,
        issuetype: {
          name: issueData.issueType
        }
      };

      // Agregar prioridad solo si se proporciona (puede ser opcional en algunos proyectos)
      if (issueData.priority) {
        fields.priority = {
          name: issueData.priority
        };
      }

      // Agregar labels si se proporcionan
      if (issueData.labels && issueData.labels.length > 0) {
        fields.labels = issueData.labels;
      }

      const requestData = { fields };

      const response = await axios.post(
        `${this.baseUrl}/rest/api/3/issue`,
        requestData,
        {
          headers: {
            'Authorization': `Basic ${this.auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(`❌ Error creating issue for user ${this.userId}:`, error);
      
      // Log detallado del error de Jira
      if (error.response?.data) {
        const errorData = error.response.data;
        console.error('🔍 Jira API Error Details:', JSON.stringify({
          status: error.response.status,
          statusText: error.response.statusText,
          errors: errorData.errors,
          errorMessages: errorData.errorMessages,
          fullResponse: errorData
        }, null, 2));
        
        // Log del payload que se envió
        if (error.config?.data) {
          console.error('📤 Payload enviado a Jira:', JSON.stringify(JSON.parse(error.config.data), null, 2));
        }
      }
      
      throw error;
    }
  }
}
