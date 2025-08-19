# Movonte API - Chatbot and Contact Form with Jira

Unified API to integrate a chatbot with OpenAI and contact forms with Jira, developed in TypeScript.

## Features

- **Chatbot with OpenAI Assistants API**
- **Automated contact form**
- **Jira integration for tickets**
- **Email fallback system**
- **Webhooks for Jira updates**

## Technologies

- **Backend:** Node.js + TypeScript
- **Framework:** Express.js
- **AI:** OpenAI Assistants API
- **Project Management:** Jira API
- **Email:** Nodemailer
- **Authentication:** Basic Auth (Jira)

## Installation

### 1. Clone the repository
```bash
git clone <your-repository>
cd newChat
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the project root:

```env
# === Jira Configuration ===
JIRA_BASE_URL=https://movonte.atlassian.net
JIRA_PROJECT_KEY=DEV
JIRA_EMAIL=your-email@movonte.com
JIRA_API_TOKEN=your-api-token

# === OpenAI Configuration ===
OPENAI_API_KEY=sk-...  # IMPORTANT: Use personal API key, NOT service account
OPENAI_ASSISTANT_ID=asst_...

# === Jira Custom Fields (Optional) ===
# Only add if they exist in your Jira project
JIRA_FIELD_EMAIL=customfield_10000
JIRA_FIELD_PHONE=customfield_10001
JIRA_FIELD_COMPANY=customfield_10002

# === Email Configuration (Optional) ===
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Configuration

### Jira Setup

#### 1. Get API Token
1. Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create a new token
3. Copy the token (only shown once)

#### 2. Get Project Key
- Go to your Jira → Projects
- The Project Key appears in the URL: `https://movonte.atlassian.net/browse/DEV-123` → Key is `DEV`

#### 3. Custom Fields (Optional)
If you want to use custom fields in Jira:
1. Go to **Administration** → **Issues** → **Custom fields**
2. Identify the field IDs (e.g., `customfield_10000`)
3. Add the IDs to your `.env`

### OpenAI Setup

#### 1. Get API Key
1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new personal API key (NOT service account)
3. The key must start with `sk-` (not `sk-svcacct-`)

#### 2. Create Assistant
1. Go to [https://platform.openai.com/assistants](https://platform.openai.com/assistants)
2. Click **"Create"**
3. Configure:
   - **Name:** "Movonte Chatbot"
   - **Instructions:** "You are a Movonte assistant that helps with customer inquiries..."
   - **Model:** GPT-4 or GPT-3.5-turbo
4. Save and copy the Assistant ID from the URL

## Testing

### Test Jira
```bash
npm run test:jira
```

### Test OpenAI
```bash
npm run test-openai
```

### List Assistants
```bash
npm run list-assistants
```

## Development

### Build
```bash
npm run build
```

### Development with hot reload
```bash
npm run dev:watch
```

### Run in production
```bash
npm run build
npm start
```

## Known Issues and Solutions

### Error: "ESM syntax is not allowed in a CommonJS module"
**Cause:** Conflict between ESM and CommonJS modules
**Solution:** 
- Verify that `tsconfig.json` has `"module": "commonjs"`
- Don't use `"type": "module"` in `package.json`

### Jira Error 400: "Field cannot be set"
**Cause:** Custom fields don't exist in the Jira project
**Solution:**
- Remove `JIRA_FIELD_*` variables from `.env`
- Or add the fields to the issue creation screen in Jira

### OpenAI Error: "No assistants found"
**Cause:** Service account API key (`sk-svcacct-`) with restrictions
**Solution:**
- Use personal API key (`sk-...`) instead of service account
- Verify that the API key has permissions for Assistants API

### Jira Error: "The operation value must be an Atlassian document"
**Cause:** Incorrect format in issue description
**Solution:**
- Use simple Markdown format instead of HTML
- Avoid special characters in the description

### Error: "Model ID not found"
**Cause:** Incorrect Assistant ID or API key without permissions
**Solution:**
- Verify that the Assistant ID is correct
- Use personal API key with full permissions

## Project Structure

```
src/
├── controllers/     # API controllers
├── routes/         # Express routes
├── services/       # Services (Jira, OpenAI, Email)
├── types/          # TypeScript definitions
├── tests/          # Test scripts
└── app.ts          # Entry point
```

## Endpoints

### POST /api/chat
Start or continue a conversation with the chatbot

### POST /api/contact
Send contact form and create ticket in Jira

### GET /api/health
Check API status

## Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is under the MIT License - see the [LICENSE](LICENSE) file for details.

## Authors

- **Movonte** - *Initial development*

## Acknowledgments

- OpenAI for the Assistants API
- Atlassian for the Jira API
- The TypeScript and Node.js community

---

**Note:** This project is under active development. Report issues for improvements and new features.
