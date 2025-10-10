# 🚀 Guía de Migración a ChatKit como Sistema Principal

## 📋 Pasos para migrar a ChatKit

### 1. 🔗 Cambiar Webhook de Jira

**URL actual:**
```
https://chat.movonte.com/api/chatbot/webhook/jira
```

**Nueva URL:**
```
https://chat.movonte.com/api/chatkit/webhook/jira
```

### 2. 📝 Instrucciones para cambiar el webhook en Jira:

1. **Ve a tu instancia de Jira**: `https://movonte.atlassian.net`
2. **Navega a**: Settings → System → Webhooks
3. **Encuentra el webhook existente** que apunta a `/api/chatbot/webhook/jira`
4. **Edita el webhook** y cambia la URL a `/api/chatkit/webhook/jira`
5. **Guarda los cambios**

### 3. 🧪 Probar la migración

Una vez cambiado el webhook, puedes probar:

1. **Crear un comentario** en cualquier ticket del proyecto TI
2. **Verificar en los logs** que aparezcan mensajes de ChatKit
3. **Usar la página de prueba** en `/dashboard/chatkit-test`

### 4. 🔍 Logs esperados después de la migración

Deberías ver logs como:
```
📥 Webhook de Jira recibido: comment_created
🔄 Creando sesión de ChatKit para ticket TI-XXX
✅ Sesión ChatKit creada para TI-XXX: cksess_xxxxx
```

### 5. ⚠️ Diferencias entre sistemas

**Sistema actual (Asistentes tradicionales):**
- Usa `asst_xxxxx` (Assistant IDs)
- Procesamiento directo en backend
- Respuestas inmediatas

**Sistema ChatKit:**
- Usa `wf_xxxxx` (Workflow IDs)
- Procesamiento en frontend con SDK
- Sesiones persistentes

### 6. 🔄 Rollback (si es necesario)

Si necesitas volver al sistema anterior:
1. Cambia el webhook de vuelta a `/api/chatbot/webhook/jira`
2. El sistema volverá a usar asistentes tradicionales

## ✅ Verificación de migración exitosa

La migración será exitosa cuando veas:
- ✅ Logs de ChatKit en lugar de asistentes tradicionales
- ✅ Creación de sesiones de ChatKit
- ✅ Respuestas generadas por ChatKit workflows
- ✅ Integración con Jira funcionando

## 🆘 Solución de problemas

Si encuentras problemas:
1. Verifica que el webhook apunte a la URL correcta
2. Revisa los logs del backend
3. Usa la página de prueba para diagnosticar
4. Verifica que `OPENAI_CHATKIT_WORKFLOW_ID` esté configurado
