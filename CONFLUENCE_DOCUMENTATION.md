# Movonte AI Assistant System - Technical Documentation

## System Overview

The Movonte AI Assistant System is a comprehensive customer service platform that integrates artificial intelligence with Jira Service Management to provide automated customer support with human agent escalation capabilities.

### Key Features
- **Intelligent Chatbot**: OpenAI GPT-powered conversations with context awareness
- **Jira Integration**: Automatic ticket creation and management
- **Real-time Communication**: WebSocket-like polling for instant message updates
- **Multi-service Support**: Different AI assistants for various business services
- **Agent Handoff**: Seamless transition from AI to human agents
- **Message Deduplication**: Advanced duplicate detection and prevention
- **Administrative Controls**: CEO-level dashboard for system management

## Architecture Overview

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (GitHub Pages)│    │   (AWS EC2)     │    │   (AWS RDS)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Chat Widget   │    │ • Node.js API   │    │ • MySQL 8.0     │
│ • CEO Dashboard │◄──►│ • Express.js    │◄──►│ • Sequelize ORM │
│ • Webhook Monitor│    │ • TypeScript    │    │ • Configuration │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │   OpenAI API    │    │   Jira API      │
│   (DNS & Security)│    │   (AI Assistant)│    │   (Service Desk)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Customer Interaction**: User interacts with chat widget
2. **Message Processing**: Widget sends message to backend API
3. **AI Processing**: Backend processes with OpenAI Assistant
4. **Jira Integration**: Response added to Jira ticket
5. **Real-time Updates**: Frontend polls for new messages
6. **Agent Handoff**: Human agents can take over conversations

## Technical Implementation

### Backend Architecture

#### Core Services
- **ChatbotController**: Handles webhook processing and AI interactions
- **WidgetIntegrationController**: Manages widget-to-Jira communication
- **ConfigurationService**: System configuration and ticket management
- **DatabaseService**: Data persistence and retrieval
- **JiraService**: Jira API integration and ticket management
- **OpenAIService**: AI assistant communication

#### Key Features Implementation

**Message Deduplication**
```typescript
// Prevents duplicate processing of webhook events
const commentId = `${issueKey}_${commentId}_${created}_${accountId}`;
if (this.processedComments.has(commentId)) {
    return; // Skip duplicate
}
```

**ADF Text Extraction**
```typescript
// Extracts plain text from Jira's Atlassian Document Format
private extractTextFromADF(body: any): string {
    if (body && body.content && Array.isArray(body.content)) {
        return this.extractTextFromADFContent(body.content);
    }
    return '';
}
```

**Agent Detection**
```typescript
// Identifies human agent comments vs AI responses
private isAgentComment(comment: any): boolean {
    const isInternalNote = comment.jsdPublic === false;
    const isFromAgentEmail = agentEmails.some(email => 
        authorEmail.includes(email.toLowerCase())
    );
    return isInternalNote || isFromAgentEmail;
}
```

### Frontend Components

#### Chat Widget (`index.html`)
- **Real-time Messaging**: Polling-based message updates
- **Responsive Design**: Mobile and desktop optimized
- **Message Types**: User, AI, and Agent message handling
- **Ticket Integration**: Automatic Jira ticket connection

#### CEO Dashboard (`ceo-dashboard.html`)
- **Service Management**: Configure AI assistants per service
- **Ticket Control**: Enable/disable AI per ticket
- **Real-time Monitoring**: Live system statistics
- **Configuration Persistence**: Database-backed settings

#### Webhook Monitor (`webhook-monitor.html`)
- **Live Statistics**: Real-time webhook event tracking
- **Error Monitoring**: Failed webhook detection
- **Performance Metrics**: Response times and success rates
- **Debug Information**: Detailed payload inspection

## API Reference

### Authentication
All API endpoints require proper CORS configuration and may require authentication tokens for administrative functions.

### Core Endpoints

#### Chatbot Endpoints
```
POST /api/chatbot/chat
Description: Direct chat interaction with AI assistant
Request Body: { message: string, threadId?: string }
Response: { success: boolean, response: string, threadId: string }

POST /api/chatbot/webhook/jira
Description: Jira webhook processing endpoint
Request Body: Jira webhook payload
Response: { success: boolean, message: string }

GET /api/chatbot/thread/:threadId
Description: Retrieve conversation history
Response: { messages: Array<Message> }
```

#### Widget Integration Endpoints
```
POST /api/widget/connect
Description: Connect widget to existing Jira ticket
Request Body: { issueKey: string, customerInfo: object }
Response: { success: boolean, issue: object, history: Array }

POST /api/widget/send-message
Description: Send message from widget to Jira
Request Body: { issueKey: string, message: string, customerInfo: object }
Response: { success: boolean, aiResponse: string }

GET /api/widget/check-messages
Description: Poll for new messages in ticket
Query Params: { issueKey: string, lastMessageId?: string }
Response: { newMessages: Array, lastMessageId: string }
```

#### Administrative Endpoints
```
GET /api/admin/services
Description: List configured services and assistants
Response: { services: Array<Service> }

POST /api/admin/services
Description: Create or update service configuration
Request Body: { serviceId: string, assistantId: string, isActive: boolean }

POST /api/admin/disable-ticket
Description: Disable AI assistant for specific ticket
Request Body: { issueKey: string, reason: string }
```

### Error Handling

#### Common Error Responses
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-17T10:30:00Z"
}
```

#### Error Codes
- `INVALID_REQUEST`: Malformed request data
- `AUTHENTICATION_FAILED`: Invalid credentials
- `RATE_LIMITED`: Too many requests
- `SERVICE_UNAVAILABLE`: External service down
- `TICKET_NOT_FOUND`: Jira ticket doesn't exist

## Configuration Management

### Environment Variables

#### Required Configuration
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=3306
DB_NAME=movonte_chat
DB_USER=your_rds_username
DB_PASS=your_rds_password

# Jira Configuration
JIRA_BASE_URL=https://movonte.atlassian.net
JIRA_PROJECT_KEY=TI
JIRA_EMAIL=your-jira-email@movonte.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_WIDGET=your-widget-email@movonte.com
JIRA_WIDGET_TOKEN=your-widget-token

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_ASSISTANT_ID=asst-your-assistant-id

# CORS Configuration
ALLOWED_ORIGINS=https://movonte.com,https://chat.movonte.com,https://movonte-consulting.github.io
```

### Service Configuration

#### Database Schema
```sql
-- Service configurations
CREATE TABLE service_configurations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    service_id VARCHAR(255) UNIQUE NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    assistant_id VARCHAR(255) NOT NULL,
    assistant_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Disabled tickets
CREATE TABLE disabled_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    issue_key VARCHAR(255) UNIQUE NOT NULL,
    reason TEXT,
    disabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    disabled_by VARCHAR(255)
);
```

## Deployment Architecture

### AWS Infrastructure

#### EC2 Instance Configuration
- **Instance Type**: t3.medium or larger
- **Operating System**: Ubuntu 20.04 LTS
- **Node.js Version**: 18.x or higher
- **Process Management**: PM2 for production
- **Reverse Proxy**: Nginx for SSL termination

#### RDS Database Configuration
- **Engine**: MySQL 8.0
- **Instance Class**: db.t3.micro (development) / db.t3.small (production)
- **Storage**: 20GB minimum with auto-scaling
- **Backup**: Automated daily backups
- **Security**: VPC security groups restricting access

#### Cloudflare Configuration
- **DNS Management**: All domain records managed through Cloudflare
- **SSL/TLS**: Full (strict) encryption mode
- **Security Features**: DDoS protection, WAF, Bot management
- **Performance**: Caching, compression, minification

### GitHub Pages Frontend
- **Repository**: Separate branch (gh-pages) for frontend deployment
- **Custom Domain**: Optional custom domain configuration
- **HTTPS**: Automatic SSL certificate from GitHub
- **CDN**: Global content delivery network

## Monitoring and Maintenance

### Health Monitoring

#### System Health Checks
```bash
# Basic health check
curl https://chat.movonte.com/health

# Detailed system status
curl https://chat.movonte.com/api/health/detailed

# Webhook statistics
curl https://chat.movonte.com/api/webhook/stats
```

#### Key Metrics to Monitor
- **API Response Times**: Average response time < 2 seconds
- **Webhook Success Rate**: > 95% successful processing
- **Database Connection**: Active connections and query performance
- **OpenAI API Usage**: Token consumption and rate limits
- **Jira API Calls**: Rate limiting and error rates

### Log Management

#### Application Logs
```bash
# View application logs
pm2 logs movonte-api

# View specific log levels
pm2 logs movonte-api --err
pm2 logs movonte-api --out
```

#### Webhook Debugging
```bash
# Monitor webhook processing
tail -f /var/log/nginx/access.log | grep webhook

# Check webhook statistics
curl https://chat.movonte.com/api/webhook/stats
```

### Performance Optimization

#### Database Optimization
- **Indexing**: Ensure proper indexes on frequently queried fields
- **Connection Pooling**: Optimize database connection limits
- **Query Optimization**: Monitor slow query log
- **Backup Strategy**: Regular automated backups

#### API Optimization
- **Rate Limiting**: Implement throttling for external APIs
- **Caching**: Cache frequently accessed data
- **Response Compression**: Enable gzip compression
- **CDN Usage**: Leverage Cloudflare for static content

## Security Considerations

### API Security
- **Input Validation**: All user inputs are sanitized and validated
- **Rate Limiting**: Prevents API abuse and DDoS attacks
- **CORS Configuration**: Restricted cross-origin requests
- **Authentication**: Secure API endpoints with proper token validation

### Data Protection
- **Environment Variables**: Secure credential storage
- **Database Security**: Encrypted connections and access control
- **Log Security**: Sensitive information is not logged
- **HTTPS Enforcement**: All communications encrypted in transit

### Cloudflare Security Features
- **DDoS Protection**: Automatic attack mitigation
- **WAF Rules**: Custom web application firewall rules
- **Bot Management**: Automated bot detection and blocking
- **SSL/TLS**: End-to-end encryption with certificate management

## Troubleshooting Guide

### Common Issues and Solutions

#### OpenAI API Issues
**Problem**: "Invalid API Key" error
**Solution**: 
1. Verify API key format (should start with `sk-`)
2. Check API key permissions in OpenAI dashboard
3. Ensure key has Assistants API access

**Problem**: "Rate limit exceeded"
**Solution**:
1. Implement exponential backoff in retry logic
2. Monitor token usage in OpenAI dashboard
3. Consider upgrading API plan if needed

#### Jira Integration Issues
**Problem**: "Authentication failed"
**Solution**:
1. Verify Jira API token is valid and not expired
2. Check user permissions in Jira
3. Ensure correct email address for authentication

**Problem**: "Webhook not triggering"
**Solution**:
1. Verify webhook URL is accessible from Jira
2. Check webhook configuration in Jira admin
3. Ensure correct events are selected (comment_created, issue_created)

#### Database Connection Issues
**Problem**: "Connection timeout"
**Solution**:
1. Verify RDS endpoint and credentials
2. Check security group configuration
3. Ensure EC2 can reach RDS instance

**Problem**: "Migration errors"
**Solution**:
1. Check database schema compatibility
2. Verify user permissions for schema changes
3. Review migration scripts for syntax errors

### Debug Tools

#### Webhook Monitor
Access the webhook monitor at: `https://movonte-consulting.github.io/webhook-monitor.html`

Features:
- Real-time webhook event tracking
- Success/failure statistics
- Detailed payload inspection
- Error message display

#### Test Scripts
```bash
# Test Jira connection
npm run test:jira

# Test OpenAI connection
npm run test:openai

# Test database connection
npm run test:database

# List available assistants
npm run list-assistants
```

## Development Workflow

### Local Development Setup
```bash
# Clone repository
git clone https://github.com/1saact123/Chat.git
cd newChat

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with development values

# Start development server
npm run dev:watch
```

### Code Structure Guidelines
- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and external API integration
- **Models**: Database schema and data access
- **Types**: TypeScript interface definitions
- **Utils**: Helper functions and validations

### Testing Strategy
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **End-to-End Tests**: Complete workflow testing
- **Performance Tests**: Load and stress testing

## Support and Maintenance

### Regular Maintenance Tasks
- **Weekly**: Review system logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and optimize database performance
- **Annually**: Security audit and penetration testing

### Emergency Procedures
- **System Downtime**: Check EC2 instance status and restart if needed
- **Database Issues**: Verify RDS status and connection strings
- **API Failures**: Check external service status (OpenAI, Jira)
- **Security Incidents**: Review logs and implement immediate fixes

### Contact Information
- **Development Team**: Internal Movonte development team
- **Infrastructure**: AWS support for EC2/RDS issues
- **External Services**: OpenAI support for API issues, Atlassian support for Jira issues

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Maintained By**: Movonte Development Team  
**Classification**: Internal Use Only
