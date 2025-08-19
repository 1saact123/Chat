import OpenAI from 'openai';
import { ChatThread, ChatbotResponse, JiraWebhookPayload } from '../types';

export class OpenAIService {
  private openai: OpenAI;
  private assistantId: string;
  private threads: Map<string, ChatThread> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.assistantId = process.env.OPENAI_ASSISTANT_ID || '';
  }

  async processJiraComment(payload: JiraWebhookPayload): Promise<ChatbotResponse> {
    const { issue, comment } = payload;
    
    if (!comment) {
      throw new Error('Comment data is missing');
    }

    const threadKey = `jira_${issue.key}`;
    
    try {
      let thread = this.threads.get(threadKey);
      
      if (!thread) {
        const openaiThread = await this.openai.beta.threads.create({
          metadata: {
            jiraIssueKey: issue.key,
            jiraIssueId: issue.id,
          }
        });
        
        thread = {
          threadId: openaiThread.id,
          jiraIssueKey: issue.key,
          lastActivity: new Date(),
          messages: []
        };
        
        this.threads.set(threadKey, thread);
      }

      const userMessage = `From ${comment.author.displayName} on Jira issue ${issue.key}: ${comment.body}`;
      
      await this.openai.beta.threads.messages.create(thread.threadId, {
        role: 'user',
        content: userMessage
      });

      const run = await this.openai.beta.threads.runs.create(thread.threadId, {
        assistant_id: this.assistantId,
        additional_instructions: `You are helping with Jira issue ${issue.key}: "${issue.fields.summary}". Current status: ${issue.fields.status.name}. Provide helpful, concise responses.`
      });

      const completedRun = await this.waitForRunCompletion(thread.threadId, run.id);
      
      if (completedRun.status === 'completed') {
        const messages = await this.openai.beta.threads.messages.list(thread.threadId);
        const assistantMessage = messages.data.find(msg => 
          msg.role === 'assistant' && msg.run_id === run.id
        );

        if (assistantMessage && assistantMessage.content[0].type === 'text') {
          const response = assistantMessage.content[0].text.value;
          
          thread.messages.push(
            {
              role: 'user',
              content: userMessage,
              timestamp: new Date()
            },
            {
              role: 'assistant',
              content: response,
              timestamp: new Date()
            }
          );
          thread.lastActivity = new Date();

          return {
            success: true,
            threadId: thread.threadId,
            response: response
          };
        }
      }

      return {
        success: false,
        threadId: thread.threadId,
        error: 'Failed to get assistant response'
      };

    } catch (error) {
      console.error('Error processing Jira comment:', error);
      return {
        success: false,
        threadId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async processDirectChat(message: string, threadId?: string, context?: any): Promise<ChatbotResponse> {
    try {
      let actualThreadId = threadId;
      
      if (!actualThreadId) {
        const openaiThread = await this.openai.beta.threads.create({
          metadata: { source: 'direct_chat', ...context }
        });
        actualThreadId = openaiThread.id;
      }

      await this.openai.beta.threads.messages.create(actualThreadId, {
        role: 'user',
        content: message
      });

      const run = await this.openai.beta.threads.runs.create(actualThreadId, {
        assistant_id: this.assistantId
      });

      const completedRun = await this.waitForRunCompletion(actualThreadId, run.id);
      
      if (completedRun.status === 'completed') {
        const messages = await this.openai.beta.threads.messages.list(actualThreadId);
        const assistantMessage = messages.data.find(msg => 
          msg.role === 'assistant' && msg.run_id === run.id
        );

        if (assistantMessage && assistantMessage.content[0].type === 'text') {
          return {
            success: true,
            threadId: actualThreadId,
            response: assistantMessage.content[0].text.value
          };
        }
      }

      return {
        success: false,
        threadId: actualThreadId,
        error: 'Failed to get assistant response'
      };

    } catch (error) {
      console.error('Error handling chat message:', error);
      return {
        success: false,
        threadId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getThreadHistory(threadId: string) {
    const messages = await this.openai.beta.threads.messages.list(threadId);
    
    return {
      success: true,
      threadId,
      messages: messages.data.map(msg => ({
        role: msg.role,
        content: msg.content[0].type === 'text' ? msg.content[0].text.value : '',
        timestamp: new Date(msg.created_at * 1000)
      }))
    };
  }

  getActiveThreads() {
    return Array.from(this.threads.entries()).map(([key, thread]) => ({
      key,
      threadId: thread.threadId,
      jiraIssueKey: thread.jiraIssueKey,
      lastActivity: thread.lastActivity,
      messageCount: thread.messages.length
    }));
  }

  private async waitForRunCompletion(threadId: string, runId: string, maxWaitTime = 30000): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
      
      if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
        return run;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Run timed out');
  }
}