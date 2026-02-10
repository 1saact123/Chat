# WhatsApp Integration – Setup and Coexistence

## What was implemented

- **Webhook**
  - `GET /api/whatsapp/webhook` – verification (Meta sends `hub.mode`, `hub.verify_token`, `hub.challenge`).
  - `POST /api/whatsapp/webhook` – receives incoming messages; maps phone → Jira ticket and adds the message as a comment.
- **Phone → ticket mapping**
  - Table `whatsapp_ticket_mapping`: one row per phone (normalized), with `issue_key`, `service_id`, `user_id`.
  - New conversation: creates a Jira ticket via the same logic as the widget, then saves the mapping.
  - Later messages: reuse the same ticket and append comments.
- **Asistente Movonte** (predefined assistant, not a DB service)
  - First contact: no Jira ticket. The backend sends a message as “Asistente Movonte” with a **list of services** (from `unified_configurations` for `WHATSAPP_DEFAULT_USER_ID`). User replies with the **number** or **name** of a service.
  - When user selects a service: a Jira ticket is created for that service, the phone is mapped to it, and from then on all messages go to that ticket. Optionally a reply is sent: “Te hemos conectado con [Servicio]. ¿En qué podemos ayudarte?”
- **Env**
  - `WHATSAPP_VERIFY_TOKEN` – same value as in Meta App → WhatsApp → Webhook “Verify token”.
  - `WHATSAPP_DEFAULT_USER_ID` – user id used to load services and create tickets (must have services in `unified_configurations`).
  - `WHATSAPP_ACCESS_TOKEN` – **required** for sending replies (assistant list and “connected” message). Permanent or long-lived token.
  - `WHATSAPP_PHONE_NUMBER_ID` – optional; if not set, the webhook uses `metadata.phone_number_id` from each request.

## What you need to use Coexistence

**Coexistence** = the same phone number is used at the same time for:
- **WhatsApp Business App** (manual chats),
- **WhatsApp Business API** (this backend: automation, Jira, AI).

### 1. Meta / Facebook side

- **Meta Business Account**  
  The number must be under a Meta Business Account (not only a personal account).
- **WhatsApp Business API (Cloud)**  
  The number must be registered and verified for the Cloud API (phone number added in WhatsApp Manager / App Dashboard).
- **Coexistence onboarding**  
  Use the official flow that links the Business App to the API so both can use the same number:
  - Doc: [Onboarding WhatsApp Business app users (Coexistence)](https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users)
  - In short: you link the Business App to the same Meta Business Account and complete the flow (e.g. QR or in-product steps). After that, the same number can receive messages both in the app and via the API.
- **Webhook URL**  
  In Meta App → WhatsApp → Configuration:
  - Callback URL: `https://<tu-dominio>/api/whatsapp/webhook`
  - Verify token: same string as `WHATSAPP_VERIFY_TOKEN` in your `.env`.
- **Token**  
  You need a permanent or long-lived **WhatsApp access token** for the app that owns the phone number. That token is used only when you want to **send** messages back to the user (reply from backend). Receiving is handled by the webhook above.

### 2. Backend (.env)

```env
# Required for webhook verification
WHATSAPP_VERIFY_TOKEN=your_verify_token_you_set_in_meta

# Required: user whose services are shown by Asistente Movonte and used for tickets
WHATSAPP_DEFAULT_USER_ID=25

# Required for Asistente Movonte to send the service list and "connected" message
WHATSAPP_ACCESS_TOKEN=EAAx...
# Optional: if not set, phone_number_id from webhook payload is used
# WHATSAPP_PHONE_NUMBER_ID=123456789
```

### 3. Database

Create the mapping table (once):

```bash
npx ts-node src/scripts/create_whatsapp_ticket_mapping_table.ts
```

### 4. Jira / service config

- The user `WHATSAPP_DEFAULT_USER_ID` must exist and have at least one active service in `unified_configurations` (with `projectKey` in `configuration`). Each service can have its own Jira/assistant config.

## Flow summary

1. User sends a message on WhatsApp (same number used by the app and the API if Coexistence is set).
2. Meta sends `POST /api/whatsapp/webhook` with the message.
3. Backend looks up `whatsapp_ticket_mapping` for the phone.
4. **If no row (first contact):** Asistente Movonte sends a list of services (from `unified_configurations`). No Jira ticket yet. User replies with a number or service name.
5. **When user selects a service:** Backend creates a Jira ticket for that service, saves phone → ticket in `whatsapp_ticket_mapping`, sends “Te hemos conectado con [Servicio]…” and adds the selection as the first comment.
6. **If row exists:** Backend adds the message as a Jira comment on that ticket. Jira can fire `comment_created` → `/api/chatbot/webhook/jira` → AI reply (and optionally send reply back to WhatsApp).

## Links (Meta)

- Phone numbers: https://developers.facebook.com/docs/whatsapp/cloud-api/phone-numbers  
- Coexistence (onboarding Business App): https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users  
- Webhooks: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks  
- Send message (for replies): https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages  
