# 🔧 Corrección de Hilos de Conversación Repetitivos

## 📋 Problema Identificado

El chatbot estaba generando respuestas repetitivas en los hilos de conversación de Jira, como se muestra en la imagen del ticket BDM-61 donde aparecían respuestas idénticas del asistente.

## 🛠️ Mejoras Implementadas

### 1. **Detección Mejorada de Comentarios de IA**
- **Patrones de autor más específicos**: Detecta autores como "CA contact service account", "Movonte", "AI", "Bot", etc.
- **Patrones de contenido más precisos**: Identifica frases típicas de respuestas automáticas
- **Detección por similitud**: Compara respuestas actuales con anteriores para detectar repeticiones

### 2. **Sistema de Historial de Conversación**
- **Historial por issue**: Mantiene conversación separada por cada ticket de Jira
- **Contexto enriquecido**: Pasa el historial de conversación al modelo de IA
- **Limpieza automática**: Mantiene solo los últimos 20 mensajes por issue

### 3. **Prevención de Repeticiones**
- **Verificación de similitud**: Calcula similitud entre respuestas (umbral 70%)
- **Regeneración automática**: Si detecta repetición, genera una respuesta alternativa
- **Parámetros optimizados**: Aumenta temperatura y penalizaciones para más variedad

### 4. **Throttling Mejorado**
- **Tiempo entre respuestas**: Aumentado a 15 segundos por issue
- **Prevención de loops**: Evita respuestas muy rápidas que pueden causar bucles

### 5. **Prompt del Sistema Mejorado**
- **Instrucciones específicas**: Incluye directrices para evitar repeticiones
- **Contexto dinámico**: Se adapta según el tipo de conversación
- **Enfoque en variedad**: Solicita respuestas únicas y específicas

## 📁 Archivos Modificados

### `src/controllers/chatbot_controller.ts`
- ✅ Agregado sistema de historial de conversación
- ✅ Mejorada detección de comentarios de IA
- ✅ Implementado cálculo de similitud
- ✅ Agregado contexto enriquecido para el servicio de IA

### `src/services/openAI_service.ts`
- ✅ Método `processJiraComment` actualizado para aceptar contexto enriquecido
- ✅ Agregados métodos `checkForRepetitiveResponse` y `generateAlternativeResponse`
- ✅ Mejorado `processWithChatCompletions` con historial de conversación
- ✅ Optimizados parámetros de la API (temperature, presence_penalty, frequency_penalty)
- ✅ Prompt del sistema mejorado con instrucciones anti-repetición

### `src/tests/test-conversation-fix.ts`
- ✅ Script de prueba para verificar las mejoras
- ✅ Simula conversación con múltiples mensajes
- ✅ Verifica que las respuestas no sean repetitivas

## 🚀 Cómo Probar las Mejoras

### 1. Compilar el proyecto:
```bash
npm run build
```

### 2. Ejecutar la prueba de conversación:
```bash
chmod +x test-conversation-fix.sh
./test-conversation-fix.sh
```

### 3. Verificar en Jira:
- Crear un ticket de prueba
- Enviar múltiples comentarios similares
- Verificar que las respuestas sean variadas y no repetitivas

## 📊 Métricas de Mejora

### Antes:
- ❌ Respuestas idénticas en conversaciones
- ❌ Detección insuficiente de comentarios de IA
- ❌ Sin historial de conversación
- ❌ Throttling básico (10 segundos)

### Después:
- ✅ Detección robusta de repeticiones (70% similitud)
- ✅ Historial de conversación por issue
- ✅ Regeneración automática de respuestas repetitivas
- ✅ Throttling mejorado (15 segundos)
- ✅ Contexto enriquecido para la IA

## 🔍 Monitoreo

### Endpoints de monitoreo disponibles:
- `GET /webhook/stats` - Estadísticas de webhooks
- `POST /webhook/stats/reset` - Resetear estadísticas
- `GET /threads` - Listar threads activos

### Logs mejorados:
- Detección de comentarios de IA
- Cálculo de similitud
- Regeneración de respuestas
- Historial de conversación

## 🎯 Resultado Esperado

Con estas mejoras, el chatbot debería:
1. **Detectar y evitar** respuestas repetitivas
2. **Mantener contexto** de conversación por ticket
3. **Generar respuestas variadas** y específicas
4. **Prevenir bucles** de respuestas automáticas
5. **Proporcionar mejor experiencia** al usuario

## 🔧 Configuración

### Variables de entorno relevantes:
```env
OPENAI_API_KEY=tu_api_key
OPENAI_ASSISTANT_ID=tu_assistant_id
```

### Parámetros ajustables:
- Umbral de similitud: 70% (línea 227 en `chatbot_controller.ts`)
- Tiempo de throttling: 15 segundos (línea 238 en `chatbot_controller.ts`)
- Número máximo de mensajes: 20 por issue
- Temperatura de IA: 0.8 (más variedad)
- Penalizaciones: presence_penalty=0.3, frequency_penalty=0.5
