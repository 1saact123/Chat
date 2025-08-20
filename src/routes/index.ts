import { Router } from 'express';
import { ContactController } from '../controllers/contact_controller';
import { ChatbotController } from '../controllers/chatbot_controller';
import { HealthController } from '../controllers/health_controller';
import { JiraService } from '../services/jira_service';
// import { EmailService } from '../services/email_service';
import { OpenAIService } from '../services/openAI_service';

// Initialize services
const jiraService = new JiraService();
// const emailService = new EmailService();
const openaiService = new OpenAIService();

// Initialize controllers
const contactController = new ContactController(jiraService, null); // emailService commented out
const chatbotController = new ChatbotController(openaiService, null); // emailService commented out
const healthController = new HealthController();

const router = Router();

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

// === CONTACT ROUTES ===
router.post('/api/contact', contactController.submitContactForm.bind(contactController));
router.get('/api/contact/test-jira', contactController.testJiraConnection.bind(contactController));

// === CHATBOT ROUTES ===
// Jira webhook
router.post('/api/chatbot/webhook/jira', chatbotController.handleJiraWebhook.bind(chatbotController));

// Direct chat
router.post('/api/chatbot/chat', chatbotController.handleDirectChat.bind(chatbotController));

// Chat with custom instructions
router.post('/api/chatbot/chat-with-instructions', chatbotController.handleChatWithInstructions.bind(chatbotController));

// Jira chat integration
router.post('/api/chatbot/jira-chat', chatbotController.handleJiraChat.bind(chatbotController));

// Thread history
router.get('/api/chatbot/thread/:threadId', chatbotController.getThreadHistory.bind(chatbotController));

// List active threads
router.get('/api/chatbot/threads', chatbotController.listActiveThreads.bind(chatbotController));

// Send email with chat context - COMMENTED OUT FOR TESTING
// router.post('/api/chatbot/email/send-with-context', chatbotController.sendEmailWithChatContext.bind(chatbotController));

export default router;