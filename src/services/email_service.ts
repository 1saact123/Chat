import nodemailer from 'nodemailer';
import { createTransport } from 'nodemailer';
import { EmailRequest, EmailResponse, ContactFormData } from '../types';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log('Email server is ready');
    } catch (error) {
      console.error('Email configuration error:', error);
    }
  }

  async sendEmail(emailRequest: EmailRequest): Promise<EmailResponse> {
    try {
      const emailContent = this.generateEmailContent(
        emailRequest.message, 
        emailRequest.template, 
        emailRequest.templateData
      );
      
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: Array.isArray(emailRequest.to) ? emailRequest.to.join(', ') : emailRequest.to,
        cc: emailRequest.cc ? (Array.isArray(emailRequest.cc) ? emailRequest.cc.join(', ') : emailRequest.cc) : undefined,
        bcc: emailRequest.bcc ? (Array.isArray(emailRequest.bcc) ? emailRequest.bcc.join(', ') : emailRequest.bcc) : undefined,
        subject: emailRequest.subject,
        html: emailContent.html,
        text: emailContent.text,
        attachments: emailRequest.attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('Email sent successfully:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendContactFormFallback(formData: ContactFormData): Promise<EmailResponse> {
    const emailRequest: EmailRequest = {
      to: process.env.FALLBACK_EMAIL || 'contact@movonte.atlassian.net',
      subject: `[FALLBACK] Nuevo contacto: ${formData.name} - ${formData.company || 'Sin empresa'}`,
      message: 'Nuevo formulario de contacto (fallback desde Jira)',
      template: 'contact_form',
      templateData: formData
    };

    return this.sendEmail(emailRequest);
  }

  private generateEmailContent(message: string, template?: string, templateData?: any): { html: string; text: string } {
    switch (template) {
      case 'contact_form':
        return this.generateContactFormTemplate(message, templateData);
      case 'jira_update':
        return this.generateJiraUpdateTemplate(message, templateData);
      case 'chat_summary':
        return this.generateChatSummaryTemplate(message, templateData);
      default:
        return {
          html: this.wrapInBasicHtmlTemplate(message),
          text: message
        };
    }
  }

  private generateContactFormTemplate(message: string, data: ContactFormData): { html: string; text: string } {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .contact-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>Nuevo Contacto desde Web</h2>
        </div>
        <div class="content">
            <p>${message}</p>
            <div class="contact-info">
                <strong>Nombre:</strong> ${data.name}<br>
                <strong>Email:</strong> ${data.email}<br>
                <strong>Empresa:</strong> ${data.company || 'No especificada'}<br>
                <strong>Teléfono:</strong> ${data.phone || 'No proporcionado'}<br>
                <strong>Fuente:</strong> ${data.source || 'Formulario web'}<br><br>
                <strong>Mensaje:</strong><br>
                <p style="background: #fff; padding: 10px; border: 1px solid #ddd;">${data.message}</p>
            </div>
        </div>
        <div class="footer">
            <p>Email enviado automáticamente - ${new Date().toLocaleString()}</p>
        </div>
    </body>
    </html>
    `;
    
    const text = `
NUEVO CONTACTO DESDE WEB

${message}

Nombre: ${data.name}
Email: ${data.email}  
Empresa: ${data.company || 'No especificada'}
Teléfono: ${data.phone || 'No proporcionado'}
Fuente: ${data.source || 'Formulario web'}

Mensaje:
${data.message}

---
Email enviado automáticamente - ${new Date().toLocaleString()}
    `;
    
    return { html, text };
  }

  private generateJiraUpdateTemplate(message: string, data: any): { html: string; text: string } {
    // Implementación similar al código anterior
    return {
      html: this.wrapInBasicHtmlTemplate(`Jira Update: ${message}`),
      text: `Jira Update: ${message}`
    };
  }

  private generateChatSummaryTemplate(message: string, data: any): { html: string; text: string } {
    // Implementación similar al código anterior
    return {
      html: this.wrapInBasicHtmlTemplate(`Chat Summary: ${message}`),
      text: `Chat Summary: ${message}`
    };
  }

  private wrapInBasicHtmlTemplate(message: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; }
        </style>
    </head>
    <body>
        <p>${message.replace(/\n/g, '<br>')}</p>
    </body>
    </html>
    `;
  }
}