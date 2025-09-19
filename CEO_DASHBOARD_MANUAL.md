# CEO Dashboard - User Manual

## Overview

The CEO Dashboard is a comprehensive administrative control panel for managing the Movonte AI Assistant System. This interface allows administrators to configure AI assistants, manage services, control ticket behavior, and monitor system activity in real-time.

## Access Information

- **URL**: `https://movonte-consulting.github.io/ceo-dashboard.html`
- **Access Level**: Administrative (CEO/Management)
- **Browser Requirements**: Modern web browser with JavaScript enabled
- **Network**: Requires access to the backend API at `https://chat.movonte.com`

## Dashboard Interface

### Navigation Bar
- **Brand**: Movonte logo and branding
- **Navigation Links**: Dashboard, Assistants, Services, Settings
- **Breadcrumbs**: Home > AI Management > Control Panel

### Statistics Cards
The dashboard displays four key metrics at the top:

1. **Available Assistants**: Total number of AI assistants configured
2. **Configured Services**: Number of services set up (typically 2)
3. **Active Services**: Number of currently active services
4. **System Uptime**: Current system availability percentage

## Main Features

### 1. AI Assistants Management

#### Viewing Available Assistants
- **Location**: Left column, "AI Assistants" section
- **Information Displayed**:
  - Assistant name
  - Assistant ID
  - Model type
  - Current status (Active/Inactive)
  - Service assignment status

#### Assistant Status Indicators
- **Green Dot**: Assistant is active and assigned to a service
- **Gray Dot**: Assistant is inactive or not assigned
- **Status Text**:
  - "ACTIVE (Global + Service)": Fully active
  - "ACTIVE (Service)": Active for specific service
  - "ACTIVE (Global)": Global activation only
  - "INACTIVE": Not active

### 2. Service Configuration

#### Available Services
The system manages two main services:

1. **Landing Page Service**
   - **Service ID**: `landing-page`
   - **Purpose**: Handles customer inquiries from website contact forms
   - **Current Assistant**: Shows assigned AI assistant
   - **Last Updated**: Timestamp of last configuration change

2. **Chat General Service**
   - **Service ID**: `chat-general`
   - **Purpose**: Handles general chat interactions
   - **Current Assistant**: Shows assigned AI assistant
   - **Last Updated**: Timestamp of last configuration change

#### Service Management Actions

**Change Assistant**
1. Select desired assistant from dropdown menu
2. Click "APPLY" button
3. System will update the service configuration
4. Success message will be displayed

**Activate/Deactivate Service**
1. Click "ACTIVATE" or "DEACTIVATE" button
2. System will toggle service status
3. Status change will be reflected immediately

**Remove Service**
1. Click "REMOVE" button
2. Confirm the action
3. Service will be permanently removed from configuration

### 3. Ticket Control

#### Disable AI Assistant for Specific Tickets
This feature allows you to disable the AI assistant for specific Jira tickets when human intervention is required.

**Steps to Disable AI for a Ticket**:
1. **Enter Ticket Key**: Input the Jira ticket key (e.g., TI-123, DEV-456)
2. **Add Reason** (Optional): Provide a reason for disabling the AI
3. **Click "Disable Assistant"**: The AI will stop responding to that ticket
4. **Confirmation**: System will display success message

**Steps to Re-enable AI for a Ticket**:
1. **Enter Ticket Key**: Input the same Jira ticket key
2. **Click "Enable Assistant"**: The AI will resume responding
3. **Confirmation**: System will display success message

#### Disabled Tickets List
- **Location**: Below the ticket control form
- **Information Displayed**:
  - Ticket key
  - Reason for disabling
  - Date and time of disable action
  - Disabled by (user information)

### 4. Project Management

#### Active Project Selection
- **Current Project**: Displays the currently active Jira project
- **Change Project**: Use dropdown to select different project
- **Project Information**: Shows project key and name

#### Remote Projects
- **List**: Displays all available Jira projects
- **Status**: Shows project status and configuration
- **Management**: Options to configure project settings

### 5. Activity Log

#### Real-time Activity Monitoring
- **Location**: Right column, "Activity Log" section
- **Information Tracked**:
  - Configuration changes
  - Service activations/deactivations
  - Assistant assignments
  - Ticket control actions
  - System events

#### Activity Types
- **Success Actions**: Green indicators for successful operations
- **Error Events**: Red indicators for failed operations
- **Information**: Blue indicators for informational messages

## Step-by-Step Procedures

### Procedure 1: Assign New AI Assistant to Service

1. **Access Dashboard**: Navigate to CEO Dashboard
2. **Locate Service**: Find the service you want to configure
3. **Select Assistant**: Choose from the "CHANGE ASSISTANT" dropdown
4. **Apply Changes**: Click "APPLY" button
5. **Verify**: Check that the assistant name updates in the service details
6. **Confirm**: Look for success message in activity log

### Procedure 2: Disable AI for Customer Escalation

1. **Identify Ticket**: Get the Jira ticket key from customer service
2. **Access Ticket Control**: Scroll to "Ticket Control" section
3. **Enter Ticket Key**: Input the ticket key (e.g., TI-123)
4. **Add Reason**: Enter reason like "Customer escalation - human agent required"
5. **Disable**: Click "Disable Assistant" button
6. **Verify**: Check that ticket appears in "Disabled Tickets" list
7. **Notify Team**: Inform customer service team that AI is disabled

### Procedure 3: Activate/Deactivate Service

1. **Locate Service**: Find the service in the "Service Configuration" section
2. **Check Status**: Review current service status
3. **Toggle Status**: Click "ACTIVATE" or "DEACTIVATE" button
4. **Confirm Action**: System will process the change
5. **Verify**: Check statistics cards for updated active service count
6. **Monitor**: Watch activity log for confirmation

### Procedure 4: Change Active Project

1. **Access Project Section**: Scroll to "Project Management" section
2. **View Current Project**: Check currently active project
3. **Select New Project**: Use dropdown to choose different project
4. **Apply Change**: System will automatically apply the change
5. **Verify**: Check that project name updates in the interface
6. **Confirm**: Look for success message in activity log

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Error loading dashboard"
**Symptoms**: Dashboard shows loading spinner indefinitely
**Solutions**:
1. Check internet connection
2. Verify backend API is accessible at `https://chat.movonte.com`
3. Refresh the page
4. Check browser console for error messages

#### Issue: "Assistant not found"
**Symptoms**: Error when trying to apply assistant changes
**Solutions**:
1. Refresh the dashboard to reload assistant list
2. Verify the assistant exists in OpenAI
3. Check API connectivity
4. Try selecting a different assistant

#### Issue: "Service configuration failed"
**Symptoms**: Error when activating/deactivating services
**Solutions**:
1. Check network connection
2. Verify backend API is running
3. Try the action again
4. Check activity log for detailed error information

#### Issue: "Ticket disable failed"
**Symptoms**: Error when trying to disable AI for ticket
**Solutions**:
1. Verify ticket key format (e.g., TI-123)
2. Check that ticket exists in Jira
3. Ensure ticket key is correct
4. Try again with a different ticket

### Error Messages

#### "Please select an assistant first"
- **Cause**: No assistant selected from dropdown
- **Solution**: Choose an assistant before clicking APPLY

#### "Assistant not found"
- **Cause**: Selected assistant doesn't exist in system
- **Solution**: Refresh dashboard and select valid assistant

#### "Error loading dashboard"
- **Cause**: Backend API connection issue
- **Solution**: Check network and API connectivity

#### "Service not found"
- **Cause**: Service ID doesn't exist
- **Solution**: Refresh dashboard to reload service list

## Best Practices

### Security
- **Access Control**: Only authorized personnel should access the dashboard
- **Session Management**: Log out when finished
- **Change Documentation**: Document all configuration changes

### Configuration Management
- **Backup**: Keep records of working configurations
- **Testing**: Test changes in development environment first
- **Gradual Changes**: Make one change at a time
- **Verification**: Always verify changes were applied correctly

### Monitoring
- **Regular Checks**: Monitor system statistics regularly
- **Activity Review**: Review activity log for unusual patterns
- **Performance**: Watch system uptime and response times
- **Error Tracking**: Address errors promptly

### Communication
- **Team Notification**: Inform team of significant changes
- **Change Log**: Maintain log of all administrative actions
- **Documentation**: Update documentation when making changes
- **Escalation**: Know when to escalate issues to technical team

## Support and Maintenance

### Regular Maintenance Tasks
- **Weekly**: Review system statistics and activity log
- **Monthly**: Check assistant performance and update if needed
- **Quarterly**: Review and optimize service configurations

### Emergency Procedures
- **System Downtime**: Check backend API status
- **Service Issues**: Deactivate problematic services
- **Ticket Problems**: Disable AI for problematic tickets
- **Configuration Errors**: Revert to last known working configuration

### Contact Information
- **Technical Support**: Contact development team for technical issues
- **System Administration**: Internal IT team for access issues
- **Emergency**: Use established escalation procedures

## Glossary

- **Assistant**: AI-powered chatbot configured for specific tasks
- **Service**: Business function that uses AI assistants (e.g., landing page, chat)
- **Ticket**: Jira issue/ticket that can have AI assistance enabled/disabled
- **Project**: Jira project containing tickets and configurations
- **Configuration**: Settings that control how AI assistants behave
- **Activity Log**: Real-time record of all system actions and changes

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Maintained By**: Movonte Development Team  
**Classification**: Internal Use Only
