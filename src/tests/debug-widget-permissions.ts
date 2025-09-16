import { JiraService } from '../services/jira_service';
import axios from 'axios';

async function debugWidgetPermissions() {
  const jiraService = JiraService.getInstance();
  
  console.log('🔍 === DEBUGGING WIDGET PERMISSIONS ===\n');
  
  const issueKey = 'TI-381';
  
  try {
    // 1. Test if the issue exists with main account
    console.log('1. Testing issue existence with main account...');
    try {
      const issue = await jiraService.getIssueByKey(issueKey);
      console.log(`✅ Issue ${issueKey} exists:`, {
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        project: issue.fields.project.name
      });
    } catch (error) {
      console.log(`❌ Issue ${issueKey} not found or no access with main account:`, (error as Error).message);
      return;
    }
    
    // 2. Test widget credentials
    console.log('\n2. Testing widget credentials...');
    const widgetEmail = process.env.JIRA_WIDGET;
    const widgetToken = process.env.JIRA_WIDGET_TOKEN;
    
    if (!widgetEmail || !widgetToken) {
      console.log('❌ JIRA_WIDGET or JIRA_WIDGET_TOKEN not configured');
      return;
    }
    
    console.log(`Widget email: ${widgetEmail}`);
    console.log(`Widget token configured: ${widgetToken ? 'YES' : 'NO'}`);
    
    // 3. Test widget account access to the issue
    console.log('\n3. Testing widget account access to issue...');
    const widgetAuth = Buffer.from(`${widgetEmail}:${widgetToken}`).toString('base64');
    
    try {
      const response = await axios.get(
        `https://movonte.atlassian.net/rest/api/3/issue/${issueKey}`,
        {
          headers: {
            'Authorization': `Basic ${widgetAuth}`,
            'Accept': 'application/json'
          }
        }
      );
      console.log(`✅ Widget account can access issue ${issueKey}`);
    } catch (error) {
      const axiosError = error as any;
      console.log(`❌ Widget account cannot access issue ${issueKey}:`, axiosError.response?.status, axiosError.response?.data);
    }
    
    // 4. Test adding comment with widget account
    console.log('\n4. Testing comment addition with widget account...');
    try {
      const commentData = {
        body: {
          version: 1,
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Test comment from widget account'
                }
              ]
            }
          ]
        }
      };
      
      const response = await axios.post(
        `https://movonte.atlassian.net/rest/api/3/issue/${issueKey}/comment`,
        commentData,
        {
          headers: {
            'Authorization': `Basic ${widgetAuth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log('✅ Widget account can add comments');
      console.log('Comment ID:', response.data.id);
      
    } catch (error) {
      const axiosError = error as any;
      console.log('❌ Widget account cannot add comments:', axiosError.response?.status, axiosError.response?.data);
    }
    
    // 5. Check user permissions
    console.log('\n5. Checking widget user permissions...');
    try {
      const response = await axios.get(
        `https://movonte.atlassian.net/rest/api/3/myself`,
        {
          headers: {
            'Authorization': `Basic ${widgetAuth}`,
            'Accept': 'application/json'
          }
        }
      );
      
      console.log('Widget user info:', {
        accountId: response.data.accountId,
        displayName: response.data.displayName,
        emailAddress: response.data.emailAddress,
        active: response.data.active
      });
      
    } catch (error) {
      const axiosError = error as any;
      console.log('❌ Cannot get widget user info:', axiosError.response?.status, axiosError.response?.data);
    }
    
  } catch (error) {
    console.error('Error during debugging:', error);
  }
}

// Run the debug function
debugWidgetPermissions().catch(console.error);


