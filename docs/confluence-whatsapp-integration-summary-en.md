# WhatsApp + Jira Integration – Summary for Confluence

---

## 0. Context: what already exists in the system

The chatbot backend already has everything needed for **another channel** (WhatsApp) to behave like the widget: create Jira tickets, receive messages, and (via the Jira webhook) trigger the AI. What was added is the **WhatsApp entry point** and the phone → ticket mapping.

| Existing piece | Role in WhatsApp integration |
|----------------|------------------------------|
| **User services** | `unified_configurations`: each user has services with `projectKey`, assistant, etc. WhatsApp uses a default service (`WHATSAPP_DEFAULT_SERVICE_ID`) to create tickets. |
| **Jira credentials** | `users` (profile) and `service_jira_accounts` (per service). The backend uses the same credentials as the widget to create issues and comments. |
| **Ticket creation** | `ServiceTicketController.createTicketForService` (via API) and `createTicketForWhatsApp` (internal). Same logic: form → Jira with normalized labels, ADF, etc. |
| **Jira webhook** | `POST /api/chatbot/webhook/jira`: when a comment is added on a ticket (from widget or WhatsApp), Jira notifies → we process with the service’s AI → response in Jira. **Unchanged** for WhatsApp. |
| **Protected token (widget)** | Widgets use a JWT with `serviceId` and `userId`. WhatsApp does not use this token (Meta calls the webhook without it); authorization is via webhook + `WHATSAPP_DEFAULT_*`. |
| **CORS** | Approved CORS affect the dashboard and the widget. The WhatsApp webhook is called by Meta from their servers, not the browser; it does not depend on CORS. |

**Summary:** WhatsApp is another channel that writes to the same Jira tickets and goes through the same AI flow. The only new pieces are the `whatsapp_ticket_mapping` table (phone → ticket/service/user) and the Meta webhook controller.

---

## 1. What is Coexistence and how it fits

**Coexistence** = using the **same WhatsApp number** at the same time for:

| Channel | Use |
|--------|------|
| **WhatsApp Business App** | Manual team chats |
| **WhatsApp Business API** | This backend: automation, Jira tickets, AI |

The user messages the same number; messages reach the backend and are recorded in Jira. Optionally the team can still reply from the app.

**How it fits with what we have:**  
Our webhook (`POST /api/whatsapp/webhook`) receives the messages Meta sends when someone messages the number. It does not matter whether that number is also on the app: Meta delivers the message to the API and we map it to a ticket and save it in Jira. Coexistence is just the configuration on Meta (linking app + API to the same number); our code does not care whether the number uses the app or not.

---

## 1.1 WhatsApp Flows (optional)

**WhatsApp Flows** are interactive screens inside the chat (forms, lists, steps) that Meta shows when the business sends a message with a “flow”. The user fills in or selects options and the result is sent to your endpoint (or the API).

| Aspect | Detail |
|--------|--------|
| **What they’re for** | Lead capture, preselection of options (e.g. property type, price range), short surveys, without leaving WhatsApp. |
| **Fit with this system** | Optional. They can be used so the first contact is structured (e.g. “What type of property are you looking for?”); when the flow is submitted, your backend can create the Jira ticket with that data and continue the conversation via normal chat (which is already recorded on the ticket). |
| **Status** | Not implemented in the current backend. If used, you would need to: define the Flow in Meta (Flow JSON), expose an endpoint that receives the flow result, and from there create the ticket or update data and continue with the same message flow → `whatsapp_ticket_mapping` + Jira comments. |

**Example use case (e.g. real estate):**  
Initial “Interest registration” flow with fields: property type, city, price range. On submit, the backend creates the Jira ticket with that information and links the phone to the ticket; the user’s subsequent messages go to the same ticket as they do today. Flows are optional and can be adopted depending on the product (e.g. real estate); the core integration (messages → Jira) does not depend on them.

---

## 2. What is already implemented

### 2.1 Backend

| Component | Description |
|------------|-------------|
| **Verification webhook** | `GET /api/whatsapp/webhook` — Meta uses it to validate the URL (params: `hub.mode`, `hub.verify_token`, `hub.challenge`). |
| **Messages webhook** | `POST /api/whatsapp/webhook` — Receives each incoming message, maps phone → Jira ticket, and adds the message as a comment. |
| **Phone → ticket mapping** | Logic for “first time” (create ticket) and “existing conversation” (reuse same ticket). |
| **Ticket creation** | Reuses the same logic as the widget: `ServiceTicketController.createTicketForWhatsApp` + Jira with user/service credentials. |
| **Jira comments** | Each WhatsApp message is written to the ticket as a comment with format `[WhatsApp] Name: text`. |

### 2.2 Database (extension)

| Item | Detail |
|----------|---------|
| **Table** | `whatsapp_ticket_mapping` |
| **Purpose** | Store per phone: which Jira ticket (`issue_key`), service (`service_id`), and user (`user_id`) it belongs to. |
| **Creation script** | `newChat/src/scripts/create_whatsapp_ticket_mapping_table.ts` |

**Table structure:**

| Column | Type | Description |
|---------|------|-------------|
| `id` | INT, PK, AUTO_INCREMENT | Internal identifier |
| `phone_number` | VARCHAR(32), UNIQUE | Normalized phone (e.g. +5215512345678) |
| `issue_key` | VARCHAR(50) | Jira ticket key (e.g. TEST-12) |
| `service_id` | VARCHAR(100) | Service ID in `unified_configurations` |
| `user_id` | INT | User who owns the service / Jira credentials |
| `created_at` / `updated_at` | DATETIME | Audit fields |

**Indexes:** `phone_number`, `issue_key`, `(user_id, service_id)`.

### 2.3 Relevant code files

| Path | Role |
|------|---------|
| `src/controllers/whatsapp_controller.ts` | GET verification and POST webhook handling. |
| `src/services/whatsapp_ticket_service.ts` | Phone normalization, `getMapping`, `setMapping`. |
| `src/controllers/service_ticket_controller.ts` | Internal method `createTicketForWhatsApp` to create ticket without HTTP. |
| `src/routes/index.ts` | Routes `GET/POST /api/whatsapp/webhook` (no authentication). |

---

## 3. What is needed to use Coexistence

### 3.1 Database

- [ ] **Run the table creation script** (once per environment):

```text
npx ts-node src/scripts/create_whatsapp_ticket_mapping_table.ts
```

- No other DB extensions or additional credentials in existing tables are required; `users`, `unified_configurations`, and `service_jira_accounts` are used as-is.

### 3.2 Environment variables (backend)

| Variable | Required | Description |
|----------|-------------|-------------|
| `WHATSAPP_VERIFY_TOKEN` | Yes | String you set in Meta (App → WhatsApp → Webhook → “Verify token”). Must match exactly. |
| `WHATSAPP_DEFAULT_USER_ID` | Yes | User ID in our DB that “owns” WhatsApp conversations (creates tickets and uses their Jira credentials). |
| `WHATSAPP_DEFAULT_SERVICE_ID` | Yes | Service ID in `unified_configurations` used to create new tickets (must have `projectKey` and be active). |
| `WHATSAPP_ACCESS_TOKEN` | No (future) | WhatsApp API token to **send** replies to the user. Only needed if “reply via WhatsApp” is implemented. |
| `WHATSAPP_PHONE_NUMBER_ID` | No (future) | Phone number ID in the API. Only needed for sending messages. |

### 3.3 Credentials and configuration in our application

- [ ] **Default user (`WHATSAPP_DEFAULT_USER_ID`):**
  - Must exist in the `users` table.
  - Must have **Jira credentials** (in profile or in `service_jira_accounts` for the service in `WHATSAPP_DEFAULT_SERVICE_ID`).

- [ ] **Default service (`WHATSAPP_DEFAULT_SERVICE_ID`):**
  - Must exist in `unified_configurations` (for that user or global).
  - Must have **`projectKey`** in `configuration` for the Jira project.
  - Must be **active** (`is_active`).

- [ ] **Webhook in Meta:**
  - **Callback URL:** `https://<your-domain>/api/whatsapp/webhook`
  - **Verify token:** same value as `WHATSAPP_VERIFY_TOKEN`.

### 3.4 Meta / Facebook side (Coexistence)

| Step | Description |
|------|-------------|
| 1. Meta Business Account | The number must be under a Meta Business Account, not just a personal account. |
| 2. WhatsApp Business API (Cloud) | Number registered and verified in the API (WhatsApp Manager / App Dashboard). |
| 3. Coexistence onboarding | Complete the official flow that links the **WhatsApp Business App** with the **API** so the same number works for both. Docs: [Onboarding Business App users (Coexistence)](https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users). |
| 4. Webhook in the App | In Meta app → WhatsApp → Webhook configuration: callback URL and verify token as above. |

---

## 4. Flow summary

1. User sends a message via WhatsApp to the business number (with Coexistence, this can be the same number used by the app).
2. Meta calls `POST /api/whatsapp/webhook` with the message.
3. Backend normalizes the phone and queries `whatsapp_ticket_mapping`.
4. **If no row:** creates a Jira ticket (same logic as the widget), saves to `whatsapp_ticket_mapping` (phone → `issue_key`, `service_id`, `user_id`).
5. **If row exists:** uses that `issue_key`.
6. Backend adds the message as a comment on the ticket: `[WhatsApp] Name: text`.
7. Jira can trigger the `comment_created` webhook → our `/api/chatbot/webhook/jira` → AI response in Jira. (Optional later: send that response back via WhatsApp using the send API.)

---

## 5. Useful links (Meta)

| Resource | URL |
|---------|-----|
| Phone numbers (Cloud API) | https://developers.facebook.com/docs/whatsapp/cloud-api/phone-numbers |
| Coexistence (app onboarding) | https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users |
| Webhook setup | https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks |
| Send messages (for replies) | https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages |
| WhatsApp Flows (optional, e.g. real estate) | https://developers.facebook.com/docs/whatsapp/flows/ |

---

*Reference document for Confluence – WhatsApp + Jira integration and Coexistence.*
