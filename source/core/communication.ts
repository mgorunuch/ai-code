/**
 * Inter-Agent Communication System
 * Handles messaging between agents and question/answer functionality
 */

import type {
  AgentId,
  AgentMessage,
  QuestionRequest,
  QuestionResponse,
  AgentCapability
} from './types';
import { AgentRegistry } from './agent-registry';

export interface CommunicationEvents {
  messageSent: (message: AgentMessage) => void;
  messageReceived: (message: AgentMessage) => void;
  questionAsked: (from: AgentId, to: AgentId, question: QuestionRequest) => void;
  questionAnswered: (from: AgentId, to: AgentId, response: QuestionResponse) => void;
}

export class AgentCommunicationSystem {
  private messageHistory: Map<string, AgentMessage> = new Map();
  private pendingQuestions: Map<string, Promise<QuestionResponse>> = new Map();
  private questionHandlers: Map<AgentId, (question: QuestionRequest) => Promise<QuestionResponse>> = new Map();
  private eventListeners: Partial<CommunicationEvents> = {};

  constructor(private agentRegistry: AgentRegistry) {}

  /**
   * Register a question handler for an agent
   */
  registerQuestionHandler(
    agentId: AgentId,
    handler: (question: QuestionRequest) => Promise<QuestionResponse>
  ): void {
    this.questionHandlers.set(agentId, handler);
    console.log(`Question handler registered for agent: ${agentId}`);
  }

  /**
   * Send a message between agents
   */
  async sendMessage(message: Omit<AgentMessage, 'messageId' | 'timestamp'>): Promise<AgentMessage> {
    const fullMessage: AgentMessage = {
      ...message,
      messageId: this.generateMessageId(),
      timestamp: new Date()
    };

    // Validate that both agents exist
    const fromAgent = this.agentRegistry.getAgent(message.from);
    const toAgent = this.agentRegistry.getAgent(message.to);

    if (!fromAgent) {
      throw new Error(`Source agent ${message.from} not found`);
    }

    if (!toAgent) {
      throw new Error(`Target agent ${message.to} not found`);
    }

    // Validate that target agent has the requested endpoint
    const hasEndpoint = toAgent.endpoints.some(ep => ep.name === message.endpoint);
    if (!hasEndpoint) {
      throw new Error(`Agent ${message.to} does not have endpoint '${message.endpoint}'`);
    }

    // Store message in history
    this.messageHistory.set(fullMessage.messageId, fullMessage);

    // Emit events
    this.emit('messageSent', fullMessage);
    this.emit('messageReceived', fullMessage);

    console.log(`Message sent from ${message.from} to ${message.to} (endpoint: ${message.endpoint})`);

    return fullMessage;
  }

  /**
   * Ask a question to a specific agent
   */
  async askQuestion(
    fromAgent: AgentId,
    toAgent: AgentId,
    question: QuestionRequest
  ): Promise<QuestionResponse> {
    // Validate agents
    const sourceAgent = this.agentRegistry.getAgent(fromAgent);
    const targetAgent = this.agentRegistry.getAgent(toAgent);

    if (!sourceAgent) {
      throw new Error(`Source agent ${fromAgent} not found`);
    }

    if (!targetAgent) {
      throw new Error(`Target agent ${toAgent} not found`);
    }

    // Check if target agent has question endpoint
    const hasQuestionEndpoint = targetAgent.endpoints.some(ep => ep.name === 'question');
    if (!hasQuestionEndpoint) {
      throw new Error(`Agent ${toAgent} does not support questions`);
    }

    // Check if we have a handler for the target agent
    const handler = this.questionHandlers.get(toAgent);
    if (!handler) {
      throw new Error(`No question handler registered for agent ${toAgent}`);
    }

    // Generate unique question ID
    const questionId = this.generateMessageId();

    // Emit question asked event
    this.emit('questionAsked', fromAgent, toAgent, question);

    try {
      // Send the question through the message system
      await this.sendMessage({
        from: fromAgent,
        to: toAgent,
        endpoint: 'question',
        payload: question
      });

      // Call the handler
      const response = await handler(question);

      // Emit question answered event
      this.emit('questionAnswered', fromAgent, toAgent, response);

      console.log(`Question answered by ${toAgent} for ${fromAgent}`);

      return response;
    } catch (error) {
      console.error(`Error processing question from ${fromAgent} to ${toAgent}:`, error);
      throw error;
    }
  }

  /**
   * Ask a question to multiple agents and return all responses
   */
  async askQuestionToMultiple(
    fromAgent: AgentId,
    targetAgents: AgentId[],
    question: QuestionRequest
  ): Promise<Map<AgentId, QuestionResponse | Error>> {
    const responses = new Map<AgentId, QuestionResponse | Error>();

    // Ask all agents in parallel
    const promises = targetAgents.map(async (targetAgent) => {
      try {
        const response = await this.askQuestion(fromAgent, targetAgent, question);
        responses.set(targetAgent, response);
      } catch (error) {
        responses.set(targetAgent, error as Error);
      }
    });

    await Promise.allSettled(promises);

    return responses;
  }

  /**
   * Discover agents that can answer questions about specific topics/files
   */
  async discoverQuestionAgents(context?: { filePaths?: string[]; domain?: string }): Promise<AgentCapability[]> {
    return await this.agentRegistry.findQuestionAgents(context);
  }

  /**
   * Broadcast a question to all available question agents
   */
  async broadcastQuestion(
    fromAgent: AgentId,
    question: QuestionRequest,
    context?: { filePaths?: string[]; domain?: string }
  ): Promise<Map<AgentId, QuestionResponse | Error>> {
    const availableAgents = await this.discoverQuestionAgents(context);
    const targetAgentIds = availableAgents
      .map(agent => agent.id)
      .filter(id => id !== fromAgent); // Don't ask yourself

    if (targetAgentIds.length === 0) {
      console.warn('No agents available to answer the question');
      return new Map();
    }

    console.log(`Broadcasting question to ${targetAgentIds.length} agents: ${targetAgentIds.join(', ')}`);

    return this.askQuestionToMultiple(fromAgent, targetAgentIds, question);
  }

  /**
   * Get message history
   */
  getMessageHistory(agentId?: AgentId): AgentMessage[] {
    const messages = Array.from(this.messageHistory.values());

    if (agentId) {
      return messages.filter(msg => msg.from === agentId || msg.to === agentId);
    }

    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Clear message history
   */
  clearMessageHistory(): void {
    this.messageHistory.clear();
    console.log('Message history cleared');
  }

  /**
   * Add event listener
   */
  on<K extends keyof CommunicationEvents>(event: K, listener: CommunicationEvents[K]): void {
    this.eventListeners[event] = listener;
  }

  /**
   * Remove event listener
   */
  off<K extends keyof CommunicationEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  /**
   * Emit event
   */
  private emit<K extends keyof CommunicationEvents>(
    event: K,
    ...args: Parameters<CommunicationEvents[K]>
  ): void {
    const listener = this.eventListeners[event];
    if (listener) {
      // @ts-ignore - TypeScript has trouble with the spread args
      listener(...args);
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get communication statistics
   */
  getStats(): {
    totalMessages: number;
    messagesByAgent: Map<AgentId, number>;
    questionsByAgent: Map<AgentId, number>;
  } {
    const messages = Array.from(this.messageHistory.values());
    const messagesByAgent = new Map<AgentId, number>();
    const questionsByAgent = new Map<AgentId, number>();

    for (const message of messages) {
      // Count sent messages
      const currentCount = messagesByAgent.get(message.from) || 0;
      messagesByAgent.set(message.from, currentCount + 1);

      // Count questions
      if (message.endpoint === 'question') {
        const currentQuestions = questionsByAgent.get(message.from) || 0;
        questionsByAgent.set(message.from, currentQuestions + 1);
      }
    }

    return {
      totalMessages: messages.length,
      messagesByAgent,
      questionsByAgent
    };
  }
}
