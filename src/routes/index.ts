import { Router } from 'express';
import { ContactController } from '../controllers/contact_controller';
import { ChatbotController } from '../controllers/chatbot_controller';
import { HealthController } from '../controllers/health_controller';
import { LandingController } from '../controllers/landing_controller';
import { AdminController } from '../controllers/admin_controller';
import { WidgetIntegrationController } from '../controllers/widget_integration_controller';
import { UserController } from '../controllers/user_controller';
import { UserServiceController } from '../controllers/user_service_controller';
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
const userController = new UserController();
const userServiceController = new UserServiceController();

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

// === USER SYSTEM ROUTES ===
// Login de usuario
router.post('/api/user/login', userController.login.bind(userController));

// Perfil del usuario
router.get('/api/user/profile', authenticateToken, userController.getProfile.bind(userController));

// Gestión de instancias del usuario
router.get('/api/user/instances', authenticateToken, userController.getUserInstances.bind(userController));
router.post('/api/user/instances', authenticateToken, userController.createInstance.bind(userController));
router.put('/api/user/instances/:id', authenticateToken, userController.updateInstance.bind(userController));
router.delete('/api/user/instances/:id', authenticateToken, userController.deleteInstance.bind(userController));

// Configuraciones de servicios del usuario (legacy)
router.get('/api/user/services', authenticateToken, userController.getUserServiceConfigurations.bind(userController));
router.post('/api/user/services', authenticateToken, userController.setUserServiceConfiguration.bind(userController));

// === USER SERVICE MANAGEMENT ROUTES ===
// Dashboard del usuario
router.get('/api/user/dashboard', authenticateToken, userServiceController.getUserDashboard.bind(userServiceController));

// Gestión de servicios del usuario
router.post('/api/user/services/create', authenticateToken, userServiceController.createUserService.bind(userServiceController));
router.get('/api/user/services/list', authenticateToken, userServiceController.getUserServices.bind(userServiceController));
router.put('/api/user/services/:serviceId', authenticateToken, userServiceController.updateUserService.bind(userServiceController));
router.delete('/api/user/services/:serviceId', authenticateToken, userServiceController.deleteUserService.bind(userServiceController));

// Chat con servicios del usuario
router.post('/api/user/services/:serviceId/chat', authenticateToken, userServiceController.chatWithUserService.bind(userServiceController));

// Asistentes del usuario
router.get('/api/user/assistants', authenticateToken, userServiceController.getUserAssistants.bind(userServiceController));

// Proyectos Jira del usuario
router.get('/api/user/projects', authenticateToken, userServiceController.getUserProjects.bind(userServiceController));

// Endpoint público para obtener asistente activo de un servicio del usuario
router.get('/api/user/services/:serviceId/assistant', userServiceController.getActiveAssistantForUserService.bind(userServiceController));

// Configuración de webhook del usuario
router.get('/api/user/webhook', authenticateToken, userController.getUserWebhookConfiguration.bind(userController));
router.post('/api/user/webhook', authenticateToken, userController.setUserWebhookConfiguration.bind(userController));
router.post('/api/user/webhook/filter', authenticateToken, userController.setUserWebhookFilter.bind(userController));

// Registro de usuario (solo admin)
router.post('/api/user/register', authenticateToken, requireAdmin, userController.registerUser.bind(userController));

// Configuración inicial
router.get('/api/user/setup/status', authenticateToken, userController.getInitialSetupStatus.bind(userController));
router.post('/api/user/setup/complete', authenticateToken, userController.completeInitialSetup.bind(userController));
router.post('/api/user/setup/validate-tokens', authenticateToken, userController.validateTokens.bind(userController));

// Página de login
router.get('/login', (req, res) => {
  res.sendFile('login.html', { root: 'public' });
});

// Página de configuración inicial
router.get('/initial-setup', redirectToLoginIfNotAuth, (req, res) => {
  res.sendFile('initial-setup.html', { root: 'public' });
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
router.get('/ceo-dashboard', redirectToLoginIfNotAuth, (req, res) => {
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
router.get('/api/admin/services/:serviceId', authenticateToken, requirePermission('serviceManagement'), adminController.getServiceConfiguration.bind(adminController));
router.put('/api/admin/services/:serviceId', authenticateToken, requirePermission('serviceManagement'), adminController.updateServiceConfiguration.bind(adminController));
router.patch('/api/admin/services/:serviceId/toggle', authenticateToken, requirePermission('serviceManagement'), adminController.toggleService.bind(adminController));
router.post('/api/admin/services', authenticateToken, requirePermission('serviceManagement'), adminController.addService.bind(adminController));
router.delete('/api/admin/services/:serviceId', authenticateToken, requirePermission('serviceManagement'), adminController.removeService.bind(adminController));

// === PROJECT MANAGEMENT ROUTES - PROTECTED ===
// Listar proyectos disponibles
router.get('/api/admin/projects', authenticateToken, requirePermission('aiEnabledProjects'), adminController.listProjects.bind(adminController));

// Cambiar proyecto activo
router.post('/api/admin/projects/set-active', authenticateToken, requirePermission('aiEnabledProjects'), adminController.setActiveProject.bind(adminController));

// Obtener proyecto activo actual
router.get('/api/admin/projects/active', authenticateToken, requirePermission('aiEnabledProjects'), adminController.getActiveProject.bind(adminController));

// Obtener detalles de un proyecto específico
router.get('/api/admin/projects/:projectKey', authenticateToken, requirePermission('aiEnabledProjects'), adminController.getProjectDetails.bind(adminController));

// Probar conexión con Jira
router.get('/api/admin/jira/test-connection', authenticateToken, requirePermission('aiEnabledProjects'), adminController.testJiraConnection.bind(adminController));

// Endpoint público para obtener asistente activo de un servicio
router.get('/api/services/:serviceId/assistant', adminController.getActiveAssistantForService.bind(adminController));

// === TICKET CONTROL ROUTES - PROTECTED ===
// Desactivar asistente en un ticket específico
router.post('/api/admin/tickets/:issueKey/disable', authenticateToken, requirePermission('ticketControl'), adminController.disableAssistantForTicket.bind(adminController));

// Reactivar asistente en un ticket específico
router.post('/api/admin/tickets/:issueKey/enable', authenticateToken, requirePermission('ticketControl'), adminController.enableAssistantForTicket.bind(adminController));

// Obtener lista de tickets con asistente desactivado
router.get('/api/admin/tickets/disabled', authenticateToken, requirePermission('ticketControl'), adminController.getDisabledTickets.bind(adminController));

// Verificar estado del asistente en un ticket
router.get('/api/admin/tickets/:issueKey/status', authenticateToken, requirePermission('ticketControl'), adminController.checkTicketAssistantStatus.bind(adminController));

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
router.post('/api/admin/webhook/configure', authenticateToken, requirePermission('webhookConfiguration'), adminController.configureWebhook.bind(adminController));

// Probar webhook
router.post('/api/admin/webhook/test', authenticateToken, requirePermission('webhookConfiguration'), adminController.testWebhook.bind(adminController));

// Deshabilitar webhook
router.post('/api/admin/webhook/disable', authenticateToken, requirePermission('webhookConfiguration'), adminController.disableWebhook.bind(adminController));

// Obtener estado del webhook
router.get('/api/admin/webhook/status', authenticateToken, requirePermission('webhookConfiguration'), adminController.getWebhookStatus.bind(adminController));

// Configurar filtro del webhook
router.post('/api/admin/webhook/filter', authenticateToken, requirePermission('webhookConfiguration'), adminController.configureWebhookFilter.bind(adminController));

// Probar filtro del webhook
router.post('/api/admin/webhook/test-filter', authenticateToken, requirePermission('webhookConfiguration'), adminController.testWebhookFilter.bind(adminController));

// Obtener webhooks guardados
router.get('/api/admin/webhooks/saved', authenticateToken, requirePermission('webhookConfiguration'), adminController.getSavedWebhooks.bind(adminController));

// Guardar nuevo webhook
router.post('/api/admin/webhooks/save', authenticateToken, requirePermission('webhookConfiguration'), adminController.saveWebhook.bind(adminController));

// Eliminar webhook guardado
router.delete('/api/admin/webhooks/:id', authenticateToken, requirePermission('webhookConfiguration'), adminController.deleteSavedWebhook.bind(adminController));

// === STATUS-BASED DISABLE ROUTES - PROTECTED ===
// Configurar deshabilitación basada en estados
router.post('/api/admin/status-disable/configure', authenticateToken, requirePermission('automaticAIDisableRules'), adminController.configureStatusBasedDisable.bind(adminController));

// Obtener configuración de deshabilitación basada en estados
router.get('/api/admin/status-disable/config', authenticateToken, requirePermission('automaticAIDisableRules'), adminController.getStatusBasedDisableConfig.bind(adminController));

// Obtener estados disponibles de Jira
router.get('/api/admin/statuses/available', authenticateToken, requirePermission('automaticAIDisableRules'), adminController.getAvailableStatuses.bind(adminController));

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