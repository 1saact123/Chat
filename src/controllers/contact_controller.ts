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
      
      // Validar datos requeridos
      if (!formData.name || !formData.email || !formData.message) {
        res.status(400).json({
          success: false,
          error: 'Campos requeridos: name, email, message'
        });
        return;
      }

      // Validar email
      if (!isValidEmail(formData.email)) {
        res.status(400).json({
          success: false,
          error: 'Email no válido'
        });
        return;
      }

      console.log('Procesando formulario de contacto:', { 
        name: formData.name, 
        email: formData.email,
        company: formData.company || 'N/A'
      });

      // Intentar crear issue en Jira
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
        console.error('Error creando ticket en Jira, enviando por email como fallback:', jiraError);
        
        // Fallback: enviar por email
        try {
          await this.emailService.sendContactFormFallback(formData);
          
          const response: ContactApiResponse = {
            success: true,
            fallbackEmail: true,
            error: 'No se pudo crear el ticket en Jira, se envió por email como alternativa'
          };

          res.json(response);
        } catch (emailError) {
          console.error('Error enviando email fallback:', emailError);
          res.status(500).json({
            success: false,
            error: 'No se pudo procesar el formulario. Por favor intenta de nuevo.'
          });
        }
      }

    } catch (error) {
      console.error('Error procesando formulario de contacto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async testJiraConnection(req: Request, res: Response): Promise<void> {
    try {
      const project = await this.jiraService.testConnection();
      
      res.json({
        success: true,
        project,
        message: 'Conexión a Jira exitosa'
      });

    } catch (error) {
      console.error('Error conectando a Jira:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({
        success: false,
        error: `Error de Jira: ${errorMessage}`
      });
    }
  }
}