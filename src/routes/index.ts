import { Router } from 'express';
import { ContactController } from '../controllers/contact_controller';
import { ChatbotController } from '../controllers/chatbot_controller';
import { HealthController } from '../controllers/health_controller';
import { JiraService } from '../services/jira_service';
import { EmailService } from '../services/email_service';
import { OpenAIService } from '../services/openAI_service';

// Inicializar servicios
const jiraService = new JiraService();
const emailService = new EmailService();
const openaiService = new OpenAIService();

// Inicializar controladores
const contactController = new ContactController(jiraService, emailService);
const chatbotController = new ChatbotController(openaiService, emailService);
const healthController = new HealthController();

const router = Router();

// === RUTAS DE SALUD ===
router.get('/health', healthController.healthCheck.bind(healthController));
router.get('/health/detailed', healthController.detailedHealth.bind(healthController));

// === RUTAS DE CONTACTO ===
router.post('/api/contact', contactController.submitContactForm.bind(contactController));
router.get('/api/contact/test-jira', contactController.testJiraConnection.bind(contactController));

// === RUTAS DEL CHATBOT ===
// Webhook de Jira
router.post('/api/chatbot/webhook/jira', chatbotController.handleJiraWebhook.bind(chatbotController));

// Chat directo
router.post('/api/chatbot/chat', chatbotController.handleDirectChat.bind(chatbotController));

// Historial de hilos
router.get('/api/chatbot/thread/:threadId', chatbotController.getThreadHistory.bind(chatbotController));

// Listar hilos activos
router.get('/api/chatbot/threads', chatbotController.listActiveThreads.bind(chatbotController));

// Enviar email con contexto de chat
router.post('/api/chatbot/email/send-with-context', chatbotController.sendEmailWithChatContext.bind(chatbotController));

export default router;