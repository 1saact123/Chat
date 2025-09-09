import OpenAI from 'openai';
import { ChatThread, ChatbotResponse, JiraWebhookPayload } from '../types';
import { ConfigurationService } from './configuration_service';

export class OpenAIService {
  private openai: OpenAI;
  private assistantId: string;
  private threads: Map<string, ChatThread> = new Map();
  private configService: ConfigurationService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.assistantId = process.env.OPENAI_ASSISTANT_ID || '';
    this.configService = ConfigurationService.getInstance();
  }

  async processJiraComment(payload: JiraWebhookPayload, enrichedContext?: any): Promise<ChatbotResponse> {
    const { issue, comment } = payload;
    
    if (!comment) {
      throw new Error('Comment data is missing');
    }

      // Check that it's not an AI comment (simplified detection)
      const authorName = comment.author.displayName.toLowerCase();
      const authorEmail = comment.author.emailAddress?.toLowerCase() || '';
      
      // Only block if it's clearly an AI author
      const isAIAuthor = authorName.includes('ai') || 
                        authorName.includes('assistant') || 
                        authorName.includes('bot') ||
                        authorName.includes('automation') ||
                        authorEmail.includes('ai') ||
                        authorEmail.includes('assistant') ||
                        authorEmail.includes('bot');
    
    if (isAIAuthor) {
      console.log(`Skipping AI-generated comment from ${comment.author.displayName}`);
      return {
        success: false,
        threadId: '',
        error: 'Skipped AI comment to prevent loops'
      };
    }

    console.log(`Processing Jira comment from ${comment.author.displayName} on issue ${issue.key}: ${comment.body}`);
    
    try {
      // Create a consistent threadId to maintain conversation context
      const threadId = `jira_${issue.key}`;
      
      // Build the user message
      const userMessage = `From ${comment.author.displayName} on Jira issue ${issue.key}: ${comment.body}`;
      
      // Jira-specific context (use enriched if available)
      const context = enrichedContext || {
        jiraIssueKey: issue.key,
        issueSummary: issue.fields.summary,
        issueStatus: issue.fields.status.name,
        authorName: comment.author.displayName,
        isJiraComment: true,
        conversationType: 'jira-ticket'
      };

      console.log(`Processing Jira comment with context:`, context);
      console.log(`Thread ID: ${threadId}`);
      console.log(`User message: ${userMessage}`);
      console.log(`🔗 Attempting to call OpenAI API...`);

      // Use the method that handles context and threads
      const result = await this.processWithChatCompletions(userMessage, threadId, context);
      console.log(`✅ OpenAI API call completed:`, result.success ? 'SUCCESS' : 'FAILED');
      return result;
      
    } catch (error) {
      console.log('OpenAI API failed for Jira comment, using fallback response...');
      return this.getJiraFallbackResponse(comment, issue);
    }
  }

  async processDirectChat(message: string, threadId?: string, context?: any): Promise<ChatbotResponse> {
    try {
      console.log('processDirectChat called with:', { message, threadId, context });
      
      // Usar Chat Completions directamente (no necesita asistente específico)
      return await this.processWithChatCompletions(message, threadId, context);

    } catch (error) {
      console.error('Error handling chat message:', error);
      return {
        success: false,
        threadId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async processJiraChatMessage(message: string, issueKey?: string, userInfo?: any): Promise<ChatbotResponse> {
    try {
      console.log(`Processing Jira chat message for issue ${issueKey}: ${message}`);
      
      // Specific thread for chat - use persistent thread based on issue key
      const threadId = `jira_chat_${issueKey || 'general'}`;
      
      // Chat-specific context
      const context = {
        jiraIssueKey: issueKey,
        isChatMessage: true,
        chatWidget: 'jira-native',
        userInfo: userInfo,
        messageType: 'chat'
      };

      // Use the active assistant for chat general service
      const result = await this.processChatForService(message, 'chat-general', threadId, context);
      
      return result;

    } catch (error) {
      console.error('Error processing Jira chat message:', error);
      return {
        success: false,
        threadId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async processWithChatCompletions(message: string, threadId?: string, context?: any): Promise<ChatbotResponse> {
    console.log('🔗 Using Chat Completions API with conversation history...');
    console.log(`📝 Message: ${message}`);
    console.log(`🧵 Thread ID: ${threadId}`);
    console.log(`🔧 Context:`, context);
    
    try {
      // Dynamic instructions based on context
      let systemPrompt = this.buildDynamicSystemPrompt(context);
      
      // Get or create thread to maintain history
      let thread = this.threads.get(threadId || 'default');
      if (!thread) {
        thread = {
          threadId: threadId || `chat_${Date.now()}`,
          jiraIssueKey: context?.jiraIssueKey || 'general',
          lastActivity: new Date(),
          messages: []
        };
        this.threads.set(thread.threadId, thread);
        console.log(`Created new thread: ${thread.threadId}`);
      }

      // Build the messages array with history
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt }
      ];

      // Use conversation history from context if available (more recent)
      let conversationHistory = context?.conversationHistory || [];
      if (conversationHistory.length > 0) {
        console.log(`📋 Using enriched conversation history: ${conversationHistory.length} messages`);
        const enrichedMessages = conversationHistory.map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
        messages.push(...enrichedMessages);
      } else {
        // Use thread history if no enriched context
        const recentMessages = thread.messages.slice(-8).map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        messages.push(...recentMessages);
      }

      // Use the message directly without additional prompts or context
      const userPrompt = message;

      messages.push({ role: 'user', content: userPrompt });

      console.log(`Thread ID: ${thread.threadId}`);
      console.log(`Messages in conversation: ${messages.length}`);
      console.log(`Previous messages in thread: ${thread.messages.length}`);
      console.log(`System Prompt: ${systemPrompt.substring(0, 100)}...`);
      console.log(`User Prompt: ${userPrompt}`);
      
      // Show message history for debugging
      if (thread.messages.length > 0) {
        console.log(`📋 Conversation history for ${thread.threadId}:`);
        thread.messages.slice(-4).forEach((msg, index) => {
          console.log(`   ${index + 1}. [${msg.role}]: ${msg.content.substring(0, 100)}...`);
        });
      }

      console.log(`🚀 Making OpenAI API call with ${messages.length} messages...`);
      console.log(`🔑 API Key configured: ${this.openai.apiKey ? 'YES' : 'NO'}`);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 800,
        temperature: 0.8, // Aumentar ligeramente para más variedad
        presence_penalty: 0.3, // Penalizar repetición de temas
        frequency_penalty: 0.5 // Penalizar repetición de palabras
      });

      let assistantResponse = response.choices[0]?.message?.content;
      if (assistantResponse) {
        console.log('Chat Completions response:', assistantResponse);
        
        // Check if the response is very similar to previous responses
        const isRepetitive = this.checkForRepetitiveResponse(assistantResponse, context?.previousResponses || []);
        if (isRepetitive) {
          console.log('⚠️ Detected repetitive response, regenerating...');
          // Try to generate a different response
          const alternativeResponse = await this.generateAlternativeResponse(messages, context);
          if (alternativeResponse) {
            console.log('✅ Generated alternative response');
            assistantResponse = alternativeResponse;
          }
        }
        
        // Save the user message and response in the history
        const now = new Date();
        thread.messages.push(
          { role: 'user', content: userPrompt, timestamp: now },
          { role: 'assistant', content: assistantResponse, timestamp: now }
        );
        thread.lastActivity = now;
        
        // Clean old messages if there are too many (keep last 20)
        if (thread.messages.length > 20) {
          thread.messages = thread.messages.slice(-20);
        }

              console.log(`Thread ${thread.threadId} updated with ${thread.messages.length} messages`);
      console.log(`🎯 Final response from OpenAI: ${assistantResponse.substring(0, 100)}...`);
      
      return {
        success: true,
        threadId: thread.threadId,
        response: assistantResponse
      };
      } else {
        throw new Error('No response from Chat Completions');
      }
    } catch (error) {
      console.log('OpenAI API failed, using fallback responses...');
      return this.getFallbackResponse(message, context);
    }
  }

  private buildDynamicSystemPrompt(context?: any): string {
    // Por ahora, devolver un prompt genérico
    // Las instrucciones específicas del asistente se manejan en el proceso principal
    console.log('🎯 Using generic system prompt - assistant instructions handled separately');
    return "You are a helpful assistant. Respond to the user's message directly and naturally.";
  }

  private getJiraFallbackResponse(comment: any, issue: any): ChatbotResponse {
    console.log('OpenAI API failed, returning error response...');
    
    return {
      success: false,
      threadId: `jira_error_${issue.key}_${Date.now()}`,
      error: 'OpenAI API is currently unavailable. Please try again later.'
    };
  }

  private getFallbackResponse(message: string, context?: any): ChatbotResponse {
    console.log('OpenAI API failed, returning error response...');
    
    return {
      success: false,
      threadId: `error_${Date.now()}`,
      error: 'OpenAI API is currently unavailable. Please try again later.'
    };
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
    let attempts = 0;
    
    while (Date.now() - startTime < maxWaitTime) {
      attempts++;
      console.log(`Checking run status (attempt ${attempts})...`);
      
      const run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
      console.log(`Run status: ${run.status}`);
      
      if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
        console.log(`Run finished with status: ${run.status}`);
        return run;
      }
      
      if (run.status === 'requires_action') {
        console.log('Run requires action, this might be a tool call');
        return run;
      }
      
      console.log('Waiting 1 second before next check...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Run timed out after', maxWaitTime, 'ms');
    throw new Error('Run timed out');
  }

  // Method to check if a response is repetitive
  private checkForRepetitiveResponse(currentResponse: string, previousResponses: string[]): boolean {
    if (previousResponses.length === 0) return false;
    
    const currentLower = currentResponse.toLowerCase();
    
    for (const prevResponse of previousResponses) {
      const prevLower = prevResponse.toLowerCase();
      const similarity = this.calculateSimilarity(currentLower, prevLower);
      
      if (similarity > 0.7) { // 70% similarity
        console.log(`⚠️ High similarity detected: ${similarity.toFixed(2)}`);
        return true;
      }
    }
    
    return false;
  }

  // Method to calculate similarity between texts
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // Method to generate an alternative response
  private async generateAlternativeResponse(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, context?: any): Promise<string | null> {
    try {
      // Modify the prompt to request a different response
      const lastUserMessage = messages[messages.length - 1];
      const alternativePrompt = `${lastUserMessage.content}\n\n[IMPORTANT: Provide a completely different and unique response. Avoid generic phrases and repetitions.]`;
      
      const modifiedMessages = [...messages.slice(0, -1), { role: 'user' as const, content: alternativePrompt }];
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: modifiedMessages,
        max_tokens: 800,
        temperature: 0.9, // Higher temperature for more variety
        presence_penalty: 0.6, // Higher penalty for repetition
        frequency_penalty: 0.8 // Higher penalty for frequency
      });

      return response.choices[0]?.message?.content || null;
    } catch (error) {
      console.error('Error generating alternative response:', error);
      return null;
    }
  }

  // Method to list all available assistants
  async listAssistants(): Promise<Array<{id: string, name: string, description?: string, model: string, created_at: number}>> {
    try {
      console.log('🔍 Listing available assistants...');
      
      const assistants = await this.openai.beta.assistants.list();
      
      console.log(`✅ Found ${assistants.data.length} assistant(s)`);
      
      return assistants.data.map(assistant => ({
        id: assistant.id,
        name: assistant.name || 'Unnamed',
        description: assistant.description || undefined,
        model: assistant.model,
        created_at: assistant.created_at
      }));
    } catch (error) {
      console.error('❌ Error listing assistants:', error);
      throw new Error(`Error listing assistants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Method to change the active assistant
  setActiveAssistant(assistantId: string): void {
    this.assistantId = assistantId;
    console.log(`🔄 Active assistant changed to: ${assistantId}`);
  }

  // Method to get the current active assistant
  getActiveAssistant(): string {
    return this.assistantId;
  }

  // Method to get the active assistant for a specific service
  getActiveAssistantForService(serviceId: string): string | null {
    return this.configService.getActiveAssistantForService(serviceId);
  }

  // Method to process chat with a specific service assistant
  async processChatForService(message: string, serviceId: string, threadId?: string, context?: any): Promise<ChatbotResponse> {
    try {
      // Get the assistant configured for this service
      const serviceAssistantId = this.configService.getActiveAssistantForService(serviceId);
      
      if (!serviceAssistantId) {
        return {
          success: false,
          threadId: '',
          error: `No assistant configured for service '${serviceId}'`
        };
      }

      console.log(`🎯 Using assistant ${serviceAssistantId} for service ${serviceId}`);
      
      // Use the OpenAI Assistant API directly to get the assistant's instructions
      try {
        const assistant = await this.openai.beta.assistants.retrieve(serviceAssistantId);
        console.log(`✅ Retrieved assistant: ${assistant.name}`);
        console.log(`📝 Assistant instructions: ${assistant.instructions?.substring(0, 100)}...`);
        
        // Use the assistant's instructions in the system prompt
        const systemPrompt = assistant.instructions || "You are a helpful assistant.";
        
        // Use existing thread or create a new one
        let thread;
        if (threadId) {
          try {
            // Try to retrieve existing thread
            thread = await this.openai.beta.threads.retrieve(threadId);
            console.log(`✅ Using existing thread: ${threadId}`);
          } catch (error) {
            console.log(`⚠️ Thread ${threadId} not found, creating new one`);
            thread = await this.openai.beta.threads.create();
          }
        } else {
          // Create a new thread
          thread = await this.openai.beta.threads.create();
          console.log(`✅ Created new thread: ${thread.id}`);
        }
        
        // Add the user message to the thread
        await this.openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: message
        });
        
        // Run the assistant
        const run = await this.openai.beta.threads.runs.create(thread.id, {
          assistant_id: serviceAssistantId
        });
        
        // Wait for completion
        let runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
        while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
        }
        
        if (runStatus.status === 'completed') {
          // Get the assistant's response
          const messages = await this.openai.beta.threads.messages.list(thread.id);
          const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
          
          if (assistantMessage && assistantMessage.content[0].type === 'text') {
            return {
              success: true,
              threadId: thread.id,
              response: assistantMessage.content[0].text.value,
              assistantId: serviceAssistantId,
              assistantName: assistant.name || 'Unknown Assistant'
            };
          }
        }
        
        throw new Error(`Assistant run failed with status: ${runStatus.status}`);
        
      } catch (assistantError) {
        console.error('Error using OpenAI Assistant API:', assistantError);
        // Fallback to Chat Completions with assistant instructions
        return await this.processWithChatCompletions(message, threadId, context);
      }

    } catch (error) {
      console.error('Error processing chat for service:', error);
      return {
        success: false,
        threadId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}