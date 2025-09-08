import { Request, Response } from 'express';
import { JiraService } from '../services/jira_service';
import { ContactFormData, ContactApiResponse } from '../types';

export class LandingController {
  constructor(private jiraService: JiraService) {}

  async createTicketFromLanding(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, phone, company, message, projectKey } = req.body;

      // Validar campos requeridos
      if (!name || !email) {
        res.status(400).json({
          success: false,
          error: 'Name and email are required'
        });
        return;
      }

      // Validar projectKey si se proporciona
      if (projectKey && typeof projectKey !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Project key must be a string'
        });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
        return;
      }

      // Preparar datos del formulario
      const formData: ContactFormData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : undefined,
        company: company ? company.trim() : undefined,
        message: message ? message.trim() : 'Contact from landing page form',
        source: 'landing-page'
      };

      console.log('Creating ticket from landing page:', {
        name: formData.name,
        email: formData.email,
        company: formData.company,
        phone: formData.phone ? '***' : 'Not provided'
      });

      // Crear ticket en Jira (usar projectKey específico si se proporciona)
      const jiraResponse = projectKey 
        ? await this.jiraService.createContactIssueInProject(formData, projectKey)
        : await this.jiraService.createContactIssue(formData);

      console.log('Ticket created successfully:', jiraResponse.key);

      const response: ContactApiResponse = {
        success: true,
        jiraIssue: {
          id: jiraResponse.id,
          key: jiraResponse.key,
          url: `${process.env.JIRA_BASE_URL}/browse/${jiraResponse.key}`
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Error creating ticket from landing page:', error);
      
      let errorMessage = 'Failed to create ticket';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      const response: ContactApiResponse = {
        success: false,
        error: errorMessage
      };

      res.status(500).json(response);
    }
  }

  async validateLandingForm(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, phone, company } = req.body;

      const errors: string[] = [];

      // Validar nombre
      if (!name || name.trim().length < 2) {
        errors.push('Name must be at least 2 characters long');
      }

      // Validar email
      if (!email) {
        errors.push('Email is required');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push('Invalid email format');
        }
      }

      // Validar teléfono (opcional pero si se proporciona debe ser válido)
      if (phone && phone.trim()) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(phone.trim())) {
          errors.push('Invalid phone format');
        }
      }

      // Validar empresa (opcional)
      if (company && company.trim().length < 2) {
        errors.push('Company name must be at least 2 characters long');
      }

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          errors: errors
        });
        return;
      }

      res.json({
        success: true,
        message: 'Form validation passed'
      });

    } catch (error) {
      console.error('Error validating landing form:', error);
      res.status(500).json({
        success: false,
        error: 'Validation failed'
      });
    }
  }

  async getLandingFormFields(req: Request, res: Response): Promise<void> {
    try {
      // Devolver información sobre los campos del formulario
      const formFields = {
        required: ['name', 'email'],
        optional: ['phone', 'company', 'message', 'projectKey'],
        validation: {
          name: {
            minLength: 2,
            maxLength: 100,
            description: 'Full name of the contact'
          },
          email: {
            pattern: 'email',
            description: 'Valid email address'
          },
          phone: {
            pattern: 'phone',
            description: 'Phone number (optional)',
            example: '+1 (555) 123-4567'
          },
          company: {
            minLength: 2,
            maxLength: 100,
            description: 'Company name (optional)'
          },
          message: {
            maxLength: 1000,
            description: 'Additional message (optional)'
          },
          projectKey: {
            type: 'string',
            description: 'Jira project key where the ticket will be created (optional)'
          }
        }
      };

      res.json({
        success: true,
        formFields
      });

    } catch (error) {
      console.error('Error getting form fields:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get form fields'
      });
    }
  }

  async getAvailableProjects(req: Request, res: Response): Promise<void> {
    try {
      console.log('Getting available Jira projects...');
      
      const projects = await this.jiraService.getAvailableProjects();
      
      res.json({
        success: true,
        projects,
        count: projects.length
      });

    } catch (error) {
      console.error('Error getting available projects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available projects'
      });
    }
  }
}
