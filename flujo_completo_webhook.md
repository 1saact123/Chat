# 🔄 Flujo Completo del Sistema con Filtro de Webhook

## 📋 Resumen del Flujo Principal

### 1. 🎯 **ENTRADA: Webhook de Jira**
```
Usuario comenta en Jira → Jira envía webhook → Sistema recibe payload
```

### 2. 🔍 **VALIDACIONES INICIALES**
- ✅ Verificar proyecto activo
- ✅ Detectar duplicados
- ✅ Filtrar comentarios de IA
- ✅ Aplicar throttling

### 3. 🤖 **PROCESAMIENTO PRINCIPAL**
```
Comentario → Asistente IA → Respuesta generada
```

### 4. 🔍 **FILTRO DEL WEBHOOK (PRIMERA VERIFICACIÓN)**
```
Respuesta IA → Extraer valor (Yes/No) → Comparar con filtro → Decidir si procesar
```

### 5. 📤 **FLUJO PRINCIPAL (SI PASA EL FILTRO)**
```
Agregar comentario a Jira → Actualizar historial → Enviar respuesta
```

### 6. 🚀 **FLUJO PARALELO (WEBHOOK EXTERNO)**
```
Verificar filtro nuevamente → Generar respuesta separada → Enviar a webhook externo
```

---

## 🔄 Diagrama Detallado del Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                    🎯 ENTRADA: WEBHOOK DE JIRA                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                🔍 VALIDACIONES INICIALES                       │
│  • Proyecto activo ✓                                           │
│  • No duplicado ✓                                              │
│  • No es comentario de IA ✓                                    │
│  • Throttling OK ✓                                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              🤖 PROCESAMIENTO CON ASISTENTE IA                 │
│  • Obtener asistente configurado                               │
│  • Procesar mensaje con contexto                               │
│  • Generar respuesta                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│            🔍 FILTRO DEL WEBHOOK (VERIFICACIÓN 1)              │
│                                                                 │
│  if (response.success && response.response) {                  │
│    const shouldProcess = configService.shouldSendWebhook();    │
│                                                                 │
│    if (!shouldProcess) {                                       │
│      return "Response filtered by webhook filter";             │
│    }                                                           │
│  }                                                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              📤 FLUJO PRINCIPAL (SI PASA FILTRO)               │
│                                                                 │
│  • Agregar comentario a Jira                                   │
│  • Actualizar historial de conversación                        │
│  • Enviar respuesta al usuario                                 │
│  • Actualizar estadísticas                                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│            🚀 FLUJO PARALELO (WEBHOOK EXTERNO)                 │
│                                                                 │
│  sendToWebhookInParallel() {                                   │
│    // Verificar filtro nuevamente                              │
│    const shouldSend = configService.shouldSendWebhook();       │
│                                                                 │
│    if (!shouldSend) {                                          │
│      return; // No enviar webhook externo                      │
│    }                                                           │
│                                                                 │
│    // Generar respuesta separada (si hay asistente diferente)  │
│    // O reutilizar respuesta principal                         │
│    // Enviar a webhook externo                                 │
│  }                                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Detalles del Filtro del Webhook

### **Función `shouldSendWebhook()`**
```javascript
shouldSendWebhook(assistantResponse: any): boolean {
  // 1. Verificar si webhook está habilitado
  if (!this.webhookConfig?.isEnabled) return false;
  
  // 2. Verificar si filtro está habilitado
  if (!this.webhookConfig.filterEnabled) return true;
  
  // 3. Extraer valor de la respuesta
  const responseValue = this.extractResponseValue(assistantResponse);
  
  // 4. Comparar con valor del filtro
  const shouldSend = responseValue === this.webhookConfig.filterValue;
  
  return shouldSend;
}
```

### **Función `extractResponseValue()`**
```javascript
private extractResponseValue(assistantResponse: any): string | null {
  // 1. Normalizar respuesta (JSON, string, object)
  let responseText = /* normalizar */;
  
  // 2. Buscar patrones de "Yes"
  const yesPatterns = [/\byes\b/i, /\bsi\b/i, /sí/i, /\bagree\b/i, ...];
  for (const pattern of yesPatterns) {
    if (pattern.test(responseText)) return 'Yes';
  }
  
  // 3. Buscar patrones de "No"
  const noPatterns = [/\bno\b/i, /\bnope\b/i, /\bdisagree\b/i, ...];
  for (const pattern of noPatterns) {
    if (pattern.test(responseText)) return 'No';
  }
  
  return null; // No se encontró patrón claro
}
```

---

## 📊 Puntos de Decisión del Filtro

### **Verificación 1: Flujo Principal** (línea 421)
```javascript
// En handleJiraWebhook()
const shouldProcess = configService.shouldSendWebhook(response.response);
if (!shouldProcess) {
  // ❌ NO agregar comentario a Jira
  // ❌ NO continuar con flujo paralelo
  return "Response filtered by webhook filter";
}
```

### **Verificación 2: Flujo Paralelo** (línea 1045)
```javascript
// En sendToWebhookInParallel()
const shouldSend = configService.shouldSendWebhook(aiResponse.response);
if (!shouldSend) {
  // ❌ NO enviar webhook externo
  return;
}
```

---

## 🎯 Casos de Uso del Filtro

| Respuesta del Asistente | Valor Extraído | Filtro Configurado | Flujo Principal | Flujo Paralelo |
|-------------------------|----------------|-------------------|-----------------|----------------|
| "Yes, I can help" | "Yes" | "Yes" | ✅ Procesa | ✅ Envía webhook |
| "No, I cannot help" | "No" | "Yes" | 🚫 Filtra | 🚫 No envía |
| "I agree with that" | "Yes" | "Yes" | ✅ Procesa | ✅ Envía webhook |
| "I disagree" | "No" | "Yes" | 🚫 Filtra | 🚫 No envía |
| "Sí, puedo ayudarte" | "Yes" | "Yes" | ✅ Procesa | ✅ Envía webhook |
| "No está claro" | "No" | "Yes" | 🚫 Filtra | 🚫 No envía |

---

## 🔧 Configuración del Filtro

### **Frontend** (`public/index.html`)
```html
<!-- Habilitar filtro -->
<input type="checkbox" id="webhookFilterEnabled">

<!-- Condición del filtro -->
<select id="webhookFilterCondition">
  <option value="response_value">Response Value</option>
</select>

<!-- Valor del filtro -->
<select id="webhookFilterValue">
  <option value="Yes">Yes</option>
  <option value="No">No</option>
</select>
```

### **Backend** (`src/controllers/admin_controller.ts`)
```javascript
// Configurar filtro
async configureWebhookFilter(req: Request, res: Response) {
  const { filterEnabled, filterCondition, filterValue } = req.body;
  
  await this.configService.setWebhookFilter(
    filterEnabled,
    filterCondition || 'response_value',
    filterValue || 'Yes'
  );
}
```

---

## ✅ Resumen

**El filtro del webhook actúa como un "guardia" en DOS puntos críticos:**

1. **Flujo Principal**: Decide si agregar el comentario de la IA a Jira
2. **Flujo Paralelo**: Decide si enviar datos al webhook externo

**Solo las respuestas que cumplan con los criterios del filtro (valor = "Yes" por defecto) serán procesadas y enviadas.**
