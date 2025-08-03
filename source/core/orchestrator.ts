/**
 * Core Orchestration Engine
 * Main orchestrator that routes requests, enforces permissions, and coordinates agents
 * 
 * Enhanced with comprehensive configuration management system supporting:
 * - .ai-code directory structure
 * - Two-level configuration (user + project)
 * - Encrypted credential storage
 * - Hot-reloading
 * - Security validation
 */

import { EventEmitter } from 'events';
import type { 
  AgentCapability,
  AgentId,
  OperationRequest,
  OperationResponse,
  FilePath,
  QuestionRequest,
  QuestionResponse,
  OrchestrationConfig,
  AgentTool,
  ModelSelectionCriteria,
  ModelSelectionResult,
  AccessPattern
} from './types.js';
import { OperationType, AIModel } from './types.js';
import { AgentRegistry } from './agent-registry.js';
import { PermissionSystem } from './permissions.js';
import { AgentCommunicationSystem } from './communication.js';
import { ModelSelector, createModelSelector, DEFAULT_MODEL_CONFIGS, DEFAULT_AUTO_MODE_CONFIG } from './model-selector.js';
import { ConfigurationManager, createConfigurationManager } from './configuration-manager.js';
import type { 
  CompleteConfig, 
  ConfigLoadOptions, 
  ConfigValidationResult,
  ConfigurationManagerEvents
} from './configuration-types.js';
import { SecurityAuditor, createSecurityAuditor, DEFAULT_SECURITY_PATTERNS } from './security-patterns.js';

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
  modelSelected: (criteria: ModelSelectionCriteria, result: ModelSelectionResult) => void;
  modelSelectionFailed: (criteria: ModelSelectionCriteria, error: string) => void;
  autoModeTriggered: (criteria: ModelSelectionCriteria) => void;
  // Configuration system events
  configLoaded: (config: CompleteConfig) => void;
  configReloaded: (config: CompleteConfig) => void;
  configValidated: (result: ConfigValidationResult) => void;
  configError: (error: Error) => void;
  credentialsUpdated: (provider: string) => void;
  securityAlert: (agentId: AgentId, violation: string) => void;
}

export class CoreOrchestrator extends EventEmitter {
  private agentRegistry: AgentRegistry;
  private permissionSystem: PermissionSystem;
  private communicationSystem: AgentCommunicationSystem;
  private modelSelector: ModelSelector;
  private configurationManager: ConfigurationManager;
  private securityAuditor: SecurityAuditor;
  private requestHandlers: Map<AgentId, RequestHandler> = new Map();
  private config: CompleteConfig | OrchestrationConfig;
  private requestHistory: Map<string, OperationRequest> = new Map();
  private responseHistory: Map<string, OperationResponse> = new Map();
  private configInitialized = false;

  constructor(config?: Partial<OrchestrationConfig>, baseDir?: string) {
    super();

    // Initialize default configuration (will be replaced when config system loads)
    this.config = {
      agents: [],
      defaultPermissions: {
        requireExplicitToolGrants: true
      },
      accessPatterns: {
        enabled: true,
        enableCaching: true,
        maxCacheSize: 1000,
        ...config?.accessPatterns
      },
      logging: {
        level: 'info',
        logCommunications: true,
        logModelSelection: config?.logging?.logModelSelection ?? true,
        logAccessPatterns: config?.logging?.logAccessPatterns ?? false
      },
      // Default model selection configuration
      modelSelection: {
        availableModels: DEFAULT_MODEL_CONFIGS,
        autoMode: DEFAULT_AUTO_MODE_CONFIG,
        defaultModel: AIModel.CLAUDE_3_5_SONNET,
        selectionStrategy: 'balanced',
        customWeights: {
          cost: 0.3,
          speed: 0.2,
          quality: 0.3,
          accuracy: 0.2
        }
      },
      ...config
    };

    // Initialize configuration manager
    this.configurationManager = createConfigurationManager(baseDir, {
      hotReloadConfig: { enabled: false } // Disabled by default, can be enabled with initializeFromConfigFiles
    });
    
    // Initialize security auditor
    this.securityAuditor = createSecurityAuditor();

    // Initialize core systems with access patterns config
    this.agentRegistry = new AgentRegistry(this.config.accessPatterns);
    this.permissionSystem = new PermissionSystem(this.agentRegistry);
    this.communicationSystem = new AgentCommunicationSystem(this.agentRegistry);
    
    // Initialize model selector
    this.modelSelector = createModelSelector(
      this.config.modelSelection?.availableModels,
      this.config.modelSelection?.autoMode
    );

    // Register initial agents from config
    for (const agent of this.config.agents) {
      this.registerAgent(agent);
    }

    this.setupEventHandlers();
    this.log('info', `Core orchestrator initialized with ${this.config.modelSelection?.availableModels.length || 0} available models`);
  }

  /**
   * Register a new agent with the system
   */
  registerAgent(agent: AgentCapability, handler?: RequestHandler): void {
    try {
      // Validate that agent has tools array populated
      if (!agent.tools || agent.tools.length === 0) {
        throw new Error(`Agent ${agent.id} must have tools array populated`);
      }
      
      this.agentRegistry.registerAgent(agent);
      
      if (handler) {
        this.requestHandlers.set(agent.id, handler);
      }

      this.emit('agentRegistered', agent);
      const toolNames = agent.tools.map(tool => tool.name || tool.id).join(', ');
      this.log('info', `Agent registered: ${agent.id} (${agent.name}) with tools: [${toolNames}]`);
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
   * Initialize orchestrator from .ai-code configuration files
   */
  async initializeFromConfigFiles(options: ConfigLoadOptions = {}): Promise<CompleteConfig> {
    try {
      this.log('info', 'Initializing orchestrator from .ai-code configuration files...');
      
      // Load configuration from files
      const config = await this.configurationManager.initialize(options);
      
      // Apply the loaded configuration
      await this.applyConfiguration(config);
      
      this.configInitialized = true;
      this.emit('configLoaded', config);
      
      this.log('info', `Configuration loaded successfully. ${config.agents?.length || 0} agents configured.`);
      return config;
    } catch (error) {
      this.emit('configError', error as Error);
      throw new Error(`Failed to initialize from config files: ${(error as Error).message}`);
    }
  }

  /**
   * Initialize credentials with master password
   * Will automatically initialize configuration if not already done
   */
  async initializeCredentials(masterPassword: string): Promise<void> {
    try {
      // If configuration is not initialized, initialize it first
      if (!this.configInitialized) {
        this.log('info', 'Configuration not initialized, initializing with defaults...');
        try {
          await this.initializeFromConfigFiles({ 
            validateOnLoad: false,
            enableHotReload: false 
          });
        } catch (configError) {
          // If config initialization fails, continue with minimal config for credentials
          this.log('warn', 'Config initialization failed, using minimal config for credentials');
          this.configInitialized = true; // Allow credentials to be initialized anyway
        }
      }
      
      await this.configurationManager.initializeCredentials(masterPassword);
      this.emit('credentialsUpdated', 'system');
      this.log('info', 'Credentials initialized successfully');
    } catch (error) {
      this.emit('configError', error as Error);
      throw new Error(`Failed to initialize credentials: ${(error as Error).message}`);
    }
  }

  /**
   * Initialize credentials with minimal configuration (for Settings UI)
   * This creates the necessary directory structure and initializes credential storage
   */
  async initializeCredentialsForSettings(masterPassword: string): Promise<void> {
    try {
      // Ensure configuration manager is set up with minimal config
      if (!this.configInitialized) {
        // Create the credential manager with default config if needed
        if (!this.configurationManager.getCurrentConfig()?.security?.credentials) {
          this.log('info', 'Setting up minimal configuration for credential storage...');
          
          // Create minimal security config with default settings  
          const minimalConfig = {
            ...this.config,
            security: {
              credentials: {
                encryption: {
                  algorithm: 'aes-256-gcm' as const,
                  keyDerivation: 'scrypt' as const,
                  iterations: 100000
                },
                providers: {},
                rotation: {
                  enabled: false,
                  interval: 24 * 7, // Weekly
                  backupCount: 3
                }
              },
              audit: {
                enabled: true,
                logLevel: 'denied' as const,
                retentionPeriod: 90,
                alertThresholds: {
                  deniedRequestsPerHour: 100,
                  criticalEventsPerDay: 10
                }
              }
            }
          };
          
          await this.applyConfiguration(minimalConfig as any);
        }
        this.configInitialized = true;
      }
      
      await this.configurationManager.initializeCredentials(masterPassword);
      this.emit('credentialsUpdated', 'system');
      this.log('info', 'Credentials initialized successfully for Settings');
    } catch (error) {
      this.emit('configError', error as Error);
      throw new Error(`Failed to initialize credentials for Settings: ${(error as Error).message}`);
    }
  }

  /**
   * Get credential for a provider
   */
  async getCredential(provider: string): Promise<string> {
    return await this.configurationManager.getCredential(provider);
  }

  /**
   * Store a credential
   */
  async storeCredential(provider: string, credential: string): Promise<void> {
    await this.configurationManager.storeCredential(provider, credential);
    this.emit('credentialsUpdated', provider);
  }

  /**
   * Update configuration and reload
   */
  async updateConfiguration(
    configType: 'orchestration' | 'user' | 'models' | 'security',
    updates: any
  ): Promise<void> {
    await this.configurationManager.updateConfiguration(configType, updates);
    
    // Configuration will be automatically reloaded through event handlers
    this.log('info', `${configType} configuration updated`);
  }

  /**
   * Add a new agent configuration
   */
  async addAgentConfiguration(agent: AgentCapability): Promise<void> {
    await this.configurationManager.addAgentConfiguration(agent);
    // Agent will be automatically registered through event handlers
  }

  /**
   * Validate current configuration
   */
  async validateConfiguration(): Promise<ConfigValidationResult> {
    const currentConfig = this.configurationManager.getCurrentConfig();
    if (!currentConfig) {
      throw new Error('No configuration loaded');
    }
    
    return await this.configurationManager.validateConfiguration(currentConfig);
  }

  /**
   * Get configuration statistics
   */
  getConfigurationStats(): any {
    return this.configurationManager.getConfigurationStats();
  }

  /**
   * Enable hot reloading of configuration files
   */
  async enableHotReload(): Promise<void> {
    await this.configurationManager.enableHotReload();
    this.log('info', 'Hot reload enabled for configuration files');
  }

  /**
   * Disable hot reloading
   */
  async disableHotReload(): Promise<void> {
    await this.configurationManager.disableHotReload();
    this.log('info', 'Hot reload disabled');
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
      const targetAgent = await this.routeRequest(request);
      
      if (!targetAgent) {
        throw new Error(`No agent found to handle request: ${request.type} for ${request.filePath || 'system'}`);
      }

      this.emit('requestRouted', request, targetAgent.id);

      // Check permissions (use async version if access patterns are enabled)
      const permissionResult = this.config.accessPatterns?.enabled
        ? await this.permissionSystem.checkPermissionAsync(
            targetAgent.id,
            request.type,
            request.filePath
          )
        : this.permissionSystem.checkPermission(
            targetAgent.id,
            request.type,
            request.filePath
          );

      // Log access pattern evaluation if enabled
      if (this.config.logging.logAccessPatterns && this.config.accessPatterns?.enabled && request.filePath) {
        this.log('debug', `Access pattern evaluation for ${targetAgent.id}:${request.type}:${request.filePath} -> ${permissionResult.allowed ? 'ALLOWED' : 'DENIED'} (${permissionResult.reason})`);
      }

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

      // Perform model selection for the operation
      let modelSelection: ModelSelectionResult | undefined;
      if (this.config.modelSelection?.autoMode.enabled) {
        try {
          modelSelection = this.selectModelForOperation(
            request.type,
            targetAgent.id,
            {
              contextLength: this.estimateContextLength(request),
              complexity: this.estimateOperationComplexity(request),
              priority: request.payload?.priority || 5
            }
          );
          
          // Emit model selection events
          this.emit('modelSelected', {
            operationType: request.type,
            agentId: targetAgent.id,
            contextLength: this.estimateContextLength(request),
            complexity: this.estimateOperationComplexity(request)
          }, modelSelection);
          
        } catch (modelError) {
          this.log('warn', `Model selection failed: ${(modelError as Error).message}`);
          this.emit('modelSelectionFailed', {
            operationType: request.type,
            agentId: targetAgent.id
          }, (modelError as Error).message);
        }
      }

      // Execute the request
      const response = await this.executeAgentRequest(targetAgent.id, request, modelSelection);
      
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
   * Select the best model for an operation
   */
  selectModelForOperation(
    operationType: OperationType,
    agentId?: AgentId,
    options?: {
      complexity?: number;
      contextLength?: number;
      priority?: number;
      maxCost?: number;
      requiredCapabilities?: Partial<ModelSelectionCriteria['requiredCapabilities']>;
    }
  ): ModelSelectionResult {
    if (!this.config.modelSelection) {
      throw new Error('Model selection not configured');
    }

    const criteria: ModelSelectionCriteria = {
      operationType,
      agentId,
      complexity: options?.complexity,
      contextLength: options?.contextLength,
      priority: options?.priority,
      maxCost: options?.maxCost,
      requiredCapabilities: options?.requiredCapabilities
    };

    const result = this.modelSelector.selectModel(criteria);
    
    // Log model selection if enabled
    if (this.config.logging.logModelSelection) {
      this.log('info', `Model selected for ${operationType}: ${result.selectedModel} (confidence: ${result.confidence.toFixed(2)}, reason: ${result.reason})`);
    }

    return result;
  }

  /**
   * Get the current model selection configuration
   */
  getModelSelectionConfig() {
    return {
      availableModels: this.modelSelector.getAllModelConfigs(),
      autoModeConfig: this.modelSelector.getAutoModeConfig(),
      selectionStats: this.modelSelector.getSelectionStats(),
      selectionHistory: this.modelSelector.getSelectionHistory(10)
    };
  }

  /**
   * Update model selection configuration
   */
  updateModelSelectionConfig(updates: {
    autoModeConfig?: Partial<typeof DEFAULT_AUTO_MODE_CONFIG>;
    modelConfigs?: typeof DEFAULT_MODEL_CONFIGS;
    defaultModel?: AIModel;
    selectionStrategy?: 'cost-optimized' | 'performance-optimized' | 'balanced' | 'custom';
  }): void {
    if (updates.autoModeConfig) {
      this.modelSelector.updateAutoModeConfig(updates.autoModeConfig);
    }

    if (updates.modelConfigs) {
      for (const config of updates.modelConfigs) {
        this.modelSelector.updateModelConfig(config);
      }
    }

    if (updates.defaultModel && this.config.modelSelection) {
      this.config.modelSelection.defaultModel = updates.defaultModel;
    }

    if (updates.selectionStrategy && this.config.modelSelection) {
      this.config.modelSelection.selectionStrategy = updates.selectionStrategy;
    }

    this.log('info', 'Model selection configuration updated');
  }

  /**
   * Get agents that can handle a specific file path
   */
  async getAgentsForPath(filePath: FilePath): Promise<AgentCapability[]> {
    const responsible = await this.agentRegistry.findResponsibleAgent(filePath);
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
    totalModernAgents: number;
    totalRequests: number;
    totalResponses: number;
    communicationStats: ReturnType<AgentCommunicationSystem['getStats']>;
    modelSelectionStats: ReturnType<ModelSelector['getSelectionStats']>;
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
      totalModernAgents: agents.length, // All agents are now modern tool-based agents
      totalRequests: this.requestHistory.size,
      totalResponses: this.responseHistory.size,
      communicationStats: this.communicationSystem.getStats(),
      modelSelectionStats: this.modelSelector.getSelectionStats(),
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
    this.modelSelector.clearSelectionHistory();
    this.log('info', 'All history cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OrchestrationConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update access patterns configuration if it changed
    if (config.accessPatterns) {
      this.agentRegistry.updateAccessPatternsConfig(config.accessPatterns);
    }
    
    this.log('info', 'Configuration updated');
  }

  /**
   * Add a global access pattern
   */
  addGlobalAccessPattern(pattern: AccessPattern): void {
    this.agentRegistry.addGlobalPattern(pattern);
    this.log('info', 'Global access pattern added');
  }

  /**
   * Remove a global access pattern
   */
  removeGlobalAccessPattern(patternId: string): boolean {
    const removed = this.agentRegistry.removeGlobalPattern(patternId);
    if (removed) {
      this.log('info', `Global access pattern removed: ${patternId}`);
    }
    return removed;
  }

  /**
   * Get access pattern statistics
   */
  getAccessPatternStats() {
    return this.permissionSystem.getAccessPatternStats();
  }

  /**
   * Test access patterns for debugging
   */
  async testAccessPattern(
    agentId: AgentId,
    filePath: FilePath,
    operation: OperationType
  ) {
    return await this.permissionSystem.testAccessPattern(agentId, filePath, operation);
  }

  /**
   * Route a request to the appropriate agent
   */
  private async routeRequest(request: OperationRequest): Promise<AgentCapability | undefined> {
    // For file operations, find responsible agent by file path
    if (request.filePath) {
      const responsible = await this.agentRegistry.findResponsibleAgent(request.filePath);
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
    request: OperationRequest,
    modelSelection?: ModelSelectionResult
  ): Promise<OperationResponse> {
    const handler = this.requestHandlers.get(agentId);
    
    if (!handler) {
      throw new Error(`No request handler registered for agent: ${agentId}`);
    }

    try {
      // Augment request with model selection if available
      const enhancedRequest = {
        ...request,
        payload: {
          ...request.payload,
          modelSelection: modelSelection
        }
      };

      const response = await handler(enhancedRequest);
      
      // Ensure response has required fields and include model info
      return {
        ...response,
        handledBy: agentId,
        requestId: request.requestId,
        metadata: {
          ...response.metadata,
          selectedModel: modelSelection?.selectedModel,
          modelSelectionConfidence: modelSelection?.confidence,
          estimatedCost: modelSelection?.estimatedCost
        }
      };
    } catch (error) {
      throw new Error(`Agent ${agentId} failed to handle request: ${(error as Error).message}`);
    }
  }

  /**
   * Estimate context length needed for an operation
   */
  private estimateContextLength(request: OperationRequest): number {
    let baseLength = 2000; // Base context for system prompts
    
    // Add payload content length
    if (request.payload) {
      const payloadStr = JSON.stringify(request.payload);
      baseLength += payloadStr.length * 1.2; // Account for tokenization
    }
    
    // Add file path context if present
    if (request.filePath) {
      baseLength += request.filePath.length;
    }
    
    // Operation-specific adjustments
    switch (request.type) {
      case OperationType.READ_FILE:
        baseLength += 5000; // Typical file size estimate
        break;
      case OperationType.WRITE_FILE:
      case OperationType.EDIT_FILE:
        baseLength += 10000; // Files plus modification context
        break;
      case OperationType.QUESTION:
        baseLength += 15000; // Questions may need broader context
        break;
      case OperationType.VALIDATE:
      case OperationType.TRANSFORM:
        baseLength += 20000; // Complex operations need more context
        break;
      default:
        baseLength += 3000;
    }
    
    return Math.min(baseLength, 200000); // Cap at reasonable maximum
  }

  /**
   * Estimate operation complexity (1-10 scale)
   */
  private estimateOperationComplexity(request: OperationRequest): number {
    let baseComplexity = 5;
    
    // Base complexity by operation type
    switch (request.type) {
      case OperationType.READ_FILE:
      case OperationType.DELETE_FILE:
      case OperationType.CREATE_DIRECTORY:
        baseComplexity = 2;
        break;
      case OperationType.WRITE_FILE:
        baseComplexity = 4;
        break;
      case OperationType.EDIT_FILE:
        baseComplexity = 6;
        break;
      case OperationType.QUESTION:
        baseComplexity = 7;
        break;
      case OperationType.VALIDATE:
        baseComplexity = 8;
        break;
      case OperationType.TRANSFORM:
        baseComplexity = 9;
        break;
    }
    
    // Adjust based on payload complexity
    if (request.payload) {
      const payloadStr = JSON.stringify(request.payload);
      if (payloadStr.length > 10000) {
        baseComplexity += 2;
      } else if (payloadStr.length > 5000) {
        baseComplexity += 1;
      }
      
      // Check for complex patterns in payload
      if (payloadStr.includes('regex') || payloadStr.includes('pattern')) {
        baseComplexity += 1;
      }
      if (payloadStr.includes('transform') || payloadStr.includes('convert')) {
        baseComplexity += 1;
      }
    }
    
    return Math.min(10, Math.max(1, baseComplexity));
  }

  /**
   * Apply loaded configuration to all systems
   */
  private async applyConfiguration(config: CompleteConfig): Promise<void> {
    this.log('info', 'Applying configuration to orchestrator systems...');
    
    // Update internal config
    this.config = config;
    
    // Reinitialize core systems with new configuration
    this.agentRegistry = new AgentRegistry(config.accessPatterns);
    this.permissionSystem = new PermissionSystem(this.agentRegistry);
    this.communicationSystem = new AgentCommunicationSystem(this.agentRegistry);
    
    // Update model selector
    if (config.modelSelection) {
      this.modelSelector = createModelSelector(
        config.modelSelection.availableModels,
        config.modelSelection.autoMode
      );
    }
    
    // Apply security patterns if available
    if (config.security?.globalSecurityPatterns) {
      for (const pattern of config.security.globalSecurityPatterns) {
        this.agentRegistry.addGlobalPattern(pattern);
      }
    }
    
    // Register agents from configuration
    const existingAgents = new Set(Array.from(this.requestHandlers.keys()));
    
    // Unregister agents that are no longer in config
    for (const agentId of existingAgents) {
      if (!config.agents?.find(agent => agent.id === agentId)) {
        this.unregisterAgent(agentId);
      }
    }
    
    // Register new agents from config
    if (config.agents) {
      for (const agent of config.agents) {
        if (!existingAgents.has(agent.id)) {
          try {
            this.registerAgent(agent);
          } catch (error) {
            this.log('warn', `Failed to register agent ${agent.id}:`, error);
          }
        }
      }
    }
    
    // Re-setup event handlers with new configuration
    this.removeAllListeners();
    this.setupEventHandlers();
    
    this.log('info', `Configuration applied. ${config.agents?.length || 0} agents configured.`);
  }

  /**
   * Setup event handlers for communication and model selection systems
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

    // Setup model selector event handlers
    this.modelSelector.on('modelSelected', (criteria, result) => {
      this.emit('modelSelected', criteria, result);
      if (this.config.logging.logModelSelection) {
        this.log('debug', `Model selected: ${result.selectedModel} for ${criteria.operationType} (confidence: ${result.confidence.toFixed(2)})`);
      }
    });

    this.modelSelector.on('modelSelectionFailed', (criteria, error) => {
      this.emit('modelSelectionFailed', criteria, error);
      this.log('warn', `Model selection failed for ${criteria.operationType}: ${error}`);
    });

    this.modelSelector.on('autoModeTriggered', (criteria) => {
      this.emit('autoModeTriggered', criteria);
      if (this.config.logging.logModelSelection) {
        this.log('debug', `Auto mode triggered for ${criteria.operationType}`);
      }
    });

    this.modelSelector.on('configurationUpdated', (updates) => {
      if (this.config.logging.logModelSelection) {
        this.log('info', `Model selector configuration updated`);
      }
    });

    // Setup configuration manager event handlers
    this.configurationManager.on('configLoaded', (config) => {
      this.emit('configLoaded', config);
      this.log('info', 'Configuration loaded successfully');
    });

    this.configurationManager.on('configReloaded', async (config) => {
      try {
        await this.applyConfiguration(config);
        this.emit('configReloaded', config);
        this.log('info', 'Configuration reloaded and applied successfully');
      } catch (error) {
        this.emit('configError', error as Error);
        this.log('error', 'Failed to apply reloaded configuration:', error);
      }
    });

    this.configurationManager.on('configValidated', (result) => {
      this.emit('configValidated', result);
      if (!result.valid) {
        this.log('warn', `Configuration validation failed: ${result.errors.join(', ')}`);
      }
    });

    this.configurationManager.on('configError', (error) => {
      this.emit('configError', error);
      // Don't log "No credential found" errors as they are normal when providers don't have credentials yet
      if (!error.message.includes('No credential found for provider')) {
        this.log('error', 'Configuration system error:', error);
      }
    });

    this.configurationManager.on('agentConfigLoaded', (agent) => {
      this.log('info', `Agent configuration loaded: ${agent.id} (${agent.name})`);
      try {
        this.registerAgent(agent);
      } catch (error) {
        this.log('warn', `Failed to register agent ${agent.id}:`, error);
      }
    });

    this.configurationManager.on('credentialsUpdated', (provider) => {
      this.emit('credentialsUpdated', provider);
      this.log('info', `Credentials updated for provider: ${provider}`);
    });

    this.configurationManager.on('securityAlert', (alert) => {
      this.securityAuditor.logSecurityEvent(
        alert.agentId,
        alert.operation,
        alert.resource,
        alert.allowed,
        alert.reason,
        alert.securityLevel
      );
      
      if (!alert.allowed) {
        this.emit('securityAlert', alert.agentId, alert.reason || 'Security violation');
        this.log('warn', `Security alert: ${alert.agentId} - ${alert.reason}`);
      }
    });
  }

  /**
   * Get security audit report
   */
  getSecurityAuditReport(timeRange?: { start: Date; end: Date }): any {
    return this.securityAuditor.generateSecurityReport(timeRange);
  }

  /**
   * Get recent security events
   */
  getRecentSecurityEvents(limit: number = 100): any[] {
    return this.securityAuditor.getRecentEvents(limit);
  }

  /**
   * Get denied access events
   */
  getDeniedAccessEvents(limit: number = 50): any[] {
    return this.securityAuditor.getDeniedEvents(limit);
  }

  /**
   * Get security events for a specific agent
   */
  getAgentSecurityEvents(agentId: AgentId, limit: number = 50): any[] {
    return this.securityAuditor.getEventsByAgent(agentId, limit);
  }

  /**
   * Create a new configuration-enabled orchestrator
   */
  static async createWithConfig(
    baseDir?: string,
    configOptions: ConfigLoadOptions = {},
    orchestratorConfig?: Partial<OrchestrationConfig>
  ): Promise<CoreOrchestrator> {
    const orchestrator = new CoreOrchestrator(orchestratorConfig, baseDir);
    await orchestrator.initializeFromConfigFiles(configOptions);
    return orchestrator;
  }

  /**
   * Clean up and destroy the orchestrator
   */
  async destroy(): Promise<void> {
    this.log('info', 'Shutting down orchestrator...');
    
    // Disable hot reload
    try {
      await this.disableHotReload();
    } catch (error) {
      this.log('warn', 'Error disabling hot reload:', error);
    }
    
    // Clean up configuration manager
    try {
      await this.configurationManager.destroy();
    } catch (error) {
      this.log('warn', 'Error destroying configuration manager:', error);
    }
    
    // Clear handlers and history
    this.requestHandlers.clear();
    this.requestHistory.clear();
    this.responseHistory.clear();
    
    // Remove all event listeners
    this.removeAllListeners();
    
    this.log('info', 'Orchestrator shutdown complete');
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