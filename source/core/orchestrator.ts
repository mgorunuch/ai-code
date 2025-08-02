/**
 * Core Orchestration Engine
 * Main orchestrator that routes requests, enforces permissions, and coordinates agents
 */

import { EventEmitter } from 'events';
import type { 
  AgentCapability,
  AgentId,
  OperationRequest,
  OperationResponse,
  OperationType,
  FilePath,
  QuestionRequest,
  QuestionResponse,
  OrchestrationConfig,
  AgentTool
} from './types.js';
import { normalizeAgentCapability, AgentTool as AgentToolEnum } from './types.js';
import { AgentRegistry } from './agent-registry.js';
import { PermissionSystem } from './permissions.js';
import { AgentCommunicationSystem } from './communication.js';

export interface RequestHandler {
  (request: OperationRequest): Promise<OperationResponse>;
}

export interface OrchestrationEvents {
  requestReceived: (request: OperationRequest) => void;
  requestRouted: (request: OperationRequest, targetAgent: AgentId) => void;
  requestCompleted: (response: OperationResponse) => void;
  requestFailed: (request: OperationRequest, error: Error) => void;
  permissionDenied: (request: OperationRequest, reason: string, requiredTool?: AgentTool) => void;
  agentRegistered: (agent: AgentCapability) => void;
  agentUnregistered: (agentId: AgentId) => void;
  toolAccessDenied: (agentId: AgentId, tool: AgentTool, context?: string) => void;
  toolAccessGranted: (agentId: AgentId, tool: AgentTool, context?: string) => void;
}

export class CoreOrchestrator extends EventEmitter {
  private agentRegistry: AgentRegistry;
  private permissionSystem: PermissionSystem;
  private communicationSystem: AgentCommunicationSystem;
  private requestHandlers: Map<AgentId, RequestHandler> = new Map();
  private config: OrchestrationConfig;
  private requestHistory: Map<string, OperationRequest> = new Map();
  private responseHistory: Map<string, OperationResponse> = new Map();

  constructor(config?: Partial<OrchestrationConfig>) {
    super();

    // Initialize default configuration with backward compatibility
    this.config = {
      agents: [],
      defaultPermissions: {
        defaultTools: [AgentToolEnum.READ_LOCAL, AgentToolEnum.INTER_AGENT_COMMUNICATION],
        requireExplicitToolGrants: true,
        // Legacy support
        allowGlobalRead: config?.defaultPermissions?.allowGlobalRead ?? false,
        requireExplicitWritePermission: config?.defaultPermissions?.requireExplicitWritePermission ?? true
      },
      logging: {
        level: 'info',
        logCommunications: true
      },
      ...config
    };

    // Initialize core systems
    this.agentRegistry = new AgentRegistry();
    this.permissionSystem = new PermissionSystem(this.agentRegistry);
    this.communicationSystem = new AgentCommunicationSystem(this.agentRegistry);

    // Register initial agents from config
    for (const agent of this.config.agents) {
      this.registerAgent(agent);
    }

    this.setupEventHandlers();
    this.log('info', 'Core orchestrator initialized');
  }

  /**
   * Register a new agent with the system
   */
  registerAgent(agent: AgentCapability, handler?: RequestHandler): void {
    try {
      // Normalize agent to ensure tools array is populated
      const normalizedAgent = normalizeAgentCapability(agent);
      
      this.agentRegistry.registerAgent(normalizedAgent);
      
      if (handler) {
        this.requestHandlers.set(normalizedAgent.id, handler);
      }

      this.emit('agentRegistered', normalizedAgent);
      this.log('info', `Agent registered: ${normalizedAgent.id} (${normalizedAgent.name}) with tools: [${normalizedAgent.tools.join(', ')}]`);
    } catch (error) {
      this.log('error', `Failed to register agent ${agent.id}:`, error);
      throw error;
    }
  }

  /**
   * Unregister an agent from the system
   */
  unregisterAgent(agentId: AgentId): boolean {
    try {
      const success = this.agentRegistry.unregisterAgent(agentId);
      
      if (success) {
        this.requestHandlers.delete(agentId);
        this.emit('agentUnregistered', agentId);
        this.log('info', `Agent unregistered: ${agentId}`);
      }

      return success;
    } catch (error) {
      this.log('error', `Failed to unregister agent ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Register a request handler for an agent
   */
  registerRequestHandler(agentId: AgentId, handler: RequestHandler): void {
    if (!this.agentRegistry.getAgent(agentId)) {
      throw new Error(`Cannot register handler for non-existent agent: ${agentId}`);
    }

    this.requestHandlers.set(agentId, handler);
    this.log('info', `Request handler registered for agent: ${agentId}`);
  }

  /**
   * Execute an operation request
   */
  async executeRequest(request: OperationRequest): Promise<OperationResponse> {
    const startTime = Date.now();

    try {
      // Store request in history
      this.requestHistory.set(request.requestId, request);
      this.emit('requestReceived', request);
      
      this.log('debug', `Processing request ${request.requestId} (${request.type})`);

      // Route the request to the appropriate agent
      const targetAgent = this.routeRequest(request);
      
      if (!targetAgent) {
        throw new Error(`No agent found to handle request: ${request.type} for ${request.filePath || 'system'}`);
      }

      this.emit('requestRouted', request, targetAgent.id);

      // Check permissions
      const permissionResult = this.permissionSystem.checkPermission(
        targetAgent.id,
        request.type,
        request.filePath
      );

      if (!permissionResult.allowed) {
        this.emit('permissionDenied', request, permissionResult.reason || 'Permission denied', permissionResult.requiredTool);
        
        // Emit tool-specific events
        if (permissionResult.requiredTool) {
          this.emit('toolAccessDenied', targetAgent.id, permissionResult.requiredTool, `Request: ${request.type} for ${request.filePath || 'system'}`);
        }
        
        throw new Error(`Permission denied: ${permissionResult.reason}`);
      } else {
        // Emit tool access granted event if applicable
        if (permissionResult.requiredTool) {
          this.emit('toolAccessGranted', targetAgent.id, permissionResult.requiredTool, `Request: ${request.type} for ${request.filePath || 'system'}`);
        }
      }

      // Execute the request
      const response = await this.executeAgentRequest(targetAgent.id, request);
      
      // Store response in history
      this.responseHistory.set(request.requestId, response);
      
      this.emit('requestCompleted', response);
      this.log('info', `Request ${request.requestId} completed by ${targetAgent.id} in ${Date.now() - startTime}ms`);

      return response;

    } catch (error) {
      this.emit('requestFailed', request, error as Error);
      this.log('error', `Request ${request.requestId} failed:`, error);
      
      // Return error response
      const errorResponse: OperationResponse = {
        success: false,
        error: (error as Error).message,
        handledBy: 'orchestrator',
        requestId: request.requestId
      };
      
      this.responseHistory.set(request.requestId, errorResponse);
      return errorResponse;
    }
  }

  /**
   * Ask a question to an agent or discover and ask multiple agents
   */
  async askQuestion(
    fromAgent: AgentId,
    question: QuestionRequest,
    targetAgent?: AgentId
  ): Promise<QuestionResponse | Map<AgentId, QuestionResponse | Error>> {
    try {
      if (targetAgent) {
        // Ask specific agent
        return await this.communicationSystem.askQuestion(fromAgent, targetAgent, question);
      } else {
        // Discover and ask multiple agents
        return await this.communicationSystem.broadcastQuestion(fromAgent, question, question.context);
      }
    } catch (error) {
      this.log('error', `Question failed from ${fromAgent}:`, error);
      throw error;
    }
  }

  /**
   * Get agents that can handle a specific file path
   */
  getAgentsForPath(filePath: FilePath): AgentCapability[] {
    const responsible = this.agentRegistry.findResponsibleAgent(filePath);
    return responsible ? [responsible] : [];
  }

  /**
   * Get all registered agents
   */
  getAgents(): AgentCapability[] {
    return this.agentRegistry.getAllAgents();
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: AgentId): AgentCapability | undefined {
    return this.agentRegistry.getAgent(agentId);
  }

  /**
   * Get orchestration statistics
   */
  getStats(): {
    totalAgents: number;
    totalRequests: number;
    totalResponses: number;
    communicationStats: ReturnType<AgentCommunicationSystem['getStats']>;
    agentStats: Map<AgentId, { requests: number; responses: number }>;
  } {
    const agents = this.agentRegistry.getAllAgents();
    const agentStats = new Map<AgentId, { requests: number; responses: number }>();

    // Calculate agent-specific stats
    for (const agent of agents) {
      const requests = Array.from(this.requestHistory.values())
        .filter(req => req.requestingAgent === agent.id).length;
      
      const responses = Array.from(this.responseHistory.values())
        .filter(res => res.handledBy === agent.id).length;

      agentStats.set(agent.id, { requests, responses });
    }

    return {
      totalAgents: agents.length,
      totalRequests: this.requestHistory.size,
      totalResponses: this.responseHistory.size,
      communicationStats: this.communicationSystem.getStats(),
      agentStats
    };
  }

  /**
   * Get request/response history
   */
  getHistory(requestId?: string): {
    requests: OperationRequest[];
    responses: OperationResponse[];
  } {
    if (requestId) {
      const request = this.requestHistory.get(requestId);
      const response = this.responseHistory.get(requestId);
      
      return {
        requests: request ? [request] : [],
        responses: response ? [response] : []
      };
    }

    return {
      requests: Array.from(this.requestHistory.values()),
      responses: Array.from(this.responseHistory.values())
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.requestHistory.clear();
    this.responseHistory.clear();
    this.communicationSystem.clearMessageHistory();
    this.permissionSystem.clearAuditLog();
    this.log('info', 'All history cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OrchestrationConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('info', 'Configuration updated');
  }

  /**
   * Route a request to the appropriate agent
   */
  private routeRequest(request: OperationRequest): AgentCapability | undefined {
    // For file operations, find responsible agent by file path
    if (request.filePath) {
      const responsible = this.agentRegistry.findResponsibleAgent(request.filePath);
      if (responsible) {
        return responsible;
      }
    }

    // For non-file operations or when no responsible agent found,
    // find agents that can handle this operation type
    const agents = this.agentRegistry.getAllAgents();
    
    for (const agent of agents) {
      // Check if agent has appropriate endpoint for this operation
      const hasEndpoint = agent.endpoints.some(ep => {
        switch (request.type) {
          case OperationType.QUESTION:
            return ep.name === 'question';
          case OperationType.VALIDATE:
            return ep.name === 'validate';
          case OperationType.TRANSFORM:
            return ep.name === 'transform';
          default:
            return ep.name === 'handle' || ep.name === 'process';
        }
      });

      if (hasEndpoint) {
        return agent;
      }
    }

    return undefined;
  }

  /**
   * Execute request with a specific agent
   */
  private async executeAgentRequest(
    agentId: AgentId,
    request: OperationRequest
  ): Promise<OperationResponse> {
    const handler = this.requestHandlers.get(agentId);
    
    if (!handler) {
      throw new Error(`No request handler registered for agent: ${agentId}`);
    }

    try {
      const response = await handler(request);
      
      // Ensure response has required fields
      return {
        ...response,
        handledBy: agentId,
        requestId: request.requestId
      };
    } catch (error) {
      throw new Error(`Agent ${agentId} failed to handle request: ${(error as Error).message}`);
    }
  }

  /**
   * Setup event handlers for communication system
   */
  private setupEventHandlers(): void {
    if (this.config.logging.logCommunications) {
      this.communicationSystem.on('messageSent', (message) => {
        this.log('debug', `Message sent: ${message.from} -> ${message.to} (${message.endpoint})`);
      });

      this.communicationSystem.on('questionAsked', (from, to, question) => {
        this.log('debug', `Question asked by ${from} to ${to}: ${question.question}`);
      });

      this.communicationSystem.on('questionAnswered', (from, to, response) => {
        this.log('debug', `Question answered by ${to} for ${from} (confidence: ${response.confidence})`);
      });
    }
  }

  /**
   * Internal logging method
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logging.level];
    const messageLevel = levels[level];

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      console[level](`[${timestamp}] [ORCHESTRATOR] ${message}`, ...args);
    }
  }
}