import { Router } from 'express';
import { ContactController } from '../controllers/contact_controller';
import { ChatbotController } from '../controllers/chatbot_controller';
import { HealthController } from '../controllers/health_controller';
import { LandingController } from '../controllers/landing_controller';
import { AdminController } from '../controllers/admin_controller';
import { WidgetIntegrationController } from '../controllers/widget_integration_controller';
import { JiraService } from '../services/jira_service';
// import { EmailService } from '../services/email_service';
import { OpenAIService } from '../services/openAI_service';
import { 
  login, 
  logout, 
  verifyToken, 
  getProfile, 
  changePassword,
  getAllUsers,
  createUser,
  updateUser,
  changeUserPassword,
  deleteUser
} from '../controllers/auth_controller';
import { authenticateToken, requireAdmin, requirePermission, redirectToLoginIfNotAuth } from '../middleware/auth';

// Initialize services
// const emailService = new EmailService();
const openaiService = new OpenAIService();

// Initialize controllers
const contactController = new ContactController(null); // emailService commented out
const chatbotController = new ChatbotController(openaiService, null); // emailService commented out
const healthController = new HealthController();
const landingController = new LandingController();
const adminController = new AdminController();
const widgetIntegrationController = new WidgetIntegrationController();

const router = Router();

// === AUTH ROUTES ===
router.post('/api/auth/login', login);
router.post('/api/auth/logout', logout);
router.get('/api/auth/verify', authenticateToken, verifyToken);
router.get('/api/auth/profile', authenticateToken, getProfile);
router.put('/api/auth/change-password', authenticateToken, changePassword);

// === USER MANAGEMENT ROUTES (ADMIN ONLY) ===
router.get('/api/admin/users', authenticateToken, requireAdmin, getAllUsers);
router.post('/api/admin/users', authenticateToken, requireAdmin, createUser);
router.put('/api/admin/users/:id', authenticateToken, requireAdmin, updateUser);
router.put('/api/admin/users/:id/password', authenticateToken, requireAdmin, changeUserPassword);
router.delete('/api/admin/users/:id', authenticateToken, requireAdmin, deleteUser);

// Página de login
router.get('/login', (req, res) => {
  res.sendFile('login.html', { root: 'public' });
});

// === HEALTH ROUTES ===
router.get('/health', healthController.healthCheck.bind(healthController));
router.get('/health/detailed', healthController.detailedHealth.bind(healthController));

// === WIDGET ROUTES ===
router.get('/widget', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

router.get('/jira-widget', (req, res) => {
  res.sendFile('jira-widget.html', { root: 'public' });
});

router.get('/test-instructions', (req, res) => {
  res.sendFile('test-instructions.html', { root: 'public' });
});

router.get('/service-desk', (req, res) => {
  res.sendFile('jira-service-desk-widget.html', { root: 'public' });
});

router.get('/jira-chat-test', (req, res) => {
  res.sendFile('jira-chat-test.html', { root: 'public' });
});

router.get('/hybrid-chat', (req, res) => {
  res.sendFile('hybrid-chat-widget.html', { root: 'public' });
});

router.get('/landing-form', (req, res) => {
  res.sendFile('landing-form-example.html', { root: 'public' });
});

router.get('/webhook-monitor', (req, res) => {
  res.sendFile('webhook-monitor.html', { root: 'public' });
});

router.get('/assistant-selector', (req, res) => {
  res.sendFile('assistant-selector.html', { root: 'public' });
});

// Redirigir /ceo-dashboard a la raíz
router.get('/ceo-dashboard', redirectToLoginIfNotAuth, requireAdmin, (req, res) => {
  res.redirect('/');
});

router.get('/jira-integrated-widget', (req, res) => {
  res.sendFile('jira-integrated-widget.html', { root: 'public' });
});

// === CONTACT ROUTES ===
router.post('/api/contact', contactController.submitContactForm.bind(contactController));
router.get('/api/contact/test-jira', contactController.testJiraConnection.bind(contactController));

// === LANDING PAGE ROUTES ===
router.post('/api/landing/create-ticket', landingController.createTicketFromLanding.bind(landingController));
router.post('/api/landing/validate-form', landingController.validateLandingForm.bind(landingController));
router.get('/api/landing/form-fields', landingController.getLandingFormFields.bind(landingController));

// === CHATBOT ROUTES ===
// Jira webhook
router.post('/api/chatbot/webhook/jira', chatbotController.handleJiraWebhook.bind(chatbotController));

// Endpoint de prueba para webhook - REDIRIGIENDO AL CHATBOT
router.post('/api/webhook/jira', (req, res) => {
  console.log('🔍 WEBHOOK RECIBIDO EN ENDPOINT DE PRUEBA - REDIRIGIENDO AL CHATBOT');
  console.log('📋 Headers:', req.headers);
  console.log('📦 Body:', req.body);
  
  // Redirigir al chatbot controller
  return chatbotController.handleJiraWebhook(req, res);
});

// Endpoint GET para verificar que el servidor está funcionando
router.get('/api/webhook/jira', (req, res) => {
  console.log('🔍 WEBHOOK GET TEST ENDPOINT HIT');
  res.json({ 
    success: true, 
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    serverInfo: {
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }
  });
});

// Direct chat
router.post('/api/chatbot/chat', chatbotController.handleDirectChat.bind(chatbotController));

// === ASSISTANT MANAGEMENT ROUTES ===
// Listar asistentes disponibles
router.get('/api/chatbot/assistants', chatbotController.listAssistants.bind(chatbotController));

// Cambiar asistente activo
router.post('/api/chatbot/assistants/set-active', chatbotController.setActiveAssistant.bind(chatbotController));

// Obtener asistente activo actual
router.get('/api/chatbot/assistants/active', chatbotController.getActiveAssistant.bind(chatbotController));

// === ADMIN ROUTES (CEO Dashboard) - PROTECTED ===
// Dashboard principal - accesible para admin y usuarios con permisos
router.get('/api/admin/dashboard', authenticateToken, adminController.getDashboard.bind(adminController));

// Gestión de configuraciones de servicios
router.get('/api/admin/services/:serviceId', authenticateToken, requireAdmin, adminController.getServiceConfiguration.bind(adminController));
router.put('/api/admin/services/:serviceId', authenticateToken, requireAdmin, adminController.updateServiceConfiguration.bind(adminController));
router.patch('/api/admin/services/:serviceId/toggle', authenticateToken, requireAdmin, adminController.toggleService.bind(adminController));
router.post('/api/admin/services', authenticateToken, requireAdmin, adminController.addService.bind(adminController));
router.delete('/api/admin/services/:serviceId', authenticateToken, requireAdmin, adminController.removeService.bind(adminController));

// === PROJECT MANAGEMENT ROUTES - PROTECTED ===
// Listar proyectos disponibles
router.get('/api/admin/projects', authenticateToken, requirePermission('aiEnabledProjects'), adminController.listProjects.bind(adminController));

// Cambiar proyecto activo
router.post('/api/admin/projects/set-active', authenticateToken, requireAdmin, adminController.setActiveProject.bind(adminController));

// Obtener proyecto activo actual
router.get('/api/admin/projects/active', authenticateToken, requirePermission('aiEnabledProjects'), adminController.getActiveProject.bind(adminController));

// Obtener detalles de un proyecto específico
router.get('/api/admin/projects/:projectKey', authenticateToken, requireAdmin, adminController.getProjectDetails.bind(adminController));

// Probar conexión con Jira
router.get('/api/admin/jira/test-connection', authenticateToken, requireAdmin, adminController.testJiraConnection.bind(adminController));

// Endpoint público para obtener asistente activo de un servicio
router.get('/api/services/:serviceId/assistant', adminController.getActiveAssistantForService.bind(adminController));

// === TICKET CONTROL ROUTES - PROTECTED ===
// Desactivar asistente en un ticket específico
router.post('/api/admin/tickets/:issueKey/disable', authenticateToken, requireAdmin, adminController.disableAssistantForTicket.bind(adminController));

// Reactivar asistente en un ticket específico
router.post('/api/admin/tickets/:issueKey/enable', authenticateToken, requireAdmin, adminController.enableAssistantForTicket.bind(adminController));

// Obtener lista de tickets con asistente desactivado
router.get('/api/admin/tickets/disabled', authenticateToken, requirePermission('ticketControl'), adminController.getDisabledTickets.bind(adminController));

// Verificar estado del asistente en un ticket
router.get('/api/admin/tickets/:issueKey/status', authenticateToken, requireAdmin, adminController.checkTicketAssistantStatus.bind(adminController));

// Chat específico por servicio
router.post('/api/services/:serviceId/chat', chatbotController.handleServiceChat.bind(chatbotController));

// Chat with custom instructions
router.post('/api/chatbot/chat-with-instructions', chatbotController.handleChatWithInstructions.bind(chatbotController));

// Jira chat integration
router.post('/api/chatbot/jira-chat', chatbotController.handleJiraChat.bind(chatbotController));

// Thread history
router.get('/api/chatbot/thread/:threadId', chatbotController.getThreadHistory.bind(chatbotController));

// List active threads
router.get('/api/chatbot/threads', chatbotController.listActiveThreads.bind(chatbotController));

// Webhook monitoring
router.get('/api/chatbot/webhook/stats', chatbotController.getWebhookStats.bind(chatbotController));
router.post('/api/chatbot/webhook/reset', chatbotController.resetWebhookStats.bind(chatbotController));

// Conversation report
router.get('/api/chatbot/conversation/:issueKey/report', chatbotController.getConversationReport.bind(chatbotController));

// === WIDGET INTEGRATION ROUTES ===
// Connect widget to existing Jira ticket
router.post('/api/widget/connect', widgetIntegrationController.connectToTicket.bind(widgetIntegrationController));

// Send message from widget to Jira
router.post('/api/widget/send-message', widgetIntegrationController.sendMessageToJira.bind(widgetIntegrationController));

// Get conversation history for a ticket
router.get('/api/widget/conversation/:issueKey', widgetIntegrationController.getConversationHistory.bind(widgetIntegrationController));

// Search tickets by customer email
router.get('/api/widget/search-tickets', widgetIntegrationController.searchTicketsByEmail.bind(widgetIntegrationController));

// Update ticket status
router.put('/api/widget/ticket/:issueKey/status', widgetIntegrationController.updateTicketStatus.bind(widgetIntegrationController));

// Get ticket details
router.get('/api/widget/ticket/:issueKey', widgetIntegrationController.getTicketDetails.bind(widgetIntegrationController));

// Health check for widget integration
router.get('/api/widget/health', widgetIntegrationController.healthCheck.bind(widgetIntegrationController));

// Check for new messages in Jira (for polling)
router.get('/api/widget/check-messages', widgetIntegrationController.checkNewMessages.bind(widgetIntegrationController));

// Check if assistant is disabled for a ticket
router.get('/api/widget/assistant-status', widgetIntegrationController.checkAssistantStatus.bind(widgetIntegrationController));

// === WEBHOOK CONFIGURATION ROUTES - PROTECTED ===
// Configurar webhook
router.post('/api/admin/webhook/configure', authenticateToken, requireAdmin, adminController.configureWebhook.bind(adminController));

// Probar webhook
router.post('/api/admin/webhook/test', authenticateToken, requireAdmin, adminController.testWebhook.bind(adminController));

// Deshabilitar webhook
router.post('/api/admin/webhook/disable', authenticateToken, requireAdmin, adminController.disableWebhook.bind(adminController));

// Obtener estado del webhook
router.get('/api/admin/webhook/status', authenticateToken, requirePermission('webhookConfiguration'), adminController.getWebhookStatus.bind(adminController));

// Configurar filtro del webhook
router.post('/api/admin/webhook/filter', authenticateToken, requireAdmin, adminController.configureWebhookFilter.bind(adminController));

// Obtener webhooks guardados
router.get('/api/admin/webhooks/saved', authenticateToken, requirePermission('webhookConfiguration'), adminController.getSavedWebhooks.bind(adminController));

// Guardar nuevo webhook
router.post('/api/admin/webhooks/save', authenticateToken, requireAdmin, adminController.saveWebhook.bind(adminController));

// Eliminar webhook guardado
router.delete('/api/admin/webhooks/:id', authenticateToken, requireAdmin, adminController.deleteSavedWebhook.bind(adminController));

// === STATUS-BASED DISABLE ROUTES - PROTECTED ===
// Configurar deshabilitación basada en estados
router.post('/api/admin/status-disable/configure', authenticateToken, requireAdmin, adminController.configureStatusBasedDisable.bind(adminController));

// Obtener configuración de deshabilitación basada en estados
router.get('/api/admin/status-disable/config', authenticateToken, requirePermission('automaticAIDisableRules'), adminController.getStatusBasedDisableConfig.bind(adminController));

// Obtener estados disponibles de Jira
router.get('/api/admin/statuses/available', authenticateToken, requireAdmin, adminController.getAvailableStatuses.bind(adminController));

// === USER PERMISSIONS MANAGEMENT ROUTES - PROTECTED ===
// Listar usuarios con permisos (solo admins)
router.get('/api/admin/users/permissions', authenticateToken, requireAdmin, adminController.getUsersWithPermissions.bind(adminController));

// Obtener permisos de un usuario específico (solo admins)
router.get('/api/admin/users/:userId/permissions', authenticateToken, requireAdmin, adminController.getUserPermissions.bind(adminController));

// Actualizar permisos de un usuario (solo admins)
router.put('/api/admin/users/:userId/permissions', authenticateToken, requireAdmin, adminController.updateUserPermissions.bind(adminController));

// Send email with chat context - COMMENTED OUT FOR TESTING
// router.post('/api/chatbot/email/send-with-context', chatbotController.sendEmailWithChatContext.bind(chatbotController));

export default router;