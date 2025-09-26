# 🚀 Configuración del Webhook de Jira Automation

## 📋 Información del Webhook

**URL del Webhook:**
```
https://api-private.atlassian.com/automation/webhooks/jira/a/d1a682dd-0766-4f1a-9130-c0674238bb76/019986e9-58cb-79ed-bdd9-595a336f8595
```

**Token de Automation:**
```
0bf8fdf63b582b238ceeb2b0b0e2ce350ffbd832
```

## 🔧 Configuración

### 1. Variable de Entorno
Agrega el token de automation a tu archivo `.env`:

```bash
JIRA_AUTOMATION_TOKEN=0bf8fdf63b582b238ceeb2b0b0e2ce350ffbd832
```

### 2. Configuración en CEO Dashboard

1. **Accede al CEO Dashboard** (`/`)
2. **Ve a la sección "Webhook Configuration"**
3. **Pega la URL del webhook** en el campo "Webhook URL"
4. **Opcionalmente selecciona un asistente diferente** para el flujo de webhook
5. **Haz clic en "Test Webhook"** para probar la conexión
6. **Haz clic en "Save Webhook Configuration"** para guardar

## 🧪 Prueba Manual con cURL

```bash
curl -X POST \
  -H 'Content-type: application/json' \
  -H 'X-Automation-Webhook-Token: 0bf8fdf63b582b238ceeb2b0b0e2ce350ffbd832' \
  --data '{"issues":["TEST-1"]}' \
  https://api-private.atlassian.com/automation/webhooks/jira/a/d1a682dd-0766-4f1a-9130-c0674238bb76/019986e9-58cb-79ed-bdd9-595a336f8595
```

## 📦 Formato de Datos Enviados

El sistema enviará datos en este formato:

```json
{
  "issues": ["TI-123"],
  "webhookData": {
    "message": "Mensaje original del usuario",
    "author": "Nombre del Usuario",
    "timestamp": "2024-01-01T12:00:00Z",
    "source": "jira-comment",
    "threadId": "webhook_TI-123_1704110400000",
    "assistantId": "asst_xxx",
    "assistantName": "Webhook Assistant",
    "response": "Respuesta de la IA",
    "context": {
      "isWebhookFlow": true,
      "originalIssueKey": "TI-123"
    }
  }
}
```

## 🔄 Flujo de Funcionamiento

1. **Usuario comenta en Jira** → 
2. **Sistema responde normalmente** (comentario en Jira) →
3. **En paralelo**: 
   - Thread separado (`webhook_${issueKey}_${timestamp}`)
   - Asistente opcional diferente
   - Envío a Jira Automation webhook →
4. **Jira Automation recibe los datos** y puede procesarlos según la regla configurada

## ✅ Verificación

Para verificar que funciona:

1. **Configura el webhook** en el CEO Dashboard
2. **Prueba el webhook** con el botón "Test Webhook"
3. **Crea un comentario en un ticket de Jira**
4. **Verifica que se ejecute la automation** en Jira
5. **Revisa los logs** del sistema para confirmar el envío

## 🐛 Troubleshooting

- **Error 401**: Verifica que el token de automation sea correcto
- **Error 404**: Verifica que la URL del webhook sea correcta
- **Timeout**: Verifica la conectividad de red
- **No se ejecuta**: Verifica que la automation esté activa en Jira
