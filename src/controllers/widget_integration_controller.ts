import { Request, Response } from 'express';
import { JiraService } from '../services/jira_service';
import { OpenAIService } from '../services/openAI_service';

export class WidgetIntegrationController {
  private jiraService: JiraService;
  private openaiService: OpenAIService;

  constructor() {
    this.jiraService = JiraService.getInstance();
    this.openaiService = new OpenAIService();
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

      // Add message to Jira - let the webhook handle AI response
      await this.jiraService.addCommentToIssue(issueKey, message, {
        name: customerInfo.name,
        email: customerInfo.email,
        source: 'widget'
      });

      // Don't process AI response here - let the webhook handle it
      // This prevents duplicate responses
      res.json({
        success: true,
        message: 'Message sent to Jira successfully. AI response will be processed by webhook.',
        aiResponse: null
      });

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
}
