import { Request, Response } from 'express';
import { JiraService } from '../services/jira_service';
import { OpenAIService } from '../services/openAI_service';
import { ConfigurationService } from '../services/configuration_service';

export class WidgetIntegrationController {
  private jiraService: JiraService;
  private openaiService: OpenAIService;
  private configService: ConfigurationService;

  constructor() {
    this.jiraService = JiraService.getInstance();
    this.openaiService = new OpenAIService();
    this.configService = ConfigurationService.getInstance();
  }

  /**
   * Connect widget to an existing Jira ticket
   */
  async connectToTicket(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey, customerInfo } = req.body;

      if (!issueKey || !customerInfo) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: issueKey and customerInfo'
        });
        return;
      }

      console.log(`🔗 Connecting widget to ticket ${issueKey} for customer ${customerInfo.email}`);

      // Verify the ticket exists
      const issue = await this.jiraService.getIssueByKey(issueKey);
      
      if (!issue) {
        res.status(404).json({
          success: false,
          error: 'Ticket not found'
        });
        return;
      }

      // Create chat session
      await this.jiraService.createChatSession(issueKey, customerInfo);

      // Get conversation history
      const history = await this.jiraService.getConversationHistory(issueKey);

      res.json({
        success: true,
        issue: {
          key: issueKey,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          url: `${process.env.JIRA_BASE_URL}/browse/${issueKey}`
        },
        conversationHistory: history,
        message: 'Widget connected successfully to Jira ticket'
      });

    } catch (error) {
      console.error('Error connecting widget to ticket:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send message from widget to Jira
   */
  async sendMessageToJira(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey, message, customerInfo } = req.body;

      if (!issueKey || !message || !customerInfo) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: issueKey, message, and customerInfo'
        });
        return;
      }

      console.log(`📤 Sending message to Jira ticket ${issueKey}: ${message}`);

      // Check if assistant is disabled for this ticket
      if (this.configService.isTicketDisabled(issueKey)) {
        const disabledInfo = this.configService.getDisabledTicketInfo(issueKey);
        console.log(`🚫 AI Assistant disabled for ticket ${issueKey}: ${disabledInfo?.reason || 'No reason provided'}`);
        
        // Add message to Jira but don't process with AI
        await this.jiraService.addCommentToIssue(issueKey, message, {
          name: customerInfo.name,
          email: customerInfo.email,
          source: 'widget'
        });

        res.json({
          success: true,
          message: 'Message sent to Jira, but AI assistant is disabled for this ticket',
          aiDisabled: true,
          disabledInfo: {
            reason: disabledInfo?.reason || 'No reason provided',
            disabledAt: disabledInfo?.disabledAt,
            disabledBy: disabledInfo?.disabledBy
          }
        });
        return;
      }

      // Add message to Jira
      await this.jiraService.addCommentToIssue(issueKey, message, {
        name: customerInfo.name,
        email: customerInfo.email,
        source: 'widget'
      });

      // Process with AI and get response
      const aiResponse = await this.openaiService.processChatForService(
        message,
        'landing-page',
        `widget_${issueKey}`,
        {
          jiraIssueKey: issueKey,
          customerInfo,
          isWidgetMessage: true
        }
      );

      if (aiResponse.success && aiResponse.response) {
        // Add AI response to Jira
        await this.jiraService.addCommentToIssue(issueKey, aiResponse.response, {
          name: 'AI Assistant',
          source: 'jira'
        });

        res.json({
          success: true,
          message: 'Message sent to Jira successfully',
          aiResponse: aiResponse.response,
          threadId: aiResponse.threadId
        });
      } else {
        res.json({
          success: true,
          message: 'Message sent to Jira successfully',
          aiResponse: null,
          error: aiResponse.error
        });
      }

    } catch (error) {
      console.error('Error sending message to Jira:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get conversation history for a ticket
   */
  async getConversationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;

      if (!issueKey) {
        res.status(400).json({
          success: false,
          error: 'Missing issueKey parameter'
        });
        return;
      }

      console.log(`📋 Getting conversation history for ticket ${issueKey}`);

      const history = await this.jiraService.getConversationHistory(issueKey);

      res.json({
        success: true,
        issueKey,
        conversationHistory: history
      });

    } catch (error) {
      console.error('Error getting conversation history:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Search for existing tickets by customer email
   */
  async searchTicketsByEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Missing or invalid email parameter'
        });
        return;
      }

      console.log(`🔍 Searching tickets for email: ${email}`);

      const searchResults = await this.jiraService.searchIssuesByEmail(email);

      res.json({
        success: true,
        email,
        tickets: searchResults.issues || []
      });

    } catch (error) {
      console.error('Error searching tickets by email:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;
      const { status } = req.body;

      if (!issueKey || !status) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: issueKey and status'
        });
        return;
      }

      console.log(`🔄 Updating ticket ${issueKey} status to ${status}`);

      await this.jiraService.updateIssueStatus(issueKey, status);

      res.json({
        success: true,
        message: `Ticket ${issueKey} status updated to ${status}`
      });

    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get ticket details
   */
  async getTicketDetails(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.params;

      if (!issueKey) {
        res.status(400).json({
          success: false,
          error: 'Missing issueKey parameter'
        });
        return;
      }

      console.log(`📋 Getting details for ticket ${issueKey}`);

      const issue = await this.jiraService.getIssueByKey(issueKey);

      res.json({
        success: true,
        issue: {
          key: issue.key,
          summary: issue.fields.summary,
          description: issue.fields.description,
          status: issue.fields.status.name,
          priority: issue.fields.priority?.name,
          created: issue.fields.created,
          updated: issue.fields.updated,
          url: `${process.env.JIRA_BASE_URL}/browse/${issueKey}`
        }
      });

    } catch (error) {
      console.error('Error getting ticket details:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check for new messages in Jira (for polling)
   */
  async checkNewMessages(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey, lastMessageId } = req.query;

      if (!issueKey || typeof issueKey !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Missing or invalid issueKey parameter'
        });
        return;
      }

      console.log(`🔍 Checking for new messages in ticket ${issueKey} since message ${lastMessageId}`);

      // Get all comments for the issue
      const commentsResponse = await this.jiraService.getIssueComments(issueKey as string);
      
      // Jira API v3 returns { comments: [...] }, extract the array
      const commentsArray = commentsResponse?.comments || [];
      
      if (commentsArray.length === 0) {
        res.json({
          success: true,
          issueKey,
          newMessages: [],
          hasNewMessages: false,
          lastMessageId: null
        });
        return;
      }

      // Filter new messages (after the last known message ID)
      let newMessages = commentsArray;
      if (lastMessageId && lastMessageId !== 'null' && lastMessageId !== 'undefined' && lastMessageId !== '') {
        const lastMessageIndex = commentsArray.findIndex((comment: any) => comment.id === lastMessageId);
        if (lastMessageIndex !== -1) {
          newMessages = commentsArray.slice(lastMessageIndex + 1);
        } else {
          // If lastMessageId not found, return all messages (first time polling)
          console.log(`⚠️ Last message ID ${lastMessageId} not found, returning all messages`);
        }
      } else {
        // First time polling or invalid lastMessageId, return all messages
        console.log(`📋 First time polling or invalid lastMessageId (${lastMessageId}), returning all messages`);
      }

      // Format messages for the widget
      const formattedMessages = newMessages.map((comment: any) => {
        const isFromAI = this.isAIComment(comment);
        const isFromAgent = this.isAgentComment(comment);
        
        return {
          id: comment.id,
          body: this.extractTextFromADF(comment.body),
          author: {
            displayName: comment.author.displayName,
            emailAddress: comment.author.emailAddress
          },
          created: comment.created,
          isFromAI: isFromAI,
          isFromAgent: isFromAgent,
          source: isFromAI ? 'assistant' : (isFromAgent ? 'agent' : 'user')
        };
      });

      // Get the latest message ID (always return the latest, even if no new messages)
      const latestMessageId = commentsArray.length > 0 ? commentsArray[commentsArray.length - 1].id : null;

      console.log(`📊 Polling response for ${issueKey}:`, {
        totalComments: commentsArray.length,
        newMessages: formattedMessages.length,
        latestMessageId: latestMessageId,
        lastKnownId: lastMessageId
      });

      res.json({
        success: true,
        issueKey,
        newMessages: formattedMessages,
        hasNewMessages: formattedMessages.length > 0,
        lastMessageId: latestMessageId,
        totalMessages: commentsArray.length
      });

    } catch (error) {
      console.error('Error checking for new messages:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Extract text from Jira ADF (Atlassian Document Format) body
   */
  private extractTextFromADF(body: any): string {
    if (typeof body === 'string') {
      return body;
    }
    
    if (body && body.content && Array.isArray(body.content)) {
      return this.extractTextFromADFContent(body.content);
    }
    
    return '';
  }

  /**
   * Recursively extract text from ADF content array
   */
  private extractTextFromADFContent(content: any[]): string {
    let text = '';
    
    for (const item of content) {
      if (item.type === 'text' && item.text) {
        text += item.text;
      } else if (item.content && Array.isArray(item.content)) {
        text += this.extractTextFromADFContent(item.content);
      }
    }
    
    return text;
  }

  /**
   * Helper method to detect agent comments (not AI, but human agents)
   */
  private isAgentComment(comment: any): boolean {
    const authorEmail = comment.author.emailAddress?.toLowerCase() || '';
    const authorDisplayName = comment.author.displayName?.toLowerCase() || '';
    
    // Check if it's an internal note (agents typically use internal notes)
    const isInternalNote = comment.jsdPublic === false;
    
    // Check if it's from a known agent email (you can add more agent emails here)
    const agentEmails = [
      'isaac.toledo@movonte.com',
      'isaac@movonte.com',
      'admin@movonte.com'
      // Add more agent emails as needed
    ];
    
    const isFromAgentEmail = agentEmails.some(email => 
      authorEmail.includes(email.toLowerCase())
    );
    
    // Check if display name suggests it's an agent
    const isAgentName = authorDisplayName.includes('isaac') || 
                       authorDisplayName.includes('toledo') ||
                       authorDisplayName.includes('agent') ||
                       authorDisplayName.includes('admin');
    
    return isInternalNote || isFromAgentEmail || isAgentName;
  }

  /**
   * Helper method to detect AI comments
   */
  private isAIComment(comment: any): boolean {
    const authorEmail = comment.author.emailAddress?.toLowerCase() || '';
    const commentBody = this.extractTextFromADF(comment.body).toLowerCase();

    // Check if comment is from AI account (JIRA_EMAIL)
    const aiEmail = process.env.JIRA_EMAIL?.toLowerCase() || '';
    const isFromAIAccount = authorEmail === aiEmail;
    
    // Patrones en el contenido que indican comentarios de IA
    const aiContentPatterns = [
      'complete.', 'how can i assist you',
      '🎯 **chat session started**', 'chat widget connected',
      'as an atlassian solution partner', 'offers integration services'
    ];
    
    // Detectar por contenido
    const isAIContent = aiContentPatterns.some(pattern => 
      commentBody.includes(pattern)
    );
    
    return isFromAIAccount || isAIContent;
  }

  /**
   * Health check for widget integration
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Test Jira connection
      await this.jiraService.testConnection();

      res.json({
        success: true,
        message: 'Widget integration is healthy',
        timestamp: new Date().toISOString(),
        services: {
          jira: 'connected',
          openai: 'available'
        }
      });

    } catch (error) {
      console.error('Widget integration health check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Widget integration health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check if assistant is disabled for a ticket
   */
  async checkAssistantStatus(req: Request, res: Response): Promise<void> {
    try {
      const { issueKey } = req.query;

      if (!issueKey || typeof issueKey !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Missing or invalid issueKey parameter'
        });
        return;
      }

      const isDisabled = this.configService.isTicketDisabled(issueKey);
      const disabledInfo = isDisabled ? this.configService.getDisabledTicketInfo(issueKey) : null;

      res.json({
        success: true,
        issueKey,
        isDisabled,
        disabledInfo: disabledInfo ? {
          reason: disabledInfo.reason,
          disabledAt: disabledInfo.disabledAt,
          disabledBy: disabledInfo.disabledBy
        } : null
      });

    } catch (error) {
      console.error('Error checking assistant status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
