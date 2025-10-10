import { Router } from 'express';
import { ChatKitWidgetController } from '../controllers/chatkit_widget_controller';
import { ChatKitWebhookController } from '../controllers/chatkit_webhook_controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const chatkitWidgetController = new ChatKitWidgetController();
const chatkitWebhookController = new ChatKitWebhookController();

// === RUTAS DE WIDGET CON CHATKIT ===

/**
 * Conectar widget a ticket de Jira
 * POST /api/chatkit/widget/connect
 */
router.post('/api/chatkit/widget/connect', authenticateToken, 
  chatkitWidgetController.connectToTicket.bind(chatkitWidgetController)
);

/**
 * Enviar mensaje del widget usando ChatKit
 * POST /api/chatkit/widget/send
 */
router.post('/api/chatkit/widget/send', authenticateToken,
  chatkitWidgetController.sendMessage.bind(chatkitWidgetController)
);

/**
 * Obtener estado de sesión
 * GET /api/chatkit/session/:issueKey
 */
router.get('/api/chatkit/session/:issueKey', authenticateToken,
  chatkitWidgetController.getSessionStatus.bind(chatkitWidgetController)
);

// === RUTAS DE WEBHOOK CON CHATKIT ===

/**
 * Webhook de Jira usando ChatKit
 * POST /api/chatkit/webhook/jira
 */
router.post('/api/chatkit/webhook/jira',
  chatkitWebhookController.handleJiraWebhook.bind(chatkitWebhookController)
);

/**
 * Procesar chat directo usando ChatKit
 * POST /api/chatkit/chat/direct
 */
router.post('/api/chatkit/chat/direct', authenticateToken,
  chatkitWebhookController.processDirectChat.bind(chatkitWebhookController)
);

export default router;
