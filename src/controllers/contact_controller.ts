import { Request, Response } from 'express';
import { JiraService } from '../services/jira_service';
import { EmailService } from '../services/email_service';
import { ContactFormData, ContactApiResponse } from '../types';
import { isValidEmail } from '../utils/validations';

export class ContactController {
  constructor(
    private jiraService: JiraService,
    private emailService: EmailService
  ) {}

  async submitContactForm(req: Request, res: Response): Promise<void> {
    try {
      const formData: ContactFormData = req.body;
      
      // Validate required data
      if (!formData.name || !formData.email || !formData.message) {
        res.status(400).json({
          success: false,
          error: 'Campos requeridos: name, email, message'
        });
        return;
      }

      // Validate email
      if (!isValidEmail(formData.email)) {
        res.status(400).json({
          success: false,
          error: 'Email no válido'
        });
        return;
      }

      console.log('Processing contact form:', { 
        name: formData.name,
        email: formData.email,
        company: formData.company || 'N/A'
      });

      // Try to create issue in Jira
      try {
        const jiraIssue = await this.jiraService.createContactIssue(formData);
        
        const response: ContactApiResponse = {
          success: true,
          jiraIssue: {
            id: jiraIssue.id,
            key: jiraIssue.key,
            url: `${process.env.JIRA_BASE_URL}/browse/${jiraIssue.key}`
          }
        };

        res.json(response);
        console.log(`Ticket de Jira creado exitosamente: ${jiraIssue.key}`);
        
      } catch (jiraError) {
        console.error('Error creating Jira ticket, sending via email as fallback:', jiraError);
        
        // Fallback: send by email
        try {
          await this.emailService.sendContactFormFallback(formData);
          
          const response: ContactApiResponse = {
            success: true,
            fallbackEmail: true,
            error: 'Could not create ticket in Jira, sent by email as an alternative'
          };

          res.json(response);
        } catch (emailError) {
          console.error('Error sending fallback email:', emailError);
          res.status(500).json({
            success: false,
            error: 'Could not process the form. Please try again.'
          });
        }
      }

    } catch (error) {
      console.error('Error processing contact form:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async testJiraConnection(req: Request, res: Response): Promise<void> {
    try {
      const project = await this.jiraService.testConnection();
      
      res.json({
        success: true,
        project,
        message: 'Successful connection to Jira'
      });

    } catch (error) {
      console.error('Error connecting to Jira:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({
        success: false,
        error: `Jira error: ${errorMessage}`
      });
    }
  }
}