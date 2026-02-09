# WhatsApp Integration – Setup and Coexistence

## What was implemented

- **Webhook**
  - `GET /api/whatsapp/webhook` – verification (Meta sends `hub.mode`, `hub.verify_token`, `hub.challenge`).
  - `POST /api/whatsapp/webhook` – receives incoming messages; maps phone → Jira ticket and adds the message as a comment.
- **Phone → ticket mapping**
  - Table `whatsapp_ticket_mapping`: one row per phone (normalized), with `issue_key`, `service_id`, `user_id`.
  - New conversation: creates a Jira ticket via the same logic as the widget, then saves the mapping.
  - Later messages: reuse the same ticket and append comments.
- **Intent router** (new conversations)
  - For new conversations, the backend loads **available services from `unified_configurations`** (active for `WHATSAPP_DEFAULT_USER_ID`) and routes by matching message text to each service’s **`configuration.whatsappKeywords`**. If no match, `WHATSAPP_DEFAULT_SERVICE_ID` is used.
- **Env**
  - `WHATSAPP_VERIFY_TOKEN` – same value as in Meta App → WhatsApp → Webhook “Verify token”.
  - `WHATSAPP_DEFAULT_USER_ID` – user id used to create tickets and to get Jira (and optional OpenAI) credentials.
  - `WHATSAPP_DEFAULT_SERVICE_ID` – default service for new conversations when no intent match (must have `projectKey` and config in `unified_configurations`).
  - Routing keywords are read from **`unified_configurations.configuration.whatsappKeywords`** (no env for keywords).

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

# Required for creating tickets and adding comments (user must have Jira + service config)
WHATSAPP_DEFAULT_USER_ID=25
WHATSAPP_DEFAULT_SERVICE_ID=Test 3

# Routing: configure whatsappKeywords in unified_configurations.configuration per service.

# Optional: for sending replies to WhatsApp (future)
# WHATSAPP_ACCESS_TOKEN=EAAx...
# WHATSAPP_PHONE_NUMBER_ID=123456789
```

### 3. Database

Create the mapping table (once):

```bash
npx ts-node src/scripts/create_whatsapp_ticket_mapping_table.ts
```

### 4. Jira / service config

- The user `WHATSAPP_DEFAULT_USER_ID` must:
  - Exist and have Jira credentials (profile or assistant Jira account for the service).
- The service `WHATSAPP_DEFAULT_SERVICE_ID` must:
  - Exist in `unified_configurations` for that user (or globally),
  - Have `projectKey` in `configuration`,
  - Be active.

## Flow summary

1. User sends a message on WhatsApp (same number used by the app and the API if Coexistence is set).
2. Meta sends `POST /api/whatsapp/webhook` with the message.
3. Backend normalizes the phone, looks up `whatsapp_ticket_mapping`.
4. If no row: creates a Jira ticket (same as widget) for `WHATSAPP_DEFAULT_USER_ID` + `WHATSAPP_DEFAULT_SERVICE_ID`, then saves phone → `issue_key` in `whatsapp_ticket_mapping`.
5. Backend adds the message as a Jira comment on that ticket (`[WhatsApp] SenderName: text`).
6. Jira can then fire `comment_created` → your existing `/api/chatbot/webhook/jira` → AI reply in Jira (and optionally later you can send that reply back to WhatsApp with the Cloud API).

## Links (Meta)

- Phone numbers: https://developers.facebook.com/docs/whatsapp/cloud-api/phone-numbers  
- Coexistence (onboarding Business App): https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users  
- Webhooks: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks  
- Send message (for replies): https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages  
