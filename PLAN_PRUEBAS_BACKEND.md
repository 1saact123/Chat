
# Backend Test Plan


## 1. General Information


**System:** Movonte API (Backend)  
**Technology:** Node.js, Express, TypeScript, Sequelize, MySQL  
**Creation Date:** 2024  
**Version:** 1.0.0

---


## 2. Test Objectives

- Verify the functionality of all API endpoints
- Validate the security and authentication of the system
- Ensure data integrity in the database
- Check integration with external services (Jira, OpenAI)
- Validate error handling and edge cases
- Verify performance and scalability

---


## 3. Types of Tests

### 3.1 Unit Tests
### 3.2 Integration Tests
### 3.3 API (End-to-End) Tests
### 3.4 Security Tests
### 3.5 Performance Tests
### 3.6 Load Tests

---


## 4. Tests by Module


### 4.1 Authentication and Authorization


#### 4.1.1 Authentication Endpoints
- [ ] **POST /api/auth/login**
  - [ ] Successful login with valid credentials
  - [ ] Failed login with invalid credentials
  - [ ] Login with non-existent user
  - [ ] Login with incorrect password
  - [ ] Validate that a JWT token is generated
  - [ ] Validate that the token has the correct fields
  - [ ] Validate token expiration

- [ ] **POST /api/auth/logout**
  - [ ] Successful logout with valid token
  - [ ] Logout without token (should fail)
  - [ ] Verify token invalidation

- [ ] **GET /api/auth/verify**
  - [ ] Successful verification with valid token
  - [ ] Failed verification with invalid token
  - [ ] Failed verification with expired token
  - [ ] Verification without token

- [ ] **GET /api/auth/profile**
  - [ ] Get profile with valid token
  - [ ] Get profile without token
  - [ ] Validate response structure

- [ ] **PUT /api/auth/profile**
  - [ ] Successfully update profile
  - [ ] Update profile with invalid data
  - [ ] Update profile without permissions

- [ ] **PUT /api/auth/change-password**
  - [ ] Successful password change
  - [ ] Change with incorrect current password
  - [ ] Change with invalid new password
  - [ ] Validate hash of new password

#### 4.1.2 Authentication Middleware
- [ ] **authenticateToken**
  - [ ] Allows access with valid token
  - [ ] Denies access without token
  - [ ] Denies access with invalid token
  - [ ] Denies access with expired token

- [ ] **requireAdmin**
  - [ ] Allows access to admin users
  - [ ] Denies access to non-admin users
  - [ ] Denies access without authentication

- [ ] **requirePermission**
  - [ ] Allows access with correct permission
  - [ ] Denies access without permission
  - [ ] Validates multiple permissions

---

### 4.2 User Management

#### 4.2.1 User Endpoints (Admin)
- [ ] **GET /api/admin/users**
  - [ ] List users (admin only)
  - [ ] Deny access to non-admin
  - [ ] Validate pagination if exists
  - [ ] Validate filters if exist

- [ ] **POST /api/admin/users**
  - [ ] Successfully create user
  - [ ] Create user with invalid data
  - [ ] Create duplicate user (email)
  - [ ] Validate password hash
  - [ ] Validate required fields

- [ ] **PUT /api/admin/users/:id**
  - [ ] Successfully update user
  - [ ] Update non-existent user
  - [ ] Update with invalid data
  - [ ] Validate permissions

- [ ] **PUT /api/admin/users/:id/password**
  - [ ] Change user password
  - [ ] Validate new password hash
  - [ ] Change password for non-existent user

- [ ] **DELETE /api/admin/users/:id**
  - [ ] Successfully delete user
  - [ ] Delete non-existent user
  - [ ] Validate cannot delete self

#### 4.2.2 User Endpoints
- [ ] **POST /api/user/login**
  - [ ] Successful user login
  - [ ] Login with invalid credentials
  - [ ] Validate token generation

- [ ] **GET /api/user/profile**
  - [ ] Get authenticated user profile
  - [ ] Validate profile data

- [ ] **GET /api/user/instances**
  - [ ] List user instances
  - [ ] Validate response structure

- [ ] **POST /api/user/instances**
  - [ ] Successfully create instance
  - [ ] Create instance with invalid data
  - [ ] Validate instance limits

- [ ] **PUT /api/user/instances/:id**
  - [ ] Successfully update instance
  - [ ] Update instance of another user (should fail)
  - [ ] Update non-existent instance

- [ ] **DELETE /api/user/instances/:id**
  - [ ] Successfully delete instance
  - [ ] Delete instance of another user (should fail)

- [ ] **POST /api/user/register**
  - [ ] Register user (admin only)
  - [ ] Register with invalid data
  - [ ] Register duplicate user

- [ ] **GET /api/user/setup/status**
  - [ ] Get initial setup status
  - [ ] Validate response for new user
  - [ ] Validate response for configured user

- [ ] **POST /api/user/setup/complete**
  - [ ] Complete initial setup
  - [ ] Validate provided tokens
  - [ ] Validate cannot complete twice

- [ ] **POST /api/user/setup/validate-tokens**
  - [ ] Validate Jira and OpenAI tokens
  - [ ] Validate invalid Jira token
  - [ ] Validate invalid OpenAI token

---

### 4.3 Service Management

#### 4.3.1 User Service Endpoints
- [ ] **GET /api/user/dashboard**
  - [ ] Get user dashboard
  - [ ] Validate data structure
  - [ ] Validate associated services

- [ ] **POST /api/user/services/create**
  - [ ] Successfully create service
  - [ ] Create service with invalid data
  - [ ] Validate service limits

- [ ] **GET /api/user/services/list**
  - [ ] List user services
  - [ ] Validate pagination
  - [ ] Validate filters

- [ ] **PUT /api/user/services/:serviceId**
  - [ ] Successfully update service
  - [ ] Update service of another user (should fail)
  - [ ] Update non-existent service

- [ ] **DELETE /api/user/services/:serviceId**
  - [ ] Successfully delete service
  - [ ] Delete service of another user (should fail)

- [ ] **GET /api/user/statuses/available**
  - [ ] Get available statuses
  - [ ] Validate Jira connection

- [ ] **POST /api/user/services/:serviceId/chat**
  - [ ] Successful chat with service
  - [ ] Chat with non-existent service
  - [ ] Validate OpenAI response

- [ ] **GET /api/user/assistants**
  - [ ] List user assistants
  - [ ] Validate response structure

- [ ] **GET /api/user/projects**
  - [ ] List user's Jira projects
  - [ ] Validate Jira connection

- [ ] **GET /api/user/services/:serviceId/assistant**
  - [ ] Get active assistant (public)
  - [ ] Validate non-existent service

#### 4.3.2 Service Endpoints (Admin)
- [ ] **GET /api/admin/services/:serviceId**
  - [ ] Get service configuration
  - [ ] Validate permissions

- [ ] **PUT /api/admin/services/:serviceId**
  - [ ] Update service configuration
  - [ ] Validate configuration data

- [ ] **PATCH /api/admin/services/:serviceId/toggle**
  - [ ] Enable/disable service
  - [ ] Validate state change

- [ ] **POST /api/admin/services**
  - [ ] Create new service
  - [ ] Validate required data

- [ ] **DELETE /api/admin/services/:serviceId**
  - [ ] Delete service
  - [ ] Validate dependencies

---

### 4.4 Ticket Management

#### 4.4.1 User Ticket Endpoints
- [ ] **GET /api/user/tickets/disabled**
  - [ ] List user's disabled tickets
  - [ ] Validate response structure

- [ ] **POST /api/user/tickets/:issueKey/disable**
  - [ ] Disable assistant in ticket
  - [ ] Validate non-existent ticket
  - [ ] Validate ticket permissions

- [ ] **POST /api/user/tickets/:issueKey/enable**
  - [ ] Enable assistant in ticket
  - [ ] Validate non-existent ticket

- [ ] **GET /api/user/tickets/:issueKey/status**
  - [ ] Check assistant status
  - [ ] Validate non-existent ticket

#### 4.4.2 Ticket Endpoints (Admin)
- [ ] **POST /api/admin/tickets/:issueKey/disable**
  - [ ] Disable assistant (admin)
  - [ ] Validate permissions

- [ ] **POST /api/admin/tickets/:issueKey/enable**
  - [ ] Enable assistant (admin)
  - [ ] Validate permissions

- [ ] **GET /api/admin/tickets/disabled**
  - [ ] List all disabled tickets
  - [ ] Validate permissions

- [ ] **GET /api/admin/tickets/:issueKey/status**
  - [ ] Check status (admin)
  - [ ] Validate permissions

#### 4.4.3 Ticket Creation Endpoints
- [ ] **POST /api/service/create-ticket**
  - [ ] Successfully create ticket
  - [ ] Create ticket with invalid data
  - [ ] Validate Jira integration

- [ ] **GET /api/service/:serviceId/info**
  - [ ] Get service information
  - [ ] Validate non-existent service

---

### 4.5 Webhooks

#### 4.5.1 Jira Webhooks
- [ ] **POST /api/chatbot/webhook/jira**
  - [ ] Successfully receive Jira webhook
  - [ ] Process new comment
  - [ ] Ignore duplicate comments
  - [ ] Ignore bot comments
  - [ ] Validate throttling per issue
  - [ ] Validate conversation history
  - [ ] Validate OpenAI response
  - [ ] Validate comment creation in Jira
  - [ ] Handle Jira errors
  - [ ] Handle OpenAI errors

- [ ] **GET /api/webhook/jira**
  - [ ] Verify endpoint is accessible
  - [ ] Validate server information

- [ ] **GET /api/chatbot/webhook/stats**
  - [ ] Get webhook statistics
  - [ ] Validate data structure
  - [ ] Validate counters

- [ ] **POST /api/chatbot/webhook/reset**
  - [ ] Reset statistics
  - [ ] Validate permissions

#### 4.5.2 User Webhooks
- [ ] **GET /api/user/webhook/status**
  - [ ] Get webhook status
  - [ ] Validate configuration

- [ ] **POST /api/user/webhook/configure**
  - [ ] Successfully configure webhook
  - [ ] Configure with invalid data
  - [ ] Validate webhook URL

- [ ] **POST /api/user/webhook/test**
  - [ ] Successfully test webhook
  - [ ] Validate webhook response

- [ ] **POST /api/user/webhook/disable**
  - [ ] Disable webhook
  - [ ] Validate state change

- [ ] **POST /api/user/webhook/filter**
  - [ ] Configure webhook filter
  - [ ] Validate filtering rules

- [ ] **GET /api/user/webhooks/saved**
  - [ ] List saved webhooks
  - [ ] Validate structure

- [ ] **POST /api/user/webhooks/save**
  - [ ] Save webhook
  - [ ] Validate data

- [ ] **PUT /api/user/webhooks/:id**
  - [ ] Update webhook
  - [ ] Validate permissions

- [ ] **DELETE /api/user/webhooks/:id**
  - [ ] Delete webhook
  - [ ] Validate permissions

#### 4.5.3 Admin Webhooks
- [ ] **GET /api/admin/webhooks/all**
  - [ ] List all webhooks (admin)
  - [ ] Validate permissions

- [ ] **POST /api/admin/webhooks/create**
  - [ ] Create webhook (admin)
  - [ ] Validate permissions

- [ ] **PUT /api/admin/webhooks/:id**
  - [ ] Update webhook (admin)
  - [ ] Validate permissions

- [ ] **DELETE /api/admin/webhooks/:id**
  - [ ] Delete webhook (admin)
  - [ ] Validate permissions

---

### 4.6 Chatbot and OpenAI

#### 4.6.1 Chat Endpoints
- [ ] **POST /api/chatbot/chat**
  - [ ] Successful direct chat
  - [ ] Chat with empty message
  - [ ] Chat with very long message
  - [ ] Validate OpenAI response
  - [ ] Validate OpenAI error handling

- [ ] **POST /api/services/:serviceId/chat**
  - [ ] Chat with specific service
  - [ ] Validate non-existent service
  - [ ] Validate service configuration

- [ ] **POST /api/chatbot/chat-with-instructions**
  - [ ] Chat with custom instructions
  - [ ] Validate instructions

- [ ] **POST /api/chatbot/jira-chat**
  - [ ] Jira-integrated chat
  - [ ] Validate Jira ticket
  - [ ] Validate ticket context

#### 4.6.2 Assistant Management
- [ ] **GET /api/chatbot/assistants**
  - [ ] List available assistants
  - [ ] Validate OpenAI connection
  - [ ] Validate response structure

- [ ] **POST /api/chatbot/assistants/set-active**
  - [ ] Set active assistant
  - [ ] Validate non-existent assistant
  - [ ] Validate permissions

- [ ] **GET /api/chatbot/assistants/active**
  - [ ] Get active assistant
  - [ ] Validate response

- [ ] **GET /api/services/:serviceId/assistant**
  - [ ] Get service assistant (public)
  - [ ] Validate non-existent service

#### 4.6.3 History and Threads
- [ ] **GET /api/chatbot/thread/:threadId**
  - [ ] Get thread history
  - [ ] Validate non-existent thread
  - [ ] Validate permissions

- [ ] **GET /api/chatbot/threads**
  - [ ] List active threads
  - [ ] Validate pagination

- [ ] **GET /api/chatbot/conversation/:issueKey/report**
  - [ ] Get conversation report
  - [ ] Validate non-existent issue
  - [ ] Validate report structure

---

### 4.7 ChatKit

#### 4.7.1 ChatKit Endpoints
- [ ] **POST /api/chatkit/session**
  - [ ] Successfully create session
  - [ ] Validate authentication
  - [ ] Validate session data

- [ ] **POST /api/chatkit/refresh**
  - [ ] Refresh session
  - [ ] Validate session token

- [ ] **GET /api/chatkit/session/:sessionId**
  - [ ] Get session information
  - [ ] Validate non-existent session
  - [ ] Validate permissions

- [ ] **DELETE /api/chatkit/session/:sessionId**
  - [ ] Delete session
  - [ ] Validate permissions

- [ ] **GET /api/chatkit/stats**
  - [ ] Get usage statistics
  - [ ] Validate structure

---

### 4.8 Project Management

#### 4.8.1 Project Endpoints (Admin)
- [ ] **GET /api/admin/projects**
  - [ ] List available projects
  - [ ] Validate Jira connection
  - [ ] Validate permissions

- [ ] **POST /api/admin/projects/set-active**
  - [ ] Set active project
  - [ ] Validate non-existent project
  - [ ] Validate permissions

- [ ] **GET /api/admin/projects/active**
  - [ ] Get active project
  - [ ] Validate response

- [ ] **GET /api/admin/projects/:projectKey**
  - [ ] Get project details
  - [ ] Validate non-existent project

- [ ] **GET /api/admin/jira/test-connection**
  - [ ] Test Jira connection
  - [ ] Validate credentials
  - [ ] Validate response

---

### 4.9 Service Validation

#### 4.9.1 Validation Endpoints
- [ ] **POST /api/user/service-validation/request**
  - [ ] Create validation request
  - [ ] Validate required data
  - [ ] Validate service

- [ ] **GET /api/user/service-validation/requests**
  - [ ] List user requests
  - [ ] Validate structure

- [ ] **GET /api/admin/service-validation/pending**
  - [ ] List pending requests (admin)
  - [ ] Validate permissions

- [ ] **POST /api/admin/service-validation/:id/approve**
  - [ ] Approve request (admin)
  - [ ] Validate permissions
  - [ ] Validate request status

- [ ] **POST /api/admin/service-validation/:id/reject**
  - [ ] Reject request (admin)
  - [ ] Validate permissions
  - [ ] Validate request status

- [ ] **POST /api/user/service-validation/protected-token**
  - [ ] Generate protected token
  - [ ] Validate service

- [ ] **POST /api/service-validation/validate-token**
  - [ ] Validate protected token
  - [ ] Validate invalid token
  - [ ] Validate expired token

---


### 4.10 Widget Integration

#### 4.10.1 Widget Endpoints

Currently, widget endpoints are not implemented in the backend. Remove or postpone related tests until endpoints under `/api/widget/*` exist.

---

### 4.11 Jira Service Accounts

#### 4.11.1 Jira Account Endpoints
- [ ] **GET /api/service/:serviceId/jira-accounts**
  - [ ] List Jira accounts for the service
  - [ ] Validate service

- [ ] **POST /api/service/:serviceId/jira-accounts**
  - [ ] Create/update Jira accounts
  - [ ] Validate data
  - [ ] Validate permissions

- [ ] **PUT /api/service/:serviceId/jira-accounts**
  - [ ] Update Jira accounts
  - [ ] Validate data

- [ ] **DELETE /api/service/:serviceId/jira-accounts**
  - [ ] Delete Jira accounts
  - [ ] Validate permissions

---


### 4.12 Configuration and Administration

#### 4.12.1 Admin Dashboard Endpoints
- [ ] **GET /api/admin/dashboard**
  - [ ] Get dashboard (admin)
  - [ ] Validate permissions
  - [ ] Validate data structure

#### 4.12.2 Organization Endpoints
Currently, `/api/admin/organizations` and user permission or CORS endpoints do not exist in the backend. Remove or postpone related tests until they exist.

#### 4.12.3 Permission Endpoints
Currently, `/api/admin/users/permissions` and user permission endpoints do not exist in the backend. Remove or postpone related tests until they exist.

#### 4.12.4 CORS Endpoints
Currently, `/api/admin/cors/*` does not exist in the backend. Remove or postpone related tests until they exist.

#### 4.12.5 Status Disable Endpoints
Currently, `/api/admin/status-disable/*` and `/api/admin/statuses/available` do not exist in the backend. Remove or postpone related tests until they exist.

---

### 4.13 Forms and Landing Pages

#### 4.13.1 Contact Endpoints
- [ ] **POST /api/contact**
  - [ ] Submit contact form
  - [ ] Validate required data
  - [ ] Validate ticket creation in Jira

- [ ] **GET /api/contact/test-jira**
  - [ ] Test Jira connection
  - [ ] Validate response

#### 4.13.2 Landing Endpoints
- [ ] **POST /api/landing/create-ticket**
  - [ ] Create ticket from landing
  - [ ] Validate data
  - [ ] Validate Jira integration

- [ ] **POST /api/landing/validate-form**
  - [ ] Validate landing form
  - [ ] Validate fields

- [ ] **GET /api/landing/form-fields**
  - [ ] Get form fields
  - [ ] Validate structure

---

### 4.14 Health Checks

#### 4.14.1 Health Endpoints
- [ ] **GET /health**
  - [ ] Basic health check
  - [ ] Validate response
  - [ ] Validate response time

- [ ] **GET /health/detailed**
  - [ ] Detailed health check
  - [ ] Validate database status
  - [ ] Validate external services status
  - [ ] Validate memory and CPU

---

## 5. Service Tests

### 5.1 DatabaseService
- [ ] Database connection
- [ ] CRUD operations
- [ ] Transactions
- [ ] Connection error handling
- [ ] Connection pool
- [ ] Migrations

### 5.2 OpenAIService
- [ ] OpenAI API connection
- [ ] Response generation
- [ ] API error handling
- [ ] Rate limiting
- [ ] Token management
- [ ] Assistant management

### 5.3 JiraService
- [ ] Jira API connection
- [ ] Ticket creation
- [ ] Ticket update
- [ ] Get projects
- [ ] Get statuses
- [ ] API error handling
- [ ] Authentication

### 5.4 WebhookService
- [ ] Webhook processing
- [ ] Payload validation
- [ ] Duplicate handling
- [ ] Throttling
- [ ] Statistics

### 5.5 EmailService
- [ ] Email sending
- [ ] Recipient validation
- [ ] Error handling
- [ ] Templates

### 5.6 ConfigurationService
- [ ] Configuration loading
- [ ] Configuration update
- [ ] Configuration validation
- [ ] Configuration cache

### 5.7 CorsService
- [ ] Origin validation
- [ ] Dynamic domain loading
- [ ] Allowed domains cache

---

## 6. Security Tests

### 6.1 Authentication
- [ ] Validate JWT tokens
- [ ] Validate token expiration
- [ ] Validate refresh tokens
- [ ] Validate password hash
- [ ] Validate route protection

### 6.2 Authorization
- [ ] Validate admin permissions
- [ ] Validate specific permissions
- [ ] Validate access to own resources
- [ ] Validate access to other users' resources

### 6.3 Input Validation
- [ ] Validate input data
- [ ] Validate sanitization
- [ ] Validate SQL injection
- [ ] Validate XSS
- [ ] Validate CSRF

### 6.4 Header Security
- [ ] Validate CORS
- [ ] Validate Helmet
- [ ] Validate security headers

### 6.5 Rate Limiting
- [ ] Validate request limits
- [ ] Validate throttling
- [ ] Validate IP blocking

---

## 7. Integration Tests

### 7.1 Jira Integration
- [ ] Ticket creation
- [ ] Ticket update
- [ ] Webhook reception
- [ ] Authentication
- [ ] Error handling

### 7.2 OpenAI Integration
- [ ] Response generation
- [ ] Assistant management
- [ ] Error handling
- [ ] Rate limiting

### 7.3 Database Integration
- [ ] CRUD operations
- [ ] Transactions
- [ ] Migrations
- [ ] Backup and restore

### 7.4 WebSocket Integration
- [ ] Client connection
- [ ] Message sending
- [ ] Disconnection handling
- [ ] Broadcasting

---

## 8. Performance Tests

### 8.1 Response Time
- [ ] Critical endpoints < 200ms
- [ ] Normal endpoints < 500ms
- [ ] Heavy endpoints < 2s

### 8.2 Throughput
- [ ] Requests per second
- [ ] Concurrent requests
- [ ] Peak load handling

### 8.3 Resource Usage
- [ ] Memory usage
- [ ] CPU usage
- [ ] DB connection usage
- [ ] Network connection usage

### 8.4 Scalability
- [ ] Horizontal scaling
- [ ] Vertical scaling
- [ ] Load balancing

---

## 9. Load Tests

### 9.1 Normal Load
- [ ] 100 concurrent users
- [ ] 1000 requests/minute
- [ ] Validate stability

### 9.2 High Load
- [ ] 500 concurrent users
- [ ] 5000 requests/minute
- [ ] Validate controlled degradation

### 9.3 Stress Testing
- [ ] 1000+ concurrent users
- [ ] 10000+ requests/minute
- [ ] Validate system limits

---

## 10. Regression Tests

### 10.1 Existing Features
- [ ] Validate no features are broken
- [ ] Validate backward compatibility
- [ ] Validate data migrations

---

## 11. Recommended Testing Tools

- **Jest**: Unit testing framework
- **Supertest**: API testing
- **Artillery**: Load testing
- **Postman/Newman**: API and collection testing
- **k6**: Performance testing
- **OWASP ZAP**: Security testing

---

## 12. Acceptance Criteria

### 12.1 Code Coverage
- [ ] Minimum 80% code coverage
- [ ] 100% coverage in critical modules

### 12.2 Success Rate
- [ ] 95%+ tests passing
- [ ] 0 critical errors

### 12.3 Performance
- [ ] All endpoints meet SLA
- [ ] System stable under normal load

### 12.4 Security
- [ ] 0 critical vulnerabilities
- [ ] All routes protected

---

## 13. Deployment Checklist

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All API tests passing
- [ ] Security tests completed
- [ ] Performance tests completed
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database migrated
- [ ] Backup completed

---

## 14. Notes and Observations

- Tests should be run in a staging environment before production
- Keep test data separate from production data
- Document all failed test cases
- Review and update this plan regularly
- Consider automated tests in CI/CD

---

**Last update:** 2024  
**Next review:** As needed


