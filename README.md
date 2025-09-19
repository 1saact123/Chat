# Movonte AI Assistant System

A comprehensive AI-powered customer service platform that integrates OpenAI Assistants API with Jira Service Management, featuring real-time chat widgets, webhook monitoring, and administrative controls.

## System Overview

The Movonte AI Assistant System provides a complete solution for automated customer support with the following components:

- **AI Chatbot Integration**: OpenAI Assistants API for intelligent customer interactions
- **Jira Service Management**: Automated ticket creation and management
- **Real-time Chat Widget**: Embedded chat interface for websites
- **Webhook Monitoring**: Real-time tracking of Jira webhook events
- **Administrative Dashboard**: CEO-level control panel for system management
- **Message Deduplication**: Advanced duplicate detection and prevention
- **Multi-service Configuration**: Support for multiple AI assistants per service

## Architecture

### Backend Components

- **Node.js + TypeScript**: Modern, type-safe server implementation
- **Express.js**: RESTful API framework
- **OpenAI Assistants API**: AI conversation management
- **Jira API v3**: Service desk integration
- **Sequelize ORM**: Database management with MySQL
- **Webhook Processing**: Real-time event handling

### Frontend Components

- **Chat Widget**: Responsive, embeddable chat interface
- **CEO Dashboard**: Administrative control panel
- **Webhook Monitor**: Real-time system monitoring
- **Test Interface**: Development and testing tools

## Features

### Core Functionality

- **Intelligent Chatbot**: Context-aware conversations using OpenAI GPT models
- **Automatic Ticket Creation**: Seamless integration with Jira Service Management
- **Real-time Communication**: WebSocket-like polling for instant message updates
- **Message Deduplication**: Prevents duplicate responses and processing
- **Service Configuration**: Multiple AI assistants for different business services
- **Ticket Management**: Enable/disable AI assistance per ticket
- **Agent Integration**: Support for human agent handoff

### Advanced Features

- **ADF Text Extraction**: Proper parsing of Jira's Atlassian Document Format
- **Throttling System**: Prevents API rate limiting and spam
- **CORS Support**: Cross-origin resource sharing for web integration
- **Error Handling**: Comprehensive error management and logging
- **Database Persistence**: Configuration and state management
- **Webhook Security**: Duplicate detection and validation

## Installation

### Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- OpenAI API account
- Jira Service Management instance

### 1. Clone Repository

```bash
git clone https://github.com/1saact123/Chat.git
cd newChat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```env
# === Server Configuration ===
PORT=3000
NODE_ENV=production

# === Database Configuration ===
DB_HOST=localhost
DB_PORT=3306
DB_NAME=movonte_chat
DB_USER=your_db_user
DB_PASS=your_db_password

# === Jira Configuration ===
JIRA_BASE_URL=https://movonte.atlassian.net
JIRA_PROJECT_KEY=TI
JIRA_EMAIL=your-jira-email@movonte.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_WIDGET=your-widget-email@movonte.com
JIRA_WIDGET_TOKEN=your-widget-token

# === OpenAI Configuration ===
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_ASSISTANT_ID=asst-your-assistant-id

# === Email Configuration (Optional) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# === CORS Configuration ===
ALLOWED_ORIGINS=https://movonte.com,https://chat.movonte.com,https://movonte-consulting.github.io
```

### 4. Database Setup

```bash
# Run database migrations
npm run migrate

# Test database connection
npm run test:database
```

### 5. Build and Start

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## Configuration

### Jira Service Management Setup

#### 1. API Token Creation
1. Navigate to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create a new token with appropriate permissions
3. Configure both main account and widget account tokens

#### 2. Webhook Configuration
1. Go to Jira Administration → System → Webhooks
2. Create webhook with URL: `https://your-domain.com/api/chatbot/webhook/jira`
3. Select events: `Comment created`, `Issue created`

#### 3. Service Desk Configuration
1. Configure customer portal settings
2. Set up request types and fields
3. Configure notification schemes

### OpenAI Assistant Setup

#### 1. API Key Configuration
1. Obtain personal API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Ensure key has Assistants API permissions
3. Avoid service account keys (sk-svcacct-)

#### 2. Assistant Creation
1. Create assistant at [OpenAI Assistants](https://platform.openai.com/assistants)
2. Configure instructions for customer service context
3. Select appropriate model (GPT-4 recommended)
4. Upload knowledge base documents if needed

## Web Interface Components

### 1. Chat Widget (`/public/index.html`)

A responsive, embeddable chat interface that provides:

- **Real-time Messaging**: Instant communication with AI assistant
- **Ticket Integration**: Automatic Jira ticket creation and management
- **Message History**: Persistent conversation tracking
- **Responsive Design**: Mobile and desktop optimized
- **Custom Styling**: Branded appearance with CSS variables

**Usage**: Embed in websites using iframe or direct integration

### 2. CEO Dashboard (`/public/ceo-dashboard.html`)

Administrative control panel featuring:

- **Service Management**: Configure AI assistants per service
- **Ticket Control**: Enable/disable AI assistance per ticket
- **Assistant Selection**: Choose active AI assistant
- **Real-time Monitoring**: Live system status and statistics
- **Configuration Persistence**: Database-backed settings

**Access**: Administrative interface for system management

### 3. Webhook Monitor (`/public/webhook-monitor.html`)

Real-time monitoring dashboard providing:

- **Webhook Statistics**: Live event tracking and metrics
- **Error Monitoring**: Failed webhook detection and logging
- **Performance Metrics**: Response times and success rates
- **Debug Information**: Detailed webhook payload inspection
- **System Health**: Overall system status monitoring

**Usage**: Development and production monitoring tool

## API Endpoints

### Chatbot Endpoints

- `POST /api/chatbot/chat` - Direct chat interaction
- `POST /api/chatbot/webhook/jira` - Jira webhook processing
- `GET /api/chatbot/thread/:threadId` - Conversation history
- `GET /api/chatbot/threads` - Active conversation threads

### Widget Integration Endpoints

- `POST /api/widget/connect` - Connect widget to Jira ticket
- `POST /api/widget/send-message` - Send message from widget
- `GET /api/widget/check-messages` - Poll for new messages
- `GET /api/widget/assistant-status` - Check assistant status
- `GET /api/widget/health` - Widget service health check

### Administrative Endpoints

- `GET /api/admin/services` - List configured services
- `POST /api/admin/services` - Create/update service configuration
- `POST /api/admin/disable-ticket` - Disable AI for specific ticket
- `POST /api/admin/enable-ticket` - Enable AI for specific ticket

### Health and Monitoring

- `GET /health` - Basic health check
- `GET /api/health/detailed` - Detailed system status
- `GET /api/webhook/stats` - Webhook statistics

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run dev:watch    # Development with hot reload
npm run build        # Build TypeScript

# Testing
npm run test:jira    # Test Jira integration
npm run test:openai  # Test OpenAI connection
npm run test:database # Test database connection
npm run list-assistants # List available assistants

# Database
npm run migrate      # Run database migrations
npm run seed         # Seed database with initial data
```

### Project Structure

```
src/
├── controllers/          # API route handlers
│   ├── chatbot_controller.ts      # Chatbot and webhook logic
│   ├── widget_integration_controller.ts  # Widget integration
│   ├── admin_controller.ts        # Administrative functions
│   ├── contact_controller.ts      # Contact form handling
│   └── health_controller.ts       # Health monitoring
├── services/            # Business logic services
│   ├── openAI_service.ts         # OpenAI API integration
│   ├── jira_service.ts           # Jira API integration
│   ├── database_service.ts       # Database operations
│   ├── configuration_service.ts  # System configuration
│   └── email_service.ts          # Email notifications
├── models/              # Database models
│   └── index.ts         # Sequelize model definitions
├── routes/              # Express route definitions
│   └── index.ts         # Route configuration
├── types/               # TypeScript type definitions
│   └── index.ts         # Interface definitions
├── utils/               # Utility functions
│   └── validations.ts   # Input validation
└── app.ts               # Application entry point

public/                  # Static web interfaces
├── index.html           # Chat widget interface
├── ceo-dashboard.html   # Administrative dashboard
├── webhook-monitor.html # Webhook monitoring
└── ceo-dashboard.css    # Dashboard styling
```

## Deployment

### Production Infrastructure

The Movonte AI Assistant System is deployed using the following infrastructure:

- **Backend**: AWS EC2 instance running Node.js application
- **Database**: AWS RDS MySQL instance for data persistence
- **Frontend**: GitHub Pages for static web interfaces
- **DNS & Security**: Cloudflare for DNS management and security features
- **Domain**: Custom domain with SSL certificate and Cloudflare proxy

### AWS EC2 Backend Deployment

1. **EC2 Instance Setup**
```bash
   # Connect to EC2 instance
   ssh -i your-key.pem ec2-user@your-ec2-instance
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Clone repository
   git clone <repository-url>
   cd newChat
   npm install --production
   ```

2. **Environment Configuration**
```bash
   # Configure production environment
   cp .env.example .env
   # Edit .env with production values including RDS connection
   ```

3. **Database Connection (RDS)**
   ```env
   # RDS Configuration in .env
   DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
   DB_PORT=3306
   DB_NAME=movonte_chat
   DB_USER=your_rds_username
   DB_PASS=your_rds_password
   ```

4. **Application Startup**
```bash
   # Build and start application
npm run build
   npm start
   
   # Or use PM2 for process management
   npm install -g pm2
   pm2 start dist/app.js --name "movonte-api"
   pm2 startup
   pm2 save
   ```

### AWS RDS Database Setup

1. **RDS Instance Configuration**
   - Engine: MySQL 8.0
   - Instance class: db.t3.micro (or appropriate size)
   - Storage: 20GB minimum
   - Security groups: Allow MySQL access from EC2

2. **Database Initialization**
   ```bash
   # Connect to RDS from EC2
   mysql -h your-rds-endpoint -u username -p
   
   # Create database and user
   CREATE DATABASE movonte_chat;
   CREATE USER 'movonte_user'@'%' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON movonte_chat.* TO 'movonte_user'@'%';
   FLUSH PRIVILEGES;
   ```

3. **Run Migrations**
   ```bash
   # From EC2 instance
   npm run migrate
   ```

### GitHub Pages Frontend Deployment

1. **Repository Setup**
```bash
   # Create gh-pages branch
   git checkout -b gh-pages
   
   # Copy public files to root
   cp -r public/* .
   
   # Commit and push
   git add .
   git commit -m "Deploy frontend to GitHub Pages"
   git push origin gh-pages
   ```

2. **GitHub Pages Configuration**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: gh-pages
   - Custom domain: your-domain.com (optional)

3. **Frontend Files Structure**
   ```
   /
   ├── index.html              # Chat widget
   ├── ceo-dashboard.html      # Administrative dashboard
   ├── webhook-monitor.html    # Webhook monitoring
   └── ceo-dashboard.css       # Dashboard styling
   ```

### Nginx Configuration (EC2)

```nginx
server {
    listen 80;
    server_name chat.movonte.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Configuration

With Cloudflare handling SSL termination, the EC2 instance can use HTTP internally:

```bash
# Optional: Install Certbot for local SSL (if not using Cloudflare SSL)
sudo apt install certbot python3-certbot-nginx

# If using Cloudflare SSL termination, configure Nginx for HTTP
# Cloudflare will handle SSL/TLS encryption
```

### Cloudflare Configuration

1. **Add Domain to Cloudflare**
   - Log in to Cloudflare dashboard
   - Add domain: `movonte.com`
   - Update nameservers at domain registrar

2. **SSL/TLS Configuration**
   - SSL/TLS encryption mode: **Full (strict)**
   - Edge certificates: **Always Use HTTPS**
   - Origin certificates: Optional for additional security

3. **Security Settings**
   - **Security Level**: Medium or High
   - **Bot Fight Mode**: Enabled
   - **DDoS Protection**: Automatic
   - **WAF**: Configure custom rules for API protection

4. **Performance Optimization**
   - **Caching**: Configure appropriate cache rules
   - **Compression**: Enable Brotli compression
   - **Minification**: Enable for HTML, CSS, JS

### Domain Configuration with Cloudflare

The system uses Cloudflare for DNS management and additional security features:

1. **Cloudflare DNS Setup**
   - Add domain to Cloudflare account
   - Configure DNS records to point to services
   - Enable Cloudflare proxy for additional security

2. **DNS Records Configuration**
   ```
   Type    Name    Content                    Proxy Status
   A       chat    your-ec2-ip-address        Proxied
   CNAME   www     chat.movonte.com           Proxied
   CNAME   api     chat.movonte.com           Proxied
   ```

3. **Cloudflare Security Features**
   - **SSL/TLS**: Full (strict) encryption mode
   - **DDoS Protection**: Automatic attack mitigation
   - **WAF**: Web Application Firewall rules
   - **Rate Limiting**: API protection
   - **Bot Management**: Automated bot detection

4. **Service Endpoints**
   - **Backend API**: `https://chat.movonte.com` (EC2 with Nginx, proxied through Cloudflare)
   - **Frontend Interfaces**: `https://movonte-consulting.github.io` (GitHub Pages)
   - **Custom Domain**: DNS managed through Cloudflare with SSL termination

## Monitoring and Maintenance

### Health Checks

- **API Health**: `GET /health` - Basic system status
- **Database Health**: `GET /api/health/detailed` - Database connectivity
- **External Services**: Monitor OpenAI and Jira API status

### Log Monitoring

- **Application Logs**: Monitor server logs for errors
- **Webhook Logs**: Track webhook processing success/failure
- **Database Logs**: Monitor query performance and errors

### Performance Optimization

- **Database Indexing**: Optimize frequently queried fields
- **API Rate Limiting**: Implement throttling for external APIs
- **Caching**: Cache frequently accessed data
- **Connection Pooling**: Optimize database connections

## Troubleshooting

### Common Issues

#### OpenAI API Errors
- **Invalid API Key**: Verify key format and permissions
- **Rate Limiting**: Implement exponential backoff
- **Assistant Not Found**: Verify assistant ID and permissions

#### Jira Integration Issues
- **Authentication Failed**: Check API token and permissions
- **Webhook Not Triggering**: Verify webhook URL and events
- **Field Validation Errors**: Check custom field configurations

#### Database Connection Issues
- **Connection Timeout**: Verify database credentials and network
- **Migration Errors**: Check database schema compatibility
- **Performance Issues**: Monitor query execution times

### Debug Tools

- **Webhook Monitor**: Real-time webhook event tracking
- **Test Scripts**: Individual service testing utilities
- **Log Analysis**: Comprehensive error logging and analysis

## Security Considerations

### API Security
- **Input Validation**: Sanitize all user inputs
- **Rate Limiting**: Prevent API abuse
- **CORS Configuration**: Restrict cross-origin requests
- **Authentication**: Secure API endpoints

### Data Protection
- **Environment Variables**: Secure credential storage
- **Database Security**: Encrypted connections and access control
- **Log Security**: Avoid logging sensitive information

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software owned by Movonte. All rights reserved.

## Authors

- **Movonte** - *Proprietary software development and ownership*

## Support

For technical support and questions:
- Contact the Movonte development team
- Review the troubleshooting section
- Internal documentation and support channels

---

**Note**: This is proprietary software owned by Movonte. The system is designed for production use with proper security measures and monitoring. Ensure all environment variables are properly configured and security best practices are followed.