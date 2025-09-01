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
    this.configService = new ConfigurationService();
  }

  async processJiraComment(payload: JiraWebhookPayload, enrichedContext?: any): Promise<ChatbotResponse> {
    const { issue, comment } = payload;
    
    if (!comment) {
      throw new Error('Comment data is missing');
    }

          // Check that it's not an AI comment (more specific detection)
      const commentText = comment.body.toLowerCase();
      const authorName = comment.author.displayName.toLowerCase();
      
      // Only block if it's clearly an AI comment
      const isAIAuthor = authorName.includes('ai') || 
                        authorName.includes('assistant') || 
                        authorName.includes('bot') ||
                        authorName.includes('automation');
      
      // Detect AI comments more specifically
      const isAIComment = commentText.includes('ai response') || 
                         commentText.includes('automatic response') ||
                         commentText.includes('as movonte assistant') ||
                         (commentText.includes('i am an assistant') && commentText.length < 50); // Only if very short
    
    if (isAIAuthor || isAIComment) {
      console.log(`Skipping AI-generated comment from ${comment.author.displayName}`);
      console.log(`Reason: ${isAIAuthor ? 'AI Author' : 'AI Content'}`);
      console.log(`Comment text: ${comment.body}`);
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
      
      // Specific thread for chat
      const threadId = `jira_chat_${issueKey || 'general'}_${Date.now()}`;
      
      // Chat-specific context
      const context = {
        jiraIssueKey: issueKey,
        isChatMessage: true,
        chatWidget: 'jira-native',
        userInfo: userInfo,
        messageType: 'chat'
      };

      // Chat-specific instructions
      const chatInstructions = `
        You are a Jira chat assistant for Movonte. 
        Respond in a conversational and helpful manner.
        If there's an associated ticket, provide relevant information.
        Maintain a professional but friendly tone.
        Suggest concrete actions when appropriate.
      `;

      const result = await this.processDirectChat(message, threadId, context);
      
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

      // Add the current message
      let userPrompt = message;
      
      // Add Jira context if available
      if (context?.jiraIssueKey) {
        userPrompt = `[Jira Ticket: ${context.jiraIssueKey}] ${message}`;
      }

      // Add additional context if available
      if (context?.additionalInfo) {
        userPrompt = `[Additional context: ${context.additionalInfo}] ${userPrompt}`;
      }

      // Add specific instructions to avoid repetitions
      if (context?.previousResponses && context.previousResponses.length > 0) {
        const previousResponses = context.previousResponses.join('\n');
        userPrompt = `${userPrompt}\n\n[IMPORTANT: Avoid repeating responses similar to these previous ones: ${previousResponses}]`;
      }

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
    let basePrompt = `You are a Movonte assistant, a software development company specialized in innovative technological solutions.

**Company Information:**
- Company: Movonte
- Sector: Software Development
- Focus: Enterprise Technology Solutions

**Main Capabilities:**
- Technical support for development projects
- Analysis and resolution of technical problems
- Software architecture consulting
- Project management and agile methodologies
- Integration with tools like Jira, Git, etc.

**Communication Style:**
- Professional but approachable
- Clear and concise responses
- Use practical examples when appropriate
- Always in English

**IMPORTANT - Conversation Management:**
- ALWAYS review the conversation history before responding
- DO NOT repeat yourself if you've already answered something similar
- Maintain the context of the previous conversation
- If the user asks related questions, respond coherently
- Avoid generic responses if you've already provided specific information
- If you detect that your response is similar to a previous one, provide new or different information
- Vary your vocabulary and sentence structure to avoid repetitions
- Focus on specific and relevant information to the current context`;

    // Add specific context for Service Desk
    if (context?.serviceDesk) {
      basePrompt += `

**SERVICE DESK SPECIALIZATION:**
- You are a Jira Service Desk specialized assistant
- You help with tickets, SLA, technical support and customer service
- You know Movonte's processes for problem resolution
- You provide information about support policies and response times

**Specific Service Desk Functions:**
- Ticket creation and tracking
- SLA and response time queries
- Technical support and problem resolution
- Information about company processes and policies
- Guide for using the ticket system
- Problem escalation when necessary`;
    }

    // Add specific context for Jira chat
    if (context?.isChatMessage) {
      basePrompt += `

**JIRA CHAT SPECIALIZATION:**
- You are a Jira-integrated chat assistant for Movonte
- Respond in a conversational and helpful manner
- Provide specific information about tickets and projects
- Maintain a professional but friendly tone
- Suggest concrete actions when appropriate

**Specific Chat Functions:**
- Help with queries about specific tickets
- Provide information about status and progress
- Suggest next steps and actions
- Answer questions about processes and policies
- Offer contextual technical support
- Maintain fluid and useful conversations`;
    }

    // Add Jira-specific context if available
    if (context?.jiraIssueKey) {
      basePrompt += `

**Jira Context:**
- You are working with ticket: ${context.jiraIssueKey}
- You can reference this ticket in your responses
- If the user asks about the ticket, provide relevant information`;
    }

    // Add project context if available
    if (context?.projectInfo) {
      basePrompt += `

**Project Information:**
${context.projectInfo}`;
    }

    // Add specific instructions if available
    if (context?.specificInstructions) {
      basePrompt += `

**Specific Instructions:**
${context.specificInstructions}`;
    }

    // Add user context if available
    if (context?.userRole) {
      basePrompt += `

**User Role:**
- The user is: ${context.userRole}
- Adapt your responses according to their technical experience level`;
    }

    basePrompt += `

**Remember:**
- Always be helpful and professional
- If you don't have enough information, ask for more details
- Suggest concrete actions when appropriate
- Maintain a positive and constructive tone`;

    return basePrompt;
  }

  private getJiraFallbackResponse(comment: any, issue: any): ChatbotResponse {
    console.log('Using Jira fallback response system...');
    
    const commentText = comment.body.toLowerCase();
    let response = '';

    if (commentText.includes('hola') || commentText.includes('hello')) {
      response = `Hello ${comment.author.displayName}! I'm the Movonte assistant. Thank you for your comment on ticket ${issue.key}. How can I help you with this ticket?`;
    } else if (commentText.includes('ayuda') || commentText.includes('help')) {
      response = `Hello ${comment.author.displayName}, I can help you with:\n• Queries about ticket ${issue.key}\n• Project information\n• General technical support\n• Progress tracking\n• What do you need specifically?`;
    } else if (commentText.includes('estado') || commentText.includes('status')) {
      response = `Hello ${comment.author.displayName}, I can see that ticket ${issue.key} is in status "${issue.fields.status.name}". Do you need information about the progress or help with something specific?`;
    } else if (commentText.includes('proyecto') || commentText.includes('project')) {
      response = `Hello ${comment.author.displayName}, this ticket belongs to project ${issue.fields.project.name}. Do you need specific information about the project or help with this ticket?`;
    } else {
      response = `Hello ${comment.author.displayName}, thank you for your comment on ticket ${issue.key}. I'm the Movonte assistant and I'm here to help you. I'm currently in backup mode, but I can assist you with queries about this ticket. How can I help you specifically?`;
    }

    return {
      success: true,
      threadId: `jira_fallback_${issue.key}_${Date.now()}`,
      response: response
    };
  }

  private getFallbackResponse(message: string, context?: any): ChatbotResponse {
    console.log('Using fallback response system...');
    
    const lowerMessage = message.toLowerCase();
    let response = '';

    if (lowerMessage.includes('hola') || lowerMessage.includes('hello')) {
      response = 'Hello! I\'m the Movonte assistant. How can I help you today?';
    } else if (lowerMessage.includes('jira') || context?.jiraIssueKey) {
      response = `I understand you're working with ticket ${context?.jiraIssueKey || 'Jira'}. Do you need specific help with this ticket?`;
    } else if (lowerMessage.includes('ayuda') || lowerMessage.includes('help')) {
      response = 'I can help you with:\n• Queries about Jira tickets\n• Project information\n• General technical support\n• What do you need?';
    } else if (lowerMessage.includes('proyecto') || lowerMessage.includes('project')) {
      response = 'At Movonte we work on various development projects. Are you referring to a specific project?';
    } else {
      response = 'Thank you for your message. I\'m currently in backup mode due to API limitations. Can I help you with something specific about Movonte or our projects?';
    }

    return {
      success: true,
      threadId: `fallback_${Date.now()}`,
      response: response
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

      // Use the service assistant instead of the global assistant
      const originalAssistantId = this.assistantId;
      this.assistantId = serviceAssistantId;

      try {
        const result = await this.processWithChatCompletions(message, threadId, context);
        return result;
      } finally {
        // Restore the original assistant
        this.assistantId = originalAssistantId;
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