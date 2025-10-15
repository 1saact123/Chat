import { Request, Response } from 'express';
import { User } from '../models';
import { UserJiraService } from '../services/user_jira_service';
import { UserConfigurationService } from '../services/user_configuration_service';

export class UserTicketsController {
  
  // Obtener lista de tickets deshabilitados del usuario
  async getDisabledTickets(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      // Obtener tickets deshabilitados específicos del usuario
      const userConfigService = UserConfigurationService.getInstance(user.id);
      const disabledTickets = await userConfigService.getDisabledTickets();

      res.json({
        success: true,
        data: {
          disabledTickets,
          count: disabledTickets.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error obteniendo tickets deshabilitados del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Deshabilitar asistente en un ticket específico del usuario
  async disableAssistantForTicket(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { issueKey } = req.params;
      const { reason } = req.body;

      if (!issueKey) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el issueKey del ticket'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      // Verificar que el usuario tiene tokens configurados
      if (!user.jiraToken || !(user as any).jiraUrl) {
        res.status(400).json({
          success: false,
          error: 'Usuario no tiene configurados los tokens de Jira'
        });
        return;
      }

      // Verificar que el ticket existe en el Jira del usuario
      const jiraService = new UserJiraService(user.id, user.jiraToken, (user as any).jiraUrl);
      const issue = await jiraService.getIssueByKey(issueKey);
      
      if (!issue) {
        res.status(404).json({
          success: false,
          error: `Ticket ${issueKey} no encontrado en tu instancia de Jira`
        });
        return;
      }

      // Agregar el ticket a la lista de tickets desactivados del usuario
      const userConfigService = UserConfigurationService.getInstance(user.id);
      await userConfigService.disableAssistantForTicket(issueKey, reason || 'Manual disable');

      res.json({
        success: true,
        message: `AI Assistant disabled for ticket ${issueKey}`,
        data: {
          issueKey,
          issueSummary: issue.fields.summary,
          reason: reason || 'No reason provided',
          disabledAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error deshabilitando asistente para ticket del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Habilitar asistente en un ticket específico del usuario
  async enableAssistantForTicket(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { issueKey } = req.params;

      if (!issueKey) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el issueKey del ticket'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      // Verificar que el usuario tiene tokens configurados
      if (!user.jiraToken || !(user as any).jiraUrl) {
        res.status(400).json({
          success: false,
          error: 'Usuario no tiene configurados los tokens de Jira'
        });
        return;
      }

      // Verificar que el ticket existe en el Jira del usuario
      const jiraService = new UserJiraService(user.id, user.jiraToken, (user as any).jiraUrl);
      const issue = await jiraService.getIssueByKey(issueKey);
      
      if (!issue) {
        res.status(404).json({
          success: false,
          error: `Ticket ${issueKey} no encontrado en tu instancia de Jira`
        });
        return;
      }

      // Remover el ticket de la lista de tickets desactivados del usuario
      const userConfigService = UserConfigurationService.getInstance(user.id);
      await userConfigService.enableAssistantForTicket(issueKey);

      res.json({
        success: true,
        message: `AI Assistant re-enabled for ticket ${issueKey}`,
        data: {
          issueKey,
          issueSummary: issue.fields.summary,
          enabledAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error habilitando asistente para ticket del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Verificar estado del asistente en un ticket del usuario
  async checkTicketAssistantStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado'
        });
        return;
      }

      const { issueKey } = req.params;

      if (!issueKey) {
        res.status(400).json({
          success: false,
          error: 'Se requiere el issueKey del ticket'
        });
        return;
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
        return;
      }

      // Verificar que el usuario tiene tokens configurados
      if (!user.jiraToken || !(user as any).jiraUrl) {
        res.status(400).json({
          success: false,
          error: 'Usuario no tiene configurados los tokens de Jira'
        });
        return;
      }

      // Verificar que el ticket existe en el Jira del usuario
      const jiraService = new UserJiraService(user.id, user.jiraToken, (user as any).jiraUrl);
      const issue = await jiraService.getIssueByKey(issueKey);
      
      if (!issue) {
        res.status(404).json({
          success: false,
          error: `Ticket ${issueKey} no encontrado en tu instancia de Jira`
        });
        return;
      }

      // Verificar si el ticket está deshabilitado para el usuario
      const userConfigService = UserConfigurationService.getInstance(user.id);
      const isDisabled = await userConfigService.isTicketDisabled(issueKey);
      const ticketInfo = await userConfigService.getTicketInfo(issueKey);

      res.json({
        success: true,
        data: {
          issueKey,
          isDisabled,
          ticketInfo: isDisabled ? ticketInfo : null
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error verificando estado del ticket del usuario:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}
