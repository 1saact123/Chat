# Movonte AI Assistant System - User Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [CEO Dashboard](#ceo-dashboard)
4. [Chat Widget Integration](#chat-widget-integration)
5. [Webhook Monitoring](#webhook-monitoring)
6. [Service Configuration](#service-configuration)
7. [Ticket Management](#ticket-management)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

---

## System Overview

The Movonte AI Assistant System is a comprehensive customer service platform that combines OpenAI's advanced AI capabilities with Jira Service Management. The system provides intelligent, automated customer support through real-time chat widgets while maintaining seamless integration with your existing service desk infrastructure.

### Key Features
- **Intelligent AI Chatbot**: Powered by OpenAI GPT models for natural customer interactions
- **Jira Integration**: Automatic ticket creation and management
- **Real-time Communication**: Instant message delivery and response
- **Administrative Control**: CEO-level dashboard for system management
- **Multi-service Support**: Configure different AI assistants for different business services
- **Message Deduplication**: Advanced duplicate detection and prevention
- **Agent Handoff**: Seamless transition from AI to human agents

### System Architecture
- **Backend**: Node.js + TypeScript with Express.js
- **Database**: MySQL with Sequelize ORM
- **AI Engine**: OpenAI Assistants API
- **Integration**: Jira Service Management API v3
- **Frontend**: Responsive web interfaces

---

## Getting Started

### Prerequisites
- Active OpenAI API account with Assistants API access
- Jira Service Management instance
- MySQL database
- Node.js 18+ environment

### Initial Setup
1. **Environment Configuration**
   - Configure OpenAI API key
   - Set up Jira credentials
   - Configure database connection
   - Set allowed origins for CORS

2. **Service Deployment**
   - Deploy backend to AWS EC2
   - Configure RDS MySQL database
   - Set up GitHub Pages for frontend
   - Configure Cloudflare DNS and security

3. **Initial Configuration**
   - Create OpenAI assistants
   - Configure Jira webhooks
   - Set up service configurations
   - Test system integration

---

## CEO Dashboard

The CEO Dashboard is the central administrative interface for managing the AI Assistant System. Access it at: `https://chat.movonte.com/ceo-dashboard`

### Dashboard Overview
<img width="1920" height="1020" alt="imagen" src="https://github.com/user-attachments/assets/3807f011-7a6c-4103-be10-fb04a60fd3c2" />


The dashboard provides comprehensive control over:
- AI Assistant management
- Service configuration
- Ticket control
- System monitoring
- Project management

### AI Assistants Section
<img width="673" height="581" alt="imagen" src="https://github.com/user-attachments/assets/e6afd070-defa-45bf-8eb3-dabd971da4f8" />


**Features:**
- View all available AI assistants
- Monitor assistant status (Active/Inactive)
- Global assistant configuration
- Assistant performance metrics

**Global Active Assistant:**
The system displays the currently active global assistant, which is determined by the Landing Page Service configuration.

### Service Configuration
<img width="665" height="494" alt="imagen" src="https://github.com/user-attachments/assets/31a228fe-4f5a-4caf-a2b4-7d82aaf751d0" />


**Landing Page Service:**
- **Current Assistant**: Shows the AI assistant assigned to the landing page
- **Service ID**: `landing-page` (system identifier)
- **Jira Project**: Associated Jira project for ticket creation
- **Last Updated**: Timestamp of last configuration change

**Changing Assistant:**
1. Select new assistant from dropdown
2. Click "APPLY" to save changes
3. Use "DEACTIVATE" to disable the service

### Project Management
<img width="673" height="314" alt="imagen" src="https://github.com/user-attachments/assets/1457faaf-3088-4c7c-88b6-26614d2fd23f" />


**Active Jira Project:**
- Select the active Jira project for ticket creation
- Projects are automatically loaded from your Jira instance
- Changes apply to new ticket creation

### Ticket Control
<img width="585" height="787" alt="imagen" src="https://github.com/user-attachments/assets/89f09572-67d3-4ad4-87c0-613be70b1df4" />


**Disable AI Assistant for Specific Tickets:**
1. Enter Jira ticket key (e.g., TI-123)
2. Add optional reason for disabling
3. Click "Disable Assistant" to deactivate AI for that ticket
4. Use "Enable Assistant" to reactivate
5. "Check Status" to verify current state

**Currently Disabled Tickets:**
- View all tickets with disabled AI assistance
- See disable reason and timestamp
- Bulk enable/disable options

## Service Configuration

### Creating New Services

#### 1. Service Setup
1. Navigate to CEO Dashboard
2. Access Service Configuration section
3. Click "Add New Service"
4. Configure service parameters

#### 2. Assistant Assignment
1. Select AI assistant from available options
2. Configure service-specific settings
3. Set Jira project association
4. Activate service

#### 3. Service Management
- **Activate/Deactivate**: Toggle service status
- **Assistant Changes**: Update AI assistant
- **Configuration Updates**: Modify service settings
- **Performance Monitoring**: Track service metrics

### Service Types

#### Landing Page Service
- **Purpose**: Primary customer interaction point
- **Configuration**: Global assistant assignment
- **Integration**: Website embedding
- **Features**: Automatic ticket creation

#### Jira Integration Service
- **Purpose**: Existing ticket management
- **Configuration**: Ticket-specific settings
- **Integration**: Jira webhook processing
- **Features**: Real-time synchronization

---

## Ticket Management

### Automatic Ticket Creation
**Process:**
1. Customer initiates chat
2. System creates Jira ticket
3. Conversation is linked to ticket
4. AI responses are added as comments
5. Ticket status is updated automatically

### Ticket Lifecycle
1. **Creation**: Automatic when chat starts
2. **Processing**: AI handles initial responses
3. **Escalation**: Human agent takeover when needed
4. **Resolution**: Ticket closure and follow-up

### Agent Integration
**Features:**
- Seamless AI-to-agent transition
- Message history preservation
- Context transfer
- Status synchronization

---

## Troubleshooting

### Common Issues

#### 1. Chat Widget Not Loading
**Symptoms:**
- Widget appears blank
- Connection errors
- CORS issues

**Solutions:**
- Check CORS configuration
- Verify domain whitelist
- Test network connectivity
- Review browser console errors

#### 2. AI Assistant Not Responding
**Symptoms:**
- No AI responses
- Error messages
- Timeout issues

**Solutions:**
- Verify OpenAI API key
- Check assistant configuration
- Review rate limits
- Test API connectivity

#### 3. Jira Integration Issues
**Symptoms:**
- Tickets not created
- Webhook failures
- Authentication errors

**Solutions:**
- Verify Jira credentials
- Check webhook configuration
- Test API connectivity
- Review permissions

### Debug Tools

#### 1. Health Check
**Endpoint**: `https://chat.movonte.com/health`
[SCREENSHOT: Health check response]

**Information:**
- System status
- Service availability
- Configuration status
- Performance metrics

#### 2. Detailed Health
**Endpoint**: `https://chat.movonte.com/health/detailed`

**Components:**
- OpenAI configuration
- Jira integration status
- Database connectivity
- Email service status

### Log Analysis
- **Application Logs**: Server-side error tracking
- **Webhook Logs**: Jira integration monitoring
- **Performance Logs**: System optimization data
- **Error Logs**: Issue identification and resolution

---

## API Reference

### Authentication
All API endpoints require proper authentication and CORS configuration.

### Core Endpoints

#### Chatbot Endpoints
- `POST /api/chatbot/chat` - Direct chat interaction
- `POST /api/chatbot/webhook/jira` - Jira webhook processing
- `GET /api/chatbot/thread/:threadId` - Conversation history
- `GET /api/chatbot/assistants` - List available assistants

#### Widget Integration
- `POST /api/widget/connect` - Connect to existing ticket
- `POST /api/widget/send-message` - Send message to Jira
- `GET /api/widget/conversation/:issueKey` - Get conversation history
- `GET /api/widget/check-messages` - Poll for new messages

#### Administrative
- `GET /api/admin/dashboard` - Dashboard data
- `PUT /api/admin/services/:serviceId` - Update service configuration
- `POST /api/admin/tickets/:issueKey/disable` - Disable AI for ticket
- `GET /api/admin/tickets/disabled` - List disabled tickets

### Response Formats
All API responses follow a consistent format:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-01-XX...",
  "error": null
}
```

### Error Handling
- **400 Bad Request**: Invalid parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: System error

---

## Support and Maintenance

### System Monitoring
- **Uptime Monitoring**: 24/7 system availability tracking
- **Performance Metrics**: Response time and throughput monitoring
- **Error Tracking**: Automated error detection and alerting
- **Capacity Planning**: Resource usage and scaling recommendations

### Backup and Recovery
- **Database Backups**: Automated daily backups
- **Configuration Backups**: Service configuration preservation
- **Disaster Recovery**: Rapid system restoration procedures
- **Data Retention**: Conversation and ticket data management

### Updates and Maintenance
- **Regular Updates**: System improvements and security patches
- **Feature Releases**: New functionality and enhancements
- **Performance Optimization**: System speed and efficiency improvements
- **Security Updates**: Latest security measures and protections

---

## Contact Information

For technical support, system issues, or feature requests:

- **System Administrator**: [Contact Information]
- **Technical Support**: [Support Email]
- **Documentation**: [Documentation URL]
- **Status Page**: [Status Page URL]

---

*This document is maintained by the Movonte Development Team. Last updated: [Current Date]*
