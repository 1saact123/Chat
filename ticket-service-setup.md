# Ticket Service - Configuración Separada

## 🎯 Objetivo
Separar la funcionalidad de creación de tickets del servidor principal de chatbot para mejor escalabilidad y mantenimiento.

## 📁 Estructura del nuevo proyecto

```
ticket-service/
├── package.json
├── .env
├── src/
│   ├── app.ts
│   ├── controllers/
│   │   ├── ticket_controller.ts
│   │   └── health_controller.ts
│   ├── services/
│   │   └── jira_service.ts
│   ├── routes/
│   │   └── index.ts
│   └── types/
│       └── index.ts
└── public/
    └── landing-form.html
```

## 🔧 Configuración

### 1. package.json
```json
{
  "name": "ticket-service",
  "version": "1.0.0",
  "main": "dist/app.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/app.js",
    "dev": "ts-node src/app.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.8.0",
    "@types/cors": "^2.8.17",
    "@types/morgan": "^1.9.9",
    "typescript": "^5.2.2",
    "ts-node": "^10.9.1"
  }
}
```

### 2. .env
```env
# === Jira Configuration ===
JIRA_BASE_URL=https://movonte.atlassian.net
JIRA_PROJECT_KEY=DEV
JIRA_EMAIL=isaact@movonte.com
JIRA_API_TOKEN=ATATT3xFfGF0yqHHIK8TA_TA39s4MV5FGmf3EwHVDIIuIS4iedLZAoJi3prFyT1zqPVg6sRjVM6qmS_7qCMQwmHnnn7D75jaDIPHNhJ2VaZzs4o_lp0ceO57lNIET7_1xJV7Ul69RDGGE7Qf1CpUi4PzJ-fN4lbEqCv-cp-LQUM8lYy0WOZgsks=0E39EBDA

# === Server Configuration ===
PORT=3001
NODE_ENV=production

# === CORS Configuration ===
ALLOWED_ORIGINS=https://chat-grvb.onrender.com,https://movonte.com,http://localhost:3000
```

## 🌐 Endpoints del nuevo servicio

### POST /api/tickets/create
Crear ticket desde formulario de contacto

### POST /api/tickets/landing
Crear ticket desde landing page

### GET /api/tickets/health
Health check del servicio

### GET /api/tickets/test-jira
Probar conexión con Jira

## 🔗 Integración con el servidor principal

### 1. Modificar el servidor principal
Remover endpoints de tickets y agregar proxy:

```typescript
// En el servidor principal (chatbot)
app.use('/api/tickets', async (req, res) => {
  // Proxy requests al ticket service
  const ticketServiceUrl = process.env.TICKET_SERVICE_URL || 'https://ticket-service.onrender.com';
  // Forward request...
});
```

### 2. Variables de entorno
```env
# En el servidor principal
TICKET_SERVICE_URL=https://ticket-service.onrender.com
```

## 🚀 Deployment

### Render.com
1. Crear nuevo Web Service
2. Conectar repositorio
3. Build Command: `npm run build`
4. Start Command: `npm start`
5. Environment Variables: Copiar desde .env

### Variables de entorno en Render
- JIRA_BASE_URL
- JIRA_PROJECT_KEY
- JIRA_EMAIL
- JIRA_API_TOKEN
- PORT
- NODE_ENV

## 📊 Beneficios

✅ **Separación de responsabilidades**
✅ **Escalabilidad independiente**
✅ **Mantenimiento más fácil**
✅ **Webhooks siempre activos**
✅ **Mejor rendimiento**

## 🔄 Migración

1. Crear nuevo repositorio para ticket-service
2. Copiar código relevante
3. Configurar deployment
4. Actualizar URLs en frontend
5. Probar integración
6. Remover código de tickets del servidor principal
