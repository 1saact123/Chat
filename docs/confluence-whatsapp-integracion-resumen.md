# Integración WhatsApp + Jira – Resumen para Confluence

---

## 1. Qué es Coexistence

**Coexistence** = usar el **mismo número de WhatsApp** a la vez para:

| Canal | Uso |
|--------|------|
| **WhatsApp Business App** | Chats manuales del equipo |
| **WhatsApp Business API** | Este backend: automatización, tickets en Jira, IA |

El usuario escribe al mismo número; los mensajes llegan al backend y se registran en Jira. Opcionalmente el equipo puede seguir respondiendo desde la app.

---

## 2. Lo que ya está implementado

### 2.1 Backend

| Componente | Descripción |
|------------|-------------|
| **Webhook de verificación** | `GET /api/whatsapp/webhook` — Meta lo usa para validar la URL (parámetros `hub.mode`, `hub.verify_token`, `hub.challenge`). |
| **Webhook de mensajes** | `POST /api/whatsapp/webhook` — Recibe cada mensaje entrante, asocia teléfono → ticket Jira y añade el mensaje como comentario. |
| **Mapeo teléfono → ticket** | Lógica para “primera vez” (crear ticket) y “conversación existente” (reutilizar el mismo ticket). |
| **Creación de tickets** | Reutiliza la misma lógica que el widget: `ServiceTicketController.createTicketForWhatsApp` + Jira con credenciales del usuario/servicio. |
| **Comentarios en Jira** | Cada mensaje de WhatsApp se escribe en el ticket como comentario con formato `[WhatsApp] Nombre: texto`. |

### 2.2 Base de datos (extensión)

| Elemento | Detalle |
|----------|---------|
| **Tabla** | `whatsapp_ticket_mapping` |
| **Propósito** | Guardar por cada teléfono: a qué ticket Jira (`issue_key`), servicio (`service_id`) y usuario (`user_id`) pertenece. |
| **Script de creación** | `newChat/src/scripts/create_whatsapp_ticket_mapping_table.ts` |

**Estructura de la tabla:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT, PK, AUTO_INCREMENT | Identificador interno |
| `phone_number` | VARCHAR(32), UNIQUE | Teléfono normalizado (ej. +5215512345678) |
| `issue_key` | VARCHAR(50) | Clave del ticket Jira (ej. TEST-12) |
| `service_id` | VARCHAR(100) | ID del servicio en `unified_configurations` |
| `user_id` | INT | Usuario dueño del servicio / credenciales Jira |
| `created_at` / `updated_at` | DATETIME | Auditoría |

**Índices:** `phone_number`, `issue_key`, `(user_id, service_id)`.

### 2.3 Archivos relevantes en código

| Ruta | Función |
|------|---------|
| `src/controllers/whatsapp_controller.ts` | Verificación GET y procesamiento POST del webhook. |
| `src/services/whatsapp_ticket_service.ts` | Normalización de teléfono, `getMapping`, `setMapping`. |
| `src/controllers/service_ticket_controller.ts` | Método interno `createTicketForWhatsApp` para crear ticket sin HTTP. |
| `src/routes/index.ts` | Rutas `GET/POST /api/whatsapp/webhook` (sin autenticación). |

---

## 3. Lo que hace falta para usar Coexistence

### 3.1 Base de datos

- [ ] **Ejecutar el script de creación de la tabla** (una vez por entorno):

```text
npx ts-node src/scripts/create_whatsapp_ticket_mapping_table.ts
```

- No se requieren otras extensiones de BD ni credenciales adicionales en tablas existentes; se usan `users`, `unified_configurations` y `service_jira_accounts` como ya están.

### 3.2 Variables de entorno (backend)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `WHATSAPP_VERIFY_TOKEN` | Sí | Cadena que configuras en Meta (App → WhatsApp → Webhook → “Verify token”). Debe coincidir exactamente. |
| `WHATSAPP_DEFAULT_USER_ID` | Sí | ID del usuario en nuestra BD que “posee” las conversaciones WhatsApp (crea tickets y usa sus credenciales Jira). |
| `WHATSAPP_DEFAULT_SERVICE_ID` | Sí | ID del servicio en `unified_configurations` con el que se crean los tickets nuevos (debe tener `projectKey` y estar activo). |
| `WHATSAPP_ACCESS_TOKEN` | No (futuro) | Token de la API de WhatsApp para **enviar** respuestas al usuario. Solo necesario si se implementa “respuesta por WhatsApp”. |
| `WHATSAPP_PHONE_NUMBER_ID` | No (futuro) | ID del número en la API. Solo necesario para envío de mensajes. |

### 3.3 Credenciales y configuración en nuestra aplicación

- [ ] **Usuario por defecto (`WHATSAPP_DEFAULT_USER_ID`):**
  - Debe existir en la tabla `users`.
  - Debe tener **credenciales Jira** (en perfil o en `service_jira_accounts` para el servicio indicado en `WHATSAPP_DEFAULT_SERVICE_ID`).

- [ ] **Servicio por defecto (`WHATSAPP_DEFAULT_SERVICE_ID`):**
  - Debe existir en `unified_configurations` (para ese usuario o global).
  - Debe tener en `configuration` el campo **`projectKey`** del proyecto Jira.
  - Debe estar **activo** (`is_active`).

- [ ] **Webhook en Meta:**
  - **Callback URL:** `https://<tu-dominio>/api/whatsapp/webhook`
  - **Verify token:** mismo valor que `WHATSAPP_VERIFY_TOKEN`.

### 3.4 Lado Meta / Facebook (Coexistence)

| Paso | Descripción |
|------|-------------|
| 1. Meta Business Account | El número debe estar bajo una cuenta de negocio de Meta, no solo personal. |
| 2. WhatsApp Business API (Cloud) | Número registrado y verificado en la API (WhatsApp Manager / App Dashboard). |
| 3. Onboarding Coexistence | Completar el flujo oficial que vincula la **app de WhatsApp Business** con la **API** para que el mismo número sirva para ambos. Documentación: [Onboarding Business App users (Coexistence)](https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users). |
| 4. Webhook en la App | En la app de Meta → WhatsApp → Configuración del webhook: URL de callback y verify token como arriba. |

---

## 4. Flujo resumido

1. Usuario envía mensaje por WhatsApp al número del negocio (con Coexistence, puede ser el mismo que usa la app).
2. Meta llama a `POST /api/whatsapp/webhook` con el mensaje.
3. Backend normaliza el teléfono y consulta `whatsapp_ticket_mapping`.
4. **Si no hay fila:** crea un ticket en Jira (misma lógica que el widget), guarda en `whatsapp_ticket_mapping` (teléfono → `issue_key`, `service_id`, `user_id`).
5. **Si ya hay fila:** usa ese `issue_key`.
6. Backend añade el mensaje como comentario en el ticket: `[WhatsApp] Nombre: texto`.
7. Jira puede disparar el webhook `comment_created` → nuestro `/api/chatbot/webhook/jira` → respuesta de IA en Jira. (Opcional más adelante: enviar esa respuesta también por WhatsApp usando la API de envío.)

---

## 5. Enlaces útiles (Meta)

| Recurso | URL |
|---------|-----|
| Números de teléfono (Cloud API) | https://developers.facebook.com/docs/whatsapp/cloud-api/phone-numbers |
| Coexistence (onboarding app) | https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users |
| Configuración de webhooks | https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks |
| Envío de mensajes (para respuestas) | https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages |

---

*Documento de referencia para Confluence – Integración WhatsApp + Jira y Coexistence.*
