import { Request, Response } from 'express';

export class HealthController {
  async healthCheck(req: Request, res: Response): Promise<void> {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'Movonte API - Chatbot & Contact',
      version: '1.0.0',
      endpoints: {
        contact: '/api/contact',
        chatbot: '/api/chatbot/*',
        health: '/health'
      }
    });
  }

  async detailedHealth(req: Request, res: Response): Promise<void> {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        openai: {
          configured: !!process.env.OPENAI_API_KEY,
          assistantId: !!process.env.OPENAI_ASSISTANT_ID
        },
        jira: {
          configured: !!(process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN && process.env.JIRA_WIDGET && process.env.JIRA_WIDGET_TOKEN),
          baseUrl: process.env.JIRA_BASE_URL || 'Not configured',
          widgetAccount: process.env.JIRA_WIDGET || 'Not configured',
          aiAccount: process.env.JIRA_EMAIL || 'Not configured'
        },
        email: {
          configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
          host: process.env.SMTP_HOST || 'Not configured'
        }
      },
      environment: process.env.NODE_ENV || 'development'
    };

    res.json(health);
  }
}